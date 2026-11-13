export type GroupId = 'A' | 'B' | 'C';

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'postponed' | 'cancelled';

export type MatchStage = 'group' | 'semi_final' | 'third_place' | 'final';

export type EventType = 'goal' | 'assist' | 'yellow_card' | 'red_card';

export type GoalType = 'normal' | 'penalty' | 'own_goal';

export interface PlayerBadge {
  title: string;
  subtitle: string;
  color: 'amber' | 'emerald' | 'purple' | 'red' | 'blue';
  icon?: string;
}

export interface Player {
  id: number;
  name: string;
  name_ar?: string | null;
  team_id: number;
  team_name?: string;
  is_captain: boolean;
  is_goalkeeper?: boolean;
  squad_number?: number | null;
  position?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker' | string | null;
  created_at?: string;
  // Aggregated stats
  matches_played?: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  mvps?: number;
  clean_sheets?: number;
  goals_conceded?: number;
  matches_as_gk?: number;
  clean_sheet_percentage?: number;
  goals_conceded_per_match?: number;
  goals_per_match?: number;
  assists_per_match?: number;
  overall_points?: number;
  /** Guest player with no fixed team (kept in the hidden Joker squad). */
  is_joker?: boolean;
  /** Teams a joker has played for. */
  guest_teams?: string[];
  gk_goals?: number;
  gk_assists?: number;
  penalty_saves?: number;
  /** Great saves: admin-only, removed from public responses. */
  saves?: number;
  nicknames?: PlayerBadge[];
}

export interface Team {
  id: number;
  name: string;
  name_ar?: string | null;
  group_id: GroupId;
  color?: string | null;
  logo_url?: string | null;
  captain_id?: number | null;
  captain_name?: string | null;
  goalkeeper_id?: number | null;
  goalkeeper_name?: string | null;
  players?: Player[];
  created_at?: string;
}

export interface ShootoutKick {
  team_id: number;
  player_id?: number | null;
  player_name?: string | null;
  result: 'scored' | 'missed' | 'saved';
}

export interface MatchGuest {
  player_id: number;
  team_id: number;
  player_name?: string;
}

export interface MatchEvent {
  /** True when this player was the goalkeeper of his side in this match. */
  player_is_gk?: boolean;
  assister_is_gk?: boolean;
  /** True when this player is a joker (guest) rather than a squad member. */
  player_is_guest?: boolean;
  assister_is_guest?: boolean;
  id: number;
  match_id: number;
  team_id: number;
  player_id: number;
  event_type: EventType;
  sub_type?: GoalType | null;
  minute?: number | null;
  detail?: string | null;
  assister_id?: number | null;
  assister_name?: string | null;
  player_name?: string;
  team_name?: string;
}

export interface Match {
  id: number;
  stage: MatchStage;
  group_id?: GroupId | null;
  matchday?: number | null;
  home_team_id: number;
  away_team_id: number;
  home_team_name?: string;
  away_team_name?: string;
  home_team_color?: string;
  away_team_color?: string;
  home_score?: number | null;
  away_score?: number | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  status: MatchStatus;
  scheduled_time: string; // ISO string or datetime
  is_time_set?: boolean;
  venue?: string | null;
  notes?: string | null;
  winner_team_id?: number | null;
  mvp_player_id?: number | null;
  mvp_player_name?: string | null;
  mvp_team_name?: string | null;
  mvp_mode?: 'auto' | 'manual' | null;
  mvp_score?: number | null;
  possession_home?: number | null;
  possession_away?: number | null;
  shots_home?: number | null;
  shots_away?: number | null;
  shots_on_target_home?: number | null;
  shots_on_target_away?: number | null;
  fouls_home?: number | null;
  fouls_away?: number | null;
  // Live stopwatch (server time, epoch ms)
  clock_started_at?: number | null;
  clock_accumulated_ms?: number | null;
  clock_running?: number | boolean | null;
  /** 'first' | 'half_time' | 'second' (null for clocks without halves) */
  clock_period?: string | null;
  /** Team that did not show up, when the match was awarded by forfeit. */
  forfeit_team_id?: number | null;
  // Goalkeeper who actually played each side (null = the team's usual keeper)
  home_gk_id?: number | null;
  away_gk_id?: number | null;
  // Admin-only counters (removed from public responses)
  home_saves?: number | null;
  away_saves?: number | null;
  home_pen_saves?: number | null;
  away_pen_saves?: number | null;
  /** Jokers / guests who played this match, and for which side. */
  guests?: MatchGuest[];
  /** Penalty shootout, kick by kick in the order taken. */
  shootout?: ShootoutKick[];
  /** Epoch ms when the match was marked finished (opens the fans' MVP vote). */
  finished_at?: number | null;
  events?: MatchEvent[];
}

export interface StandingRow {
  position: number;
  team_id: number;
  team_name: string;
  team_color?: string;
  group_id: GroupId;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form?: ('W' | 'D' | 'L')[];
  is_qualified?: boolean;
}

export interface KnockoutMatchBracket {
  id: number;
  stage: 'semi_final' | 'third_place' | 'final';
  match_number: number; // 1 = SF1, 2 = SF2, 3 = 3rd place, 4 = Final
  label: string;
  home_team: Team | null;
  away_team: Team | null;
  home_team_label: string; // e.g. "1st Group A" or "Winner SF1"
  away_team_label: string; // e.g. "Best 2nd Place" or "Winner SF2"
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: MatchStatus;
  scheduled_time: string;
  winner_team_id: number | null;
  match_id?: number;
}

export interface TournamentRule {
  id: string;
  category: string;
  title: string;
  content: string;
  display_order: number;
}

export interface ActivityLog {
  id: number;
  action: string;
  details: string;
  admin_username: string;
  created_at: string;
}

export interface TeamOfTournamentPlayer {
  slot_id: string; // 'gk', 'pos_1', 'pos_2', 'pos_3', 'pos_4', 'sub_1', 'sub_2'
  slot_type: 'starter' | 'substitute';
  position_label: string; // 'GK', 'DEF', 'MID', 'FWD', 'SUB'
  pitch_x: number; // percentage 0-100
  pitch_y: number; // percentage 0-100
  player_id: number;
  player_name: string;
  player_team_id: number;
  player_team_name: string;
  goals: number;
  assists: number;
  mvps: number;
  points: number;
}

export interface TeamOfTournamentData {
  formation: string; // '1-2-1', '2-2', '1-1-2', '2-1-1'
  starters: TeamOfTournamentPlayer[]; // exactly 5
  substitutes: TeamOfTournamentPlayer[]; // exactly 2
}

export type AwardKey =
  | 'pot'
  | 'tott'
  | 'golden_boot'
  | 'best_playmaker'
  | 'best_gk'
  | 'most_clean_sheets'
  | 'most_mvps';

export type AwardStatus = 'not_started' | 'in_progress' | 'ready' | 'locked' | 'published';

export interface AwardItem {
  award_key: AwardKey;
  title: string;
  subtitle?: string | null;
  winner_player_id?: number | null;
  winner?: Player | null;
  selection_mode: 'auto' | 'manual';
  is_locked: boolean;
  is_revealed: boolean;
  revealed_at?: string | null;
  status: AwardStatus;
  data_json?: any;
  candidates?: any[];
  top_candidate?: any;
}

export interface TournamentAwardsState {
  awards_list: AwardItem[];
  // Individual reveal flags for quick consumption
  pot_revealed: boolean;
  pot_revealed_at?: string | null;
  pot_winner?: Player | null;
  pot_mode: 'auto' | 'manual';
  pot_locked: boolean;

  tott_revealed: boolean;
  tott_revealed_at?: string | null;
  tott_data?: TeamOfTournamentData | null;

  golden_boot_revealed: boolean;
  golden_boot_winner?: Player | null;

  best_playmaker_revealed: boolean;
  best_playmaker_winner?: Player | null;

  best_gk_revealed: boolean;
  best_gk_winner?: Player | null;

  most_clean_sheets_revealed: boolean;
  most_clean_sheets_winner?: Player | null;

  most_mvps_revealed: boolean;
  most_mvps_winner?: Player | null;

  weights: Record<string, number>;
  min_appearances: number;
}

export interface TournamentData {
  /** Server clock (epoch ms) when the data was produced; used to sync live match minutes. */
  server_time?: number;
  teams: Team[];
  players: Player[];
  matches: Match[];
  rules: TournamentRule[];
  settings: Record<string, string>;
  standings: Record<GroupId, StandingRow[]>;
  best_second: StandingRow[];
  top_scorers: { player: Player; goals: number; appearances: number; goals_per_match: number; rank: number }[];
  top_assists: { player: Player; assists: number; appearances: number; assists_per_match: number; rank: number }[];
  top_mvps: { player: Player; mvps: number; appearances: number; rank: number }[];
  best_goalkeepers?: { player: Player; clean_sheets: number; goals_conceded: number; clean_sheet_percentage: number; appearances: number; rank: number; is_tied?: boolean }[];
  clean_sheets_leaderboard?: { player: Player; clean_sheets: number; matches_as_gk: number; clean_sheet_percentage: number; rank: number; is_tied?: boolean }[];
  player_of_tournament?: { player: Player; points: number; rank: number; goals: number; assists: number; mvps: number; appearances: number; is_eligible: boolean }[];
  awards?: TournamentAwardsState;
  yellow_cards: { player: Player; count: number; rank: number }[];
  red_cards: { player: Player; count: number; rank: number }[];
  summary: {
    total_teams: number;
    matches_played: number;
    matches_remaining: number;
    total_goals: number;
    current_stage: string;
    next_match: Match | null;
    discrepancy_resolved: boolean;
  };
}
