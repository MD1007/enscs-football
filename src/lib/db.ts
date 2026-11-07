import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbDirectory = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = path.join(dbDirectory, 'tournament.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tournament_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournament_rules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      group_id TEXT NOT NULL, -- 'A', 'B', 'C'
      color TEXT DEFAULT '#3B82F6',
      logo_url TEXT,
      captain_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      team_id INTEGER NOT NULL,
      is_captain INTEGER DEFAULT 0,
      squad_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage TEXT NOT NULL DEFAULT 'group', -- 'group', 'semi_final', 'third_place', 'final'
      group_id TEXT,                      -- 'A', 'B', 'C' or NULL for knockout
      matchday INTEGER,
      home_team_id INTEGER,
      away_team_id INTEGER,
      home_score INTEGER,
      away_score INTEGER,
      home_penalties INTEGER,
      away_penalties INTEGER,
      status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'live', 'finished', 'postponed', 'cancelled'
      scheduled_time TEXT,
      is_time_set INTEGER DEFAULT 0,
      venue TEXT DEFAULT 'ENSCS Football Arena',
      notes TEXT,
      winner_team_id INTEGER,
      FOREIGN KEY (home_team_id) REFERENCES teams (id) ON DELETE SET NULL,
      FOREIGN KEY (away_team_id) REFERENCES teams (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS match_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      event_type TEXT NOT NULL, -- 'goal', 'assist', 'yellow_card', 'red_card'
      minute INTEGER,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      admin_username TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrations = [
    'ALTER TABLE matches ADD COLUMN mvp_player_id INTEGER',
    'ALTER TABLE matches ADD COLUMN mvp_mode TEXT DEFAULT "auto"',
    'ALTER TABLE matches ADD COLUMN mvp_score INTEGER',
    'ALTER TABLE matches ADD COLUMN possession_home INTEGER',
    'ALTER TABLE matches ADD COLUMN possession_away INTEGER',
    'ALTER TABLE matches ADD COLUMN shots_home INTEGER',
    'ALTER TABLE matches ADD COLUMN shots_away INTEGER',
    'ALTER TABLE matches ADD COLUMN shots_on_target_home INTEGER',
    'ALTER TABLE matches ADD COLUMN shots_on_target_away INTEGER',
    'ALTER TABLE matches ADD COLUMN fouls_home INTEGER',
    'ALTER TABLE matches ADD COLUMN fouls_away INTEGER',
    'ALTER TABLE match_events ADD COLUMN sub_type TEXT DEFAULT "normal"',
    'ALTER TABLE match_events ADD COLUMN assister_id INTEGER',
    'ALTER TABLE teams ADD COLUMN goalkeeper_id INTEGER',
    'ALTER TABLE players ADD COLUMN position TEXT DEFAULT "Attacker"',
    'ALTER TABLE players ADD COLUMN is_goalkeeper INTEGER DEFAULT 0',
  ];

  for (const sql of migrations) {
    try {
      db.prepare(sql).run();
    } catch (e) {
      // Column already exists
    }
  }

  // Create tournament_awards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_awards (
      award_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      winner_player_id INTEGER,
      selection_mode TEXT DEFAULT 'auto',
      is_locked INTEGER DEFAULT 0,
      is_revealed INTEGER DEFAULT 0,
      revealed_at DATETIME,
      status TEXT DEFAULT 'in_progress',
      data_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (winner_player_id) REFERENCES players (id) ON DELETE SET NULL
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  // Check if admin user exists
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('@mahdidhmn', salt);
  db.prepare('INSERT OR REPLACE INTO admin_users (id, username, password_hash) VALUES (1, ?, ?)').run('MAHDIDHMN', hash);

  // Check if settings exist
  const settingsCount = db.prepare('SELECT count(*) as count FROM tournament_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO tournament_settings (key, value) VALUES (?, ?)');
    insertSetting.run('tournament_name', 'ENSCS FOOTBALL TOURNAMENT');
    insertSetting.run('subtitle', 'National Higher School of Cybersecurity');
    insertSetting.run('location', 'Algiers, Algeria');
    insertSetting.run('current_stage', 'Group Stage');
    insertSetting.run('teams_count_mode', '12_teams'); // 12 teams in official visual reference
    insertSetting.run('discrepancy_resolved', 'false'); // Flags the 11 vs 12 teams discrepancy
    insertSetting.run('discrepancy_notice', 'Official graphic shows 12 teams in 3 groups of 4 (18 matches total). Written announcement mentioned 11 teams. The system is loaded with the visual schedule of 12 teams and 18 matches, and can be customized or confirmed by the admin.');
    insertSetting.run('qualification_format', 'group_winners_plus_best_second'); // 1st A, 1st B, 1st C + Best 2nd place
    insertSetting.run('mvp_weight_goal', '5');
    insertSetting.run('mvp_weight_assist', '3');
    insertSetting.run('mvp_weight_clean_sheet', '4');
    insertSetting.run('mvp_weight_yellow_card', '-1');
    insertSetting.run('mvp_weight_red_card', '-4');
  }

  // Ensure default scoring weights exist
  const insertWeight = db.prepare('INSERT OR IGNORE INTO tournament_settings (key, value) VALUES (?, ?)');
  insertWeight.run('mvp_weight_goal', '4');
  insertWeight.run('mvp_weight_assist', '3');
  insertWeight.run('mvp_weight_motm', '3');
  insertWeight.run('mvp_weight_gk_clean_sheet', '4');
  insertWeight.run('mvp_weight_def_clean_sheet', '2');
  insertWeight.run('mvp_weight_yellow_card', '-1');
  insertWeight.run('mvp_weight_red_card', '-3');
  insertWeight.run('pot_min_appearances', '3');

  // Seed default 7 awards in tournament_awards table
  const insertAward = db.prepare(`
    INSERT OR IGNORE INTO tournament_awards (award_key, title, subtitle) VALUES (?, ?, ?)
  `);
  insertAward.run('pot', 'Player of the Tournament', 'Official Golden Ball Award 2026');
  insertAward.run('tott', 'Team of the Tournament', 'Official Best 7 (5 Starters + 2 Substitutes)');
  insertAward.run('golden_boot', 'Golden Boot', 'Tournament Top Goalscorer');
  insertAward.run('best_playmaker', 'Best Playmaker', 'Tournament Assist Leader');
  insertAward.run('best_gk', 'Best Goalkeeper', 'Golden Glove Award');
  insertAward.run('most_clean_sheets', 'Most Clean Sheets', 'Defensive Wall of the Tournament');
  insertAward.run('most_mvps', 'Most Man of the Match Awards', 'Tournament Kingpin Award');

  // Check if rules exist
  const rulesCount = db.prepare('SELECT count(*) as count FROM tournament_rules').get() as { count: number };
  if (rulesCount.count === 0) {
    const insertRule = db.prepare('INSERT OR IGNORE INTO tournament_rules (id, category, title, content, display_order) VALUES (?, ?, ?, ?, ?)');
    insertRule.run(
      'format',
      'Format',
      'Competition Format',
      'Three groups (Group A, Group B, Group C) of four teams each. Teams play against every other team in their group once (single round-robin). Win = 3 points, Draw = 1 point, Loss = 0 points.',
      1
    );
    insertRule.run(
      'tiebreaking',
      'Standings',
      'Tie-Breaking Rules',
      'In case two or more teams finish with equal points:\n1. Head-to-head match result between tied teams.\n2. Overall goal difference.\n3. Overall goals scored.',
      2
    );
    insertRule.run(
      'qualification',
      'Knockout',
      'Qualification to Knockout Stage',
      'The group winners of Group A, Group B, and Group C automatically qualify for the semi-finals.\nThe fourth semi-finalist is the best second-place team across all three groups based on points, goal difference, and goals scored.',
      3
    );
    insertRule.run(
      'knockout_matches',
      'Knockout',
      'Knockout Matches & Shootouts',
      'The knockout stage consists of Semi-final 1, Semi-final 2, Third-Place Match, and the Grand Final.\nIn the event of a draw at the end of regular time in any knockout match, the winner is determined immediately by a penalty shootout.',
      4
    );
    insertRule.run(
      'roster_rules',
      'General',
      'Roster & Discipline Rules',
      'Each team consists of an official roster of 7 players. A player cannot register or play for two different teams.\nAny team arriving more than 10 minutes past scheduled kickoff loses by forfeit (3-0).\nRespect towards referees, opposing players, and fair play is strictly mandatory.',
      5
    );
  }

  // Check if teams exist
  const teamsCount = db.prepare('SELECT count(*) as count FROM teams').get() as { count: number };
  if (teamsCount.count === 0) {
    seedTeamsAndPlayers();
    seedMatches();
  }
}

function seedTeamsAndPlayers() {
  const insertTeam = db.prepare('INSERT INTO teams (name, name_ar, group_id, color) VALUES (?, ?, ?, ?)');
  const insertPlayer = db.prepare('INSERT INTO players (name, name_ar, team_id, is_captain, squad_number) VALUES (?, ?, ?, ?, ?)');
  const setCaptain = db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?');

  // Transaction for atomic seed
  const transaction = db.transaction(() => {
    // ==========================================
    // GROUP A (Green Identity)
    // ==========================================
    // 1. OSPF
    const ospfRes = insertTeam.run('OSPF', null, 'A', '#10B981');
    const ospfId = Number(ospfRes.lastInsertRowid);
    const ospfPlayers = [
      { name: 'Oussama Meraihai', ar: null, cap: true, num: 1 },
      { name: 'Ait Amer Meziane Hocine', ar: null, cap: false, num: 2 },
      { name: 'Bouzid Haithem', ar: null, cap: false, num: 3 },
      { name: 'Zaidi Taha Amine', ar: null, cap: false, num: 4 },
      { name: 'Reffas Chouaib', ar: null, cap: false, num: 5 },
      { name: 'Boudjella Mohammed Amine', ar: null, cap: false, num: 6 },
      { name: 'Larbi Ibrahim', ar: null, cap: false, num: 7 },
    ];
    let ospfCapId: number | null = null;
    for (const p of ospfPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, ospfId, p.cap ? 1 : 0, p.num);
      if (p.cap) ospfCapId = Number(pRes.lastInsertRowid);
    }
    if (ospfCapId) setCaptain.run(ospfCapId, ospfId);

    // 2. ELITE WOLVES
    const wolvesRes = insertTeam.run('ELITE WOLVES', null, 'A', '#059669');
    const wolvesId = Number(wolvesRes.lastInsertRowid);
    const wolvesPlayers = [
      { name: 'Nessissen Mohamed', ar: null, cap: true, num: 1 },
      { name: 'Halis Hassen', ar: null, cap: false, num: 2 },
      { name: 'Hadjar Rezki', ar: null, cap: false, num: 3 },
      { name: 'Amine Belouis', ar: null, cap: false, num: 4 },
      { name: 'Fahem Mohamed', ar: null, cap: false, num: 5 },
      { name: 'Amine Berien', ar: null, cap: false, num: 6 },
      { name: 'Amine Deradji', ar: null, cap: false, num: 7 },
    ];
    let wolvesCapId: number | null = null;
    for (const p of wolvesPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, wolvesId, p.cap ? 1 : 0, p.num);
      if (p.cap) wolvesCapId = Number(pRes.lastInsertRowid);
    }
    if (wolvesCapId) setCaptain.run(wolvesCapId, wolvesId);

    // 3. Spider-Feet
    const spiderRes = insertTeam.run('Spider-Feet', null, 'A', '#34D399');
    const spiderId = Number(spiderRes.lastInsertRowid);
    const spiderPlayers = [
      { name: 'Saci Mohammed Yasser', ar: null, cap: true, num: 1 },
      { name: 'Dahak Achraf Abd Madjid', ar: null, cap: false, num: 2 },
      { name: 'Chenika Merwane', ar: null, cap: false, num: 3 },
      { name: 'Difallah Anes', ar: null, cap: false, num: 4 },
      { name: 'Baghdouche Yacer', ar: null, cap: false, num: 5 },
      { name: 'Boukhares Mohamed Amine', ar: null, cap: false, num: 6 },
      { name: 'Kherroubi Khaled', ar: null, cap: false, num: 7 },
    ];
    let spiderCapId: number | null = null;
    for (const p of spiderPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, spiderId, p.cap ? 1 : 0, p.num);
      if (p.cap) spiderCapId = Number(pRes.lastInsertRowid);
    }
    if (spiderCapId) setCaptain.run(spiderCapId, spiderId);

    // 4. Laghbina FC (Arabic names preserved exactly from Reference Image 1)
    const laghbinaRes = insertTeam.run('Laghbina FC', 'لغبينة إف سي', 'A', '#047857');
    const laghbinaId = Number(laghbinaRes.lastInsertRowid);
    const laghbinaPlayers = [
      { name: 'كابرين محمد لؤي', ar: 'كابرين محمد لؤي', cap: true, num: 1 },
      { name: 'فتاكة سيد أحمد', ar: 'فتاكة سيد أحمد', cap: false, num: 2 },
      { name: 'بن دادة منصف', ar: 'بن دادة منصف', cap: false, num: 3 },
      { name: 'احمد بهاء عمران', ar: 'احمد بهاء عمران', cap: false, num: 4 },
      { name: 'سعدي أيوب عبد الصمد', ar: 'سعدي أيوب عبد الصمد', cap: false, num: 5 },
      { name: 'تومي زكرياء', ar: 'تومي زكرياء', cap: false, num: 6 },
      { name: 'بريمة أيمن', ar: 'بريمة أيمن', cap: false, num: 7 },
    ];
    let laghbinaCapId: number | null = null;
    for (const p of laghbinaPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, laghbinaId, p.cap ? 1 : 0, p.num);
      if (p.cap) laghbinaCapId = Number(pRes.lastInsertRowid);
    }
    if (laghbinaCapId) setCaptain.run(laghbinaCapId, laghbinaId);

    // ==========================================
    // GROUP B (Blue Identity)
    // ==========================================
    // 5. Rats Team
    const ratsRes = insertTeam.run('Rats Team', null, 'B', '#3B82F6');
    const ratsId = Number(ratsRes.lastInsertRowid);
    const ratsPlayers = [
      { name: 'Amine', ar: null, cap: true, num: 1 },
      { name: 'Hassan', ar: null, cap: false, num: 2 },
      { name: 'Abdou', ar: null, cap: false, num: 3 },
      { name: 'Achraf', ar: null, cap: false, num: 4 },
      { name: 'Malek', ar: null, cap: false, num: 5 },
      { name: 'Ali', ar: null, cap: false, num: 6 },
      { name: 'Akrem', ar: null, cap: false, num: 7 },
    ];
    let ratsCapId: number | null = null;
    for (const p of ratsPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, ratsId, p.cap ? 1 : 0, p.num);
      if (p.cap) ratsCapId = Number(pRes.lastInsertRowid);
    }
    if (ratsCapId) setCaptain.run(ratsCapId, ratsId);

    // 6. PVC
    const pvcRes = insertTeam.run('PVC', null, 'B', '#2563EB');
    const pvcId = Number(pvcRes.lastInsertRowid);
    const pvcPlayers = [
      { name: 'Bourouba Younes', ar: null, cap: false, num: 1 },
      { name: 'Benchaiba Aymen', ar: null, cap: false, num: 2 },
      { name: 'Laabidi Achref', ar: null, cap: false, num: 3 },
      { name: 'Skander Ishak', ar: null, cap: false, num: 4 },
      { name: 'Kebich Anes', ar: null, cap: false, num: 5 },
      { name: 'Bouguedah Amine', ar: null, cap: true, num: 6 },
      { name: 'Toubi Nizar', ar: null, cap: false, num: 7 },
    ];
    let pvcCapId: number | null = null;
    for (const p of pvcPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, pvcId, p.cap ? 1 : 0, p.num);
      if (p.cap) pvcCapId = Number(pRes.lastInsertRowid);
    }
    if (pvcCapId) setCaptain.run(pvcCapId, pvcId);

    // 7. Nscs
    const nscsRes = insertTeam.run('Nscs', null, 'B', '#60A5FA');
    const nscsId = Number(nscsRes.lastInsertRowid);
    const nscsPlayers = [
      { name: 'Abbou Idris', ar: null, cap: false, num: 1 },
      { name: 'Saada Houssem', ar: null, cap: true, num: 2 },
      { name: 'Taha Chaouch Yacine', ar: null, cap: false, num: 3 },
      { name: 'Hemari Mahdi', ar: null, cap: false, num: 4 },
      { name: 'Dib Abdelmalak', ar: null, cap: false, num: 5 },
      { name: 'Akram Zerguine', ar: null, cap: false, num: 6 },
      { name: 'Bouzira Yacine', ar: null, cap: false, num: 7 },
    ];
    let nscsCapId: number | null = null;
    for (const p of nscsPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, nscsId, p.cap ? 1 : 0, p.num);
      if (p.cap) nscsCapId = Number(pRes.lastInsertRowid);
    }
    if (nscsCapId) setCaptain.run(nscsCapId, nscsId);

    // 8. Barca (Captain: Hocine (agent), roster pending confirmation)
    const barcaRes = insertTeam.run('Barca', null, 'B', '#1D4ED8');
    const barcaId = Number(barcaRes.lastInsertRowid);
    const barcaCapRes = insertPlayer.run('Hocine (agent)', null, barcaId, 1, 1);
    setCaptain.run(Number(barcaCapRes.lastInsertRowid), barcaId);

    // ==========================================
    // GROUP C (Red Identity)
    // ==========================================
    // 9. Zoro (Preserving Arabic captain & players)
    const zoroRes = insertTeam.run('Zoro', 'زورو', 'C', '#EF4444');
    const zoroId = Number(zoroRes.lastInsertRowid);
    const zoroPlayers = [
      { name: 'رمضاني سيف الدين', ar: 'رمضاني سيف الدين', cap: true, num: 1 },
      { name: 'فراح محمد الأمين', ar: 'فراح محمد الأمين', cap: false, num: 2 },
      { name: 'طه لبصير', ar: 'طه لبصير', cap: false, num: 3 },
      { name: 'بن بوشريط مروان', ar: 'بن بوشريط مروان', cap: false, num: 4 },
      { name: 'أنس خضرون', ar: 'أنس خضرون', cap: false, num: 5 },
      { name: 'أوديع إسلام', ar: 'أوديع إسلام', cap: false, num: 6 },
      { name: 'حبار كمال', ar: 'حبار كمال', cap: false, num: 7 },
    ];
    let zoroCapId: number | null = null;
    for (const p of zoroPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, zoroId, p.cap ? 1 : 0, p.num);
      if (p.cap) zoroCapId = Number(pRes.lastInsertRowid);
    }
    if (zoroCapId) setCaptain.run(zoroCapId, zoroId);

    // 10. FC deddou
    const deddouRes = insertTeam.run('FC deddou', null, 'C', '#DC2626');
    const deddouId = Number(deddouRes.lastInsertRowid);
    const deddouPlayers = [
      { name: 'Saifi Abdennour', ar: null, cap: true, num: 1 },
      { name: 'Saadi Moncif', ar: null, cap: false, num: 2 },
      { name: 'Sadek Fehis', ar: null, cap: false, num: 3 },
      { name: 'Zaki Raghda', ar: null, cap: false, num: 4 },
      { name: 'Kahoul Mohamed', ar: null, cap: false, num: 5 },
      { name: 'Mechir Nour El Islem', ar: null, cap: false, num: 6 },
      { name: 'Lahacani Mohammed Reda', ar: null, cap: false, num: 7 },
    ];
    let deddouCapId: number | null = null;
    for (const p of deddouPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, deddouId, p.cap ? 1 : 0, p.num);
      if (p.cap) deddouCapId = Number(pRes.lastInsertRowid);
    }
    if (deddouCapId) setCaptain.run(deddouCapId, deddouId);

    // 11. فريق الرجال (All Arabic names preserved)
    const rijalRes = insertTeam.run('فريق الرجال', 'فريق الرجال', 'C', '#F87171');
    const rijalId = Number(rijalRes.lastInsertRowid);
    const rijalPlayers = [
      { name: 'عيساوي عبد الهادي أمين', ar: 'عيساوي عبد الهادي أمين', cap: true, num: 1 },
      { name: 'زريبي مصطفى', ar: 'زريبي مصطفى', cap: false, num: 2 },
      { name: 'لحسن فاضل تاج الدين', ar: 'لحسن فاضل تاج الدين', cap: false, num: 3 },
      { name: 'شرفاوي عبد الرحيم', ar: 'شرفاوي عبد الرحيم', cap: false, num: 4 },
      { name: 'كسول علي', ar: 'كسول علي', cap: false, num: 5 },
      { name: 'زرقلة عبد الإله', ar: 'زرقلة عبد الإله', cap: false, num: 6 },
    ];
    let rijalCapId: number | null = null;
    for (const p of rijalPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, rijalId, p.cap ? 1 : 0, p.num);
      if (p.cap) rijalCapId = Number(pRes.lastInsertRowid);
    }
    if (rijalCapId) setCaptain.run(rijalCapId, rijalId);

    // 12. FC Rono
    const ronoRes = insertTeam.run('FC Rono', null, 'C', '#B91C1C');
    const ronoId = Number(ronoRes.lastInsertRowid);
    const ronoPlayers = [
      { name: 'Zinedine Ider', ar: null, cap: true, num: 1 },
      { name: 'Mouhamed Mesaoud', ar: null, cap: false, num: 2 },
      { name: 'Ayoub B1', ar: null, cap: false, num: 3 },
      { name: 'Ayoub² B1', ar: null, cap: false, num: 4 },
      { name: 'Nabil Elaifaoui', ar: null, cap: false, num: 5 },
    ];
    let ronoCapId: number | null = null;
    for (const p of ronoPlayers) {
      const pRes = insertPlayer.run(p.name, p.ar, ronoId, p.cap ? 1 : 0, p.num);
      if (p.cap) ronoCapId = Number(pRes.lastInsertRowid);
    }
    if (ronoCapId) setCaptain.run(ronoCapId, ronoId);
  });

  transaction();
}

function seedMatches() {
  const getTeam = db.prepare('SELECT id FROM teams WHERE name = ?');
  const insertMatch = db.prepare(`
    INSERT INTO matches (stage, group_id, matchday, home_team_id, away_team_id, status, scheduled_time, venue)
    VALUES (?, ?, ?, ?, ?, 'upcoming', ?, 'Terrain ENSCS')
  `);

  const teams = {
    // Group A
    ospf: (getTeam.get('OSPF') as { id: number }).id,
    wolves: (getTeam.get('ELITE WOLVES') as { id: number }).id,
    spider: (getTeam.get('Spider-Feet') as { id: number }).id,
    laghbina: (getTeam.get('Laghbina FC') as { id: number }).id,
    // Group B
    rats: (getTeam.get('Rats Team') as { id: number }).id,
    pvc: (getTeam.get('PVC') as { id: number }).id,
    nscs: (getTeam.get('Nscs') as { id: number }).id,
    barca: (getTeam.get('Barca') as { id: number }).id,
    // Group C
    zoro: (getTeam.get('Zoro') as { id: number }).id,
    deddou: (getTeam.get('FC deddou') as { id: number }).id,
    rijal: (getTeam.get('فريق الرجال') as { id: number }).id,
    rono: (getTeam.get('FC Rono') as { id: number }).id,
  };

  const transaction = db.transaction(() => {
    // ==========================================
    // GROUP A MATCHES (Image 2: Journée 1, 2, 3)
    // ==========================================
    // Journée 1
    insertMatch.run('group', 'A', 1, teams.ospf, teams.laghbina, '2026-11-10T14:00:00');
    insertMatch.run('group', 'A', 1, teams.wolves, teams.spider, '2026-11-10T15:00:00');
    // Journée 2
    insertMatch.run('group', 'A', 2, teams.ospf, teams.spider, '2026-11-12T14:00:00');
    insertMatch.run('group', 'A', 2, teams.laghbina, teams.wolves, '2026-11-12T15:00:00');
    // Journée 3
    insertMatch.run('group', 'A', 3, teams.ospf, teams.wolves, '2026-11-14T14:00:00');
    insertMatch.run('group', 'A', 3, teams.spider, teams.laghbina, '2026-11-14T15:00:00');

    // ==========================================
    // GROUP B MATCHES
    // ==========================================
    // Journée 1
    insertMatch.run('group', 'B', 1, teams.rats, teams.barca, '2026-11-10T16:00:00');
    insertMatch.run('group', 'B', 1, teams.pvc, teams.nscs, '2026-11-10T17:00:00');
    // Journée 2
    insertMatch.run('group', 'B', 2, teams.rats, teams.nscs, '2026-11-12T16:00:00');
    insertMatch.run('group', 'B', 2, teams.barca, teams.pvc, '2026-11-12T17:00:00');
    // Journée 3
    insertMatch.run('group', 'B', 3, teams.rats, teams.pvc, '2026-11-14T16:00:00');
    insertMatch.run('group', 'B', 3, teams.nscs, teams.barca, '2026-11-14T17:00:00');

    // ==========================================
    // GROUP C MATCHES
    // ==========================================
    // Journée 1
    insertMatch.run('group', 'C', 1, teams.zoro, teams.rono, '2026-11-11T14:00:00');
    insertMatch.run('group', 'C', 1, teams.deddou, teams.rijal, '2026-11-11T15:00:00');
    // Journée 2
    insertMatch.run('group', 'C', 2, teams.zoro, teams.rijal, '2026-11-13T14:00:00');
    insertMatch.run('group', 'C', 2, teams.rono, teams.deddou, '2026-11-13T15:00:00');
    // Journée 3
    insertMatch.run('group', 'C', 3, teams.zoro, teams.deddou, '2026-11-15T14:00:00');
    insertMatch.run('group', 'C', 3, teams.rijal, teams.rono, '2026-11-15T15:00:00');

    // Initial knockout placeholders
    insertMatch.run('semi_final', null, null, null, null, '2026-11-18T14:00:00'); // SF1
    insertMatch.run('semi_final', null, null, null, null, '2026-11-18T15:30:00'); // SF2
    insertMatch.run('third_place', null, null, null, null, '2026-11-20T14:00:00'); // 3rd Place
    insertMatch.run('final', null, null, null, null, '2026-11-20T16:00:00'); // Final
  });

  transaction();
}

export function logActivity(action: string, details: string, adminUsername: string = 'admin') {
  try {
    db.prepare('INSERT INTO activity_logs (action, details, admin_username) VALUES (?, ?, ?)').run(
      action,
      details,
      adminUsername
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export default db;
