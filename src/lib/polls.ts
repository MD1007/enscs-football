import crypto from 'crypto';
import db, { logActivity } from './db';
import { Match, Player, Team } from './types';
import { getMatchGuests } from './calculations';
import { recordHit } from './rateLimit';

function resolvePollSecret(): string {
  // JWT_SECRET is deliberately not used here: the value configured on the host was once
  // published in this repository, and vote hashes are stored in the public data snapshot.
  // With a known secret, visitor IP addresses could be recovered from those hashes.
  const configured = process.env.POLL_SECRET || '';
  if (configured) return configured;
  const privateMaterial = [process.env.ADMIN_PASSWORD, process.env.GITHUB_BACKUP_TOKEN].filter(Boolean).join('|');
  if (privateMaterial) {
    return crypto.createHmac('sha256', privateMaterial).update('enscs-fan-polls-v1').digest('hex');
  }
  return crypto.randomBytes(48).toString('hex');
}

const g = globalThis as unknown as { __enscsPollSecret?: string };
const POLL_SECRET = g.__enscsPollSecret || (g.__enscsPollSecret = resolvePollSecret());

export function hashVoterFp(ip: string, userAgent: string, fp: string): string {
  return crypto
    .createHash('sha256')
    .update(`${POLL_SECRET}:${ip}:${userAgent || 'unknown'}:${fp || 'unknown'}`)
    .digest('hex');
}

export function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(`${POLL_SECRET}:${ip}`)
    .digest('hex');
}

export interface PollOption {
  id: string;
  label: string;
  label_ar?: string | null;
  color?: string | null;
  team_id?: number;
  team_name?: string;
  is_captain?: boolean;
  is_goalkeeper?: boolean;
  is_joker?: boolean;
}

export interface PollState {
  open: boolean;
  closes_at: number | null;
  total: number;
  counts: Record<string, number> | null;
  my_choice: string | null;
  options: PollOption[];
}

export interface MatchPollsResponse {
  match_id: number;
  winner: PollState;
  motm: PollState;
}

/** Returns the configured duration (in minutes) for the fans' MVP vote. */
export function getMotmWindowMinutes(): number {
  try {
    const row = db.prepare('SELECT value FROM tournament_settings WHERE key = ?').get('fan_motm_window_minutes') as
      | { value: string }
      | undefined;
    if (row && row.value) {
      const parsed = parseInt(row.value, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return 60;
}

export function getPollsState(
  matchId: number,
  voterCid?: string | null,
  voterFp?: string | null
): MatchPollsResponse | null {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as
    | (Match & { guests_json?: string | null; shootout_json?: string | null })
    | undefined;

  if (!match) return null;

  const homeTeam = match.home_team_id
    ? (db.prepare('SELECT * FROM teams WHERE id = ?').get(match.home_team_id) as Team | undefined)
    : undefined;
  const awayTeam = match.away_team_id
    ? (db.prepare('SELECT * FROM teams WHERE id = ?').get(match.away_team_id) as Team | undefined)
    : undefined;

  // 1. WINNER POLL
  const winnerOpen = Boolean(
    match.status === 'upcoming' &&
      match.home_team_id &&
      match.away_team_id &&
      Number(match.home_team_id) > 0 &&
      Number(match.away_team_id) > 0
  );

  const winnerOptions: PollOption[] = [];
  if (match.home_team_id && match.away_team_id) {
    winnerOptions.push({
      id: 'home',
      label: homeTeam?.name || 'Home Team',
      label_ar: homeTeam?.name_ar || null,
      color: homeTeam?.color || '#10B981',
      team_id: homeTeam?.id,
    });
    if (match.stage === 'group') {
      winnerOptions.push({
        id: 'draw',
        label: 'Draw',
        label_ar: 'تعادل',
        color: '#64748B',
      });
    }
    winnerOptions.push({
      id: 'away',
      label: awayTeam?.name || 'Away Team',
      label_ar: awayTeam?.name_ar || null,
      color: awayTeam?.color || '#3B82F6',
      team_id: awayTeam?.id,
    });
  }

  // Check voter's existing choice for winner poll
  let winnerMyChoice: string | null = null;
  if (voterCid || voterFp) {
    const existing = db
      .prepare(
        `SELECT choice FROM fan_votes
         WHERE match_id = ? AND poll = 'winner' AND (voter_cid = ? OR voter_fp = ?)
         LIMIT 1`
      )
      .get(matchId, voterCid || '', voterFp || '') as { choice: string } | undefined;
    if (existing) winnerMyChoice = existing.choice;
  }

  // Tally winner votes
  const winnerTally = db
    .prepare(
      `SELECT choice, COUNT(*) as count FROM fan_votes
       WHERE match_id = ? AND poll = 'winner'
       GROUP BY choice`
    )
    .all(matchId) as { choice: string; count: number }[];

  let winnerTotal = 0;
  const winnerCounts: Record<string, number> = {};
  for (const row of winnerTally) {
    winnerCounts[row.choice] = row.count;
    winnerTotal += row.count;
  }

  // 2. MOTM POLL
  const windowMinutes = getMotmWindowMinutes();
  const windowMs = windowMinutes * 60 * 1000;
  const finishedAt = match.finished_at ? Number(match.finished_at) : null;
  const motmClosesAt = finishedAt ? finishedAt + windowMs : null;
  const motmOpen = Boolean(match.status === 'finished' && motmClosesAt && Date.now() < motmClosesAt);

  // Eligible MOTM players: both squads plus guests for this match
  const guestRecords = getMatchGuests(match as any);
  const guestPlayerIds = guestRecords.map((g) => g.player_id);

  let squadPlayers: Player[] = [];
  if (match.home_team_id && match.away_team_id) {
    squadPlayers = db
      .prepare('SELECT * FROM players WHERE team_id IN (?, ?) ORDER BY name ASC')
      .all(match.home_team_id, match.away_team_id) as Player[];
  }

  let guestPlayers: Player[] = [];
  if (guestPlayerIds.length > 0) {
    guestPlayers = db
      .prepare(`SELECT * FROM players WHERE id IN (${guestPlayerIds.map(() => '?').join(',')})`)
      .all(...guestPlayerIds) as Player[];
  }

  const motmOptions: PollOption[] = [];
  const addedPlayerIds = new Set<number>();

  for (const p of squadPlayers) {
    addedPlayerIds.add(p.id);
    const team = p.team_id === homeTeam?.id ? homeTeam : awayTeam;
    motmOptions.push({
      id: String(p.id),
      label: p.name,
      label_ar: p.name_ar,
      team_id: p.team_id,
      team_name: team?.name || undefined,
      color: team?.color || undefined,
      is_captain: Boolean(p.is_captain),
      is_goalkeeper: Boolean(p.is_goalkeeper),
      is_joker: Boolean(p.is_joker),
    });
  }

  for (const gp of guestPlayers) {
    if (!addedPlayerIds.has(gp.id)) {
      addedPlayerIds.add(gp.id);
      const guestAssoc = guestRecords.find((g) => g.player_id === gp.id);
      const team = guestAssoc?.team_id === homeTeam?.id ? homeTeam : awayTeam;
      motmOptions.push({
        id: String(gp.id),
        label: gp.name,
        label_ar: gp.name_ar,
        team_id: guestAssoc?.team_id || gp.team_id,
        team_name: team?.name || undefined,
        color: team?.color || undefined,
        is_captain: Boolean(gp.is_captain),
        is_goalkeeper: Boolean(gp.is_goalkeeper),
        is_joker: true,
      });
    }
  }

  // Check voter's existing choice for motm poll
  let motmMyChoice: string | null = null;
  if (voterCid || voterFp) {
    const existing = db
      .prepare(
        `SELECT choice FROM fan_votes
         WHERE match_id = ? AND poll = 'motm' AND (voter_cid = ? OR voter_fp = ?)
         LIMIT 1`
      )
      .get(matchId, voterCid || '', voterFp || '') as { choice: string } | undefined;
    if (existing) motmMyChoice = existing.choice;
  }

  // Tally motm votes
  const motmTally = db
    .prepare(
      `SELECT choice, COUNT(*) as count FROM fan_votes
       WHERE match_id = ? AND poll = 'motm'
       GROUP BY choice`
    )
    .all(matchId) as { choice: string; count: number }[];

  let motmTotal = 0;
  const motmCounts: Record<string, number> = {};
  for (const row of motmTally) {
    motmCounts[row.choice] = row.count;
    motmTotal += row.count;
  }

  return {
    match_id: matchId,
    winner: {
      open: winnerOpen,
      closes_at: null,
      total: winnerTotal,
      counts: winnerMyChoice !== null || !winnerOpen ? winnerCounts : null,
      my_choice: winnerMyChoice,
      options: winnerOptions,
    },
    motm: {
      open: motmOpen,
      closes_at: motmClosesAt,
      total: motmTotal,
      counts: motmMyChoice !== null || !motmOpen ? motmCounts : null,
      my_choice: motmMyChoice,
      options: motmOptions,
    },
  };
}

export interface RecordVoteParams {
  matchId: number;
  poll: 'winner' | 'motm';
  choice: string;
  voterCid: string;
  clientFp: string;
  clientIp: string;
  userAgent: string;
}

export function recordVote(params: RecordVoteParams): { status: number; error?: string; success?: boolean } {
  const { matchId, poll, choice, voterCid, clientFp, clientIp, userAgent } = params;

  if (poll !== 'winner' && poll !== 'motm') {
    return { status: 400, error: 'Invalid poll type' };
  }

  if (!choice || typeof choice !== 'string') {
    return { status: 400, error: 'Choice is required' };
  }

  // Flood protection: max 20 POSTs per minute per IP
  const rateHit = recordHit(`vote:${clientIp}`, 60_000);
  if (rateHit > 20) {
    return { status: 429, error: 'Too many requests. Please slow down.' };
  }

  const voterFp = hashVoterFp(clientIp, userAgent, clientFp);
  const ipHash = hashIp(clientIp);

  // Reject if one IP already has >= 150 votes on that poll
  const ipVoteCount = db
    .prepare('SELECT COUNT(*) as count FROM fan_votes WHERE match_id = ? AND poll = ? AND ip_hash = ?')
    .get(matchId, poll, ipHash) as { count: number };
  if (ipVoteCount && ipVoteCount.count >= 150) {
    return { status: 429, error: 'Maximum votes reached from this network.' };
  }

  // Fetch poll state to validate openness and choice
  const state = getPollsState(matchId, voterCid, voterFp);
  if (!state) {
    return { status: 404, error: 'Match not found' };
  }

  const pollState = poll === 'winner' ? state.winner : state.motm;
  if (!pollState.open) {
    return { status: 403, error: 'This poll is closed' };
  }

  // Validate choice is one of the allowed options
  const validOption = pollState.options.some((opt) => opt.id === choice);
  if (!validOption) {
    return { status: 400, error: 'Invalid option selected' };
  }

  // Check if voter already voted
  if (pollState.my_choice) {
    return { status: 409, error: 'You already voted from this phone' };
  }

  try {
    db.prepare(`
      INSERT INTO fan_votes (match_id, poll, choice, voter_cid, voter_fp, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(matchId, poll, choice, voterCid, voterFp, ipHash, Date.now());
  } catch (err: any) {
    if (err.message?.includes('UNIQUE') || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { status: 409, error: 'You already voted from this phone' };
    }
    throw err;
  }

  return { status: 200, success: true };
}

export function resetPoll(matchId: number, poll: string, adminUsername: string): { success: boolean; deleted: number } {
  let result;
  if (poll === 'winner' || poll === 'motm') {
    result = db.prepare('DELETE FROM fan_votes WHERE match_id = ? AND poll = ?').run(matchId, poll);
    logActivity(adminUsername, 'RESET_FAN_POLL', `Reset ${poll} poll for match #${matchId}`);
  } else {
    result = db.prepare('DELETE FROM fan_votes WHERE match_id = ?').run(matchId);
    logActivity(adminUsername, 'RESET_FAN_POLL', `Reset all fan polls for match #${matchId}`);
  }
  return { success: true, deleted: result.changes };
}

