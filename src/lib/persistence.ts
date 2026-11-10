/**
 * Cloud persistence for the tournament database.
 *
 * The hosting plan has no persistent disk: every restart or deploy starts again
 * from the database file committed in the repository. To keep results entered
 * on the live site, this module:
 *
 *   1. saves a JSON snapshot of the tournament tables to a dedicated branch of
 *      the GitHub repository shortly after every change, and
 *   2. restores the newest snapshot when the server starts.
 *
 * It is only active when GITHUB_BACKUP_TOKEN is set. Every failure is caught
 * and reported: a backup problem must never take the site down.
 */
import crypto from 'crypto';
import db, { initDatabase, applyRosterCorrections } from './db';

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_TABLES = [
  'teams',
  'players',
  'matches',
  'match_events',
  'tournament_settings',
  'tournament_rules',
  'tournament_awards',
  'activity_logs',
] as const;
type SnapshotTable = (typeof SNAPSHOT_TABLES)[number];
type Tables = Record<SnapshotTable, Record<string, unknown>[]>;

interface Snapshot {
  version: number;
  saved_at: string;
  tables: Tables;
}

export interface PersistenceStatus {
  enabled: boolean;
  target: string | null;
  started: boolean;
  restored_from: string | null;
  last_backup_at: string | null;
  last_error: string | null;
  pending: boolean;
}

interface State {
  started: boolean;
  timer: ReturnType<typeof setInterval> | null;
  debounce: ReturnType<typeof setTimeout> | null;
  uploading: boolean;
  remoteSha: string | null;
  lastHash: string | null;
  restoredFrom: string | null;
  lastBackupAt: string | null;
  lastError: string | null;
}

// One shared state per process, even if this module is bundled more than once.
const g = globalThis as unknown as { __enscsPersistence?: State; __enscsBackupSoon?: () => void };
const state: State =
  g.__enscsPersistence ||
  (g.__enscsPersistence = {
    started: false,
    timer: null,
    debounce: null,
    uploading: false,
    remoteSha: null,
    lastHash: null,
    restoredFrom: null,
    lastBackupAt: null,
    lastError: null,
  });

const CHECK_INTERVAL_MS = 30_000;
const DEBOUNCE_MS = 2_500;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_LOG_ROWS = 300;

function config() {
  const token = process.env.GITHUB_BACKUP_TOKEN || '';
  return {
    token,
    repo: process.env.GITHUB_BACKUP_REPO || 'MD1007/enscs-football',
    branch: process.env.GITHUB_BACKUP_BRANCH || 'data-backup',
    path: process.env.GITHUB_BACKUP_PATH || 'snapshot.json',
    api: (process.env.GITHUB_BACKUP_API || 'https://api.github.com').replace(/\/+$/, ''),
    enabled: Boolean(token),
  };
}

function log(message: string) {
  console.log(`[persistence] ${message}`);
}

function fail(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  state.lastError = `${context}: ${message}`;
  console.error(`[persistence] ${context}: ${message}`);
}

// ---------------------------------------------------------------- snapshot

function dumpTables(): Tables {
  const tables = {} as Tables;
  for (const table of SNAPSHOT_TABLES) {
    if (table === 'activity_logs') {
      tables[table] = (
        db.prepare(`SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?`).all(MAX_LOG_ROWS) as Record<string, unknown>[]
      ).reverse();
    } else {
      const order = table === 'tournament_settings' ? 'key' : table === 'tournament_awards' ? 'award_key' : 'id';
      tables[table] = db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all() as Record<string, unknown>[];
    }
  }
  return tables;
}

function hashTables(tables: Tables): string {
  return crypto.createHash('sha256').update(JSON.stringify(tables)).digest('hex');
}

function isValidSnapshot(value: any): value is Snapshot {
  return Boolean(
    value &&
      value.version === SNAPSHOT_VERSION &&
      typeof value.saved_at === 'string' &&
      value.tables &&
      Array.isArray(value.tables.teams) &&
      value.tables.teams.length > 0 &&
      Array.isArray(value.tables.players) &&
      Array.isArray(value.tables.matches) &&
      value.tables.matches.length > 0 &&
      Array.isArray(value.tables.match_events)
  );
}

function getMeta(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

function setMeta(key: string, value: string) {
  db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    value
  );
}

/** Replaces the tournament tables with the snapshot, atomically. */
function applySnapshot(snapshot: Snapshot) {
  const restore = db.transaction(() => {
    for (const table of SNAPSHOT_TABLES) {
      const rows = snapshot.tables[table];
      if (!Array.isArray(rows)) continue; // table missing from an older snapshot: keep what we have

      const known = (db.pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name);
      db.prepare(`DELETE FROM ${table}`).run();
      for (const row of rows) {
        const cols = known.filter((c) => c in row);
        if (cols.length === 0) continue;
        db.prepare(
          `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        ).run(cols.map((c) => row[c] as any));
      }
    }

    const violations = db.pragma('foreign_key_check') as unknown[];
    if (violations.length > 0) {
      throw new Error(`snapshot has ${violations.length} broken reference(s); restore cancelled`);
    }
    setMeta('snapshot_saved_at', snapshot.saved_at);
  });

  // Rows are replaced table by table, so reference checks run once at the end.
  db.pragma('foreign_keys = OFF');
  try {
    restore();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

// ------------------------------------------------------------------ GitHub

async function github(method: 'GET' | 'PUT', body?: unknown): Promise<Response> {
  const { token, repo, branch, path, api } = config();
  const url = `${api}/repos/${repo}/contents/${path}${method === 'GET' ? `?ref=${encodeURIComponent(branch)}` : ''}`;
  return fetch(url, {
    method,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'tournament-backup',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Returns the stored snapshot, or null when none has been saved yet. */
async function downloadSnapshot(): Promise<{ snapshot: Snapshot | null; sha: string | null }> {
  const res = await github('GET');
  if (res.status === 404) return { snapshot: null, sha: null };
  if (!res.ok) throw new Error(`GitHub answered ${res.status} when reading the snapshot`);

  const file = (await res.json()) as { sha: string; content?: string; encoding?: string; download_url?: string };
  let text: string;
  if (file.encoding === 'base64' && file.content) {
    text = Buffer.from(file.content, 'base64').toString('utf8');
  } else {
    // Files above 1 MB are not returned inline.
    const { token, repo, branch, path, api } = config();
    const raw = await fetch(`${api}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.raw+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'tournament-backup',
      },
    });
    if (!raw.ok) throw new Error(`GitHub answered ${raw.status} when downloading the snapshot`);
    text = await raw.text();
  }

  const parsed = JSON.parse(text);
  if (!isValidSnapshot(parsed)) throw new Error('stored snapshot is not valid; it was left untouched');
  return { snapshot: parsed, sha: file.sha };
}

async function uploadSnapshot(snapshot: Snapshot): Promise<void> {
  const { branch } = config();
  const content = Buffer.from(JSON.stringify(snapshot), 'utf8').toString('base64');

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await github('PUT', {
      message: `Tournament data snapshot ${snapshot.saved_at}`,
      content,
      branch,
      ...(state.remoteSha ? { sha: state.remoteSha } : {}),
    });

    if (res.ok) {
      const saved = (await res.json()) as { content?: { sha?: string } };
      state.remoteSha = saved.content?.sha || null;
      return;
    }

    if ((res.status === 409 || res.status === 422) && attempt === 0) {
      // Our file version is stale: fetch the current one and try once more.
      const current = await github('GET');
      state.remoteSha = current.ok ? ((await current.json()) as { sha: string }).sha : null;
      continue;
    }

    const detail = await res.text().catch(() => '');
    throw new Error(`GitHub answered ${res.status} when saving the snapshot ${detail.slice(0, 160)}`);
  }
}

// ------------------------------------------------------------------ public

/** Saves a snapshot if the data changed since the last successful save. */
export async function backupIfChanged(): Promise<boolean> {
  if (!config().enabled || !state.started || state.uploading) return false;

  state.uploading = true;
  try {
    const tables = dumpTables();
    const hash = hashTables(tables);
    if (hash === state.lastHash) return false;

    const snapshot: Snapshot = { version: SNAPSHOT_VERSION, saved_at: new Date().toISOString(), tables };
    await uploadSnapshot(snapshot);

    state.lastHash = hash;
    state.lastBackupAt = snapshot.saved_at;
    state.lastError = null;
    setMeta('snapshot_saved_at', snapshot.saved_at);
    log(`snapshot saved (${tables.matches.length} matches, ${tables.match_events.length} events)`);
    return true;
  } catch (err) {
    fail('backup failed, will retry', err);
    return false;
  } finally {
    state.uploading = false;
  }
}

/** Asks for a backup a moment from now (several quick changes become one save). */
export function scheduleBackup() {
  if (!config().enabled || !state.started) return;
  if (state.debounce) clearTimeout(state.debounce);
  state.debounce = setTimeout(() => {
    state.debounce = null;
    void backupIfChanged();
  }, DEBOUNCE_MS);
}

/** Runs once at server start: restore the newest snapshot, then keep saving. */
export async function startPersistence(): Promise<void> {
  if (state.started) return;
  const cfg = config();
  if (!cfg.enabled) {
    log('disabled (GITHUB_BACKUP_TOKEN is not set): data lives only on this instance');
    return;
  }

  try {
    initDatabase();
  } catch (err) {
    fail('database initialisation failed', err);
    return;
  }

  try {
    const { snapshot, sha } = await downloadSnapshot();
    state.remoteSha = sha;

    if (snapshot) {
      const localMarker = getMeta('snapshot_saved_at');
      if (!localMarker || snapshot.saved_at > localMarker) {
        applySnapshot(snapshot);
        applyRosterCorrections();
        state.restoredFrom = snapshot.saved_at;
        log(
          `restored snapshot from ${snapshot.saved_at} (${snapshot.tables.matches.length} matches, ${snapshot.tables.match_events.length} events)`
        );
      } else {
        log('local data is already up to date with the stored snapshot');
      }
      state.lastHash = hashTables(snapshot.tables);
      state.lastBackupAt = snapshot.saved_at;
    } else {
      log('no snapshot stored yet: the current data will be saved as the first one');
    }
    state.lastError = null;
  } catch (err) {
    // Never start saving over a snapshot we could not read: that could replace
    // good data with the repository's older copy.
    fail('could not load the stored snapshot; backups stay paused until the next restart', err);
    return;
  }

  state.started = true;
  g.__enscsBackupSoon = scheduleBackup;
  state.timer = setInterval(() => void backupIfChanged(), CHECK_INTERVAL_MS);
  if (typeof state.timer.unref === 'function') state.timer.unref();

  await backupIfChanged();
}

export function getPersistenceStatus(): PersistenceStatus {
  const cfg = config();
  return {
    enabled: cfg.enabled,
    target: cfg.enabled ? `${cfg.repo} @ ${cfg.branch}` : null,
    started: state.started,
    restored_from: state.restoredFrom,
    last_backup_at: state.lastBackupAt,
    last_error: state.lastError,
    pending: Boolean(state.debounce) || state.uploading,
  };
}
