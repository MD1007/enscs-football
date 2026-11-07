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
  squad_number?: number | null;
  position?: string | null;
  created_at?: string;
  // Aggregated stats
  matches_played?: number;
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  mvps?: number;
  overall_points?: number;
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
  players?: Player[];
  created_at?: string;
}

export interface MatchEvent {
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

export interface TournamentAwardsState {
  // Player of the Tournament
  pot_revealed: boolean;
  pot_revealed_at?: string | null;
  pot_winner?: Player | null;
  pot_mode: 'auto' | 'manual';
  pot_locked: boolean;
  // Team of the Tournament (7 players: 5 starters + 2 substitutes)
  tott_revealed: boolean;
  tott_revealed_at?: string | null;
  tott_data?: TeamOfTournamentData | null;
}

export interface TournamentData {
  teams: Team[];
  players: Player[];
  matches: Match[];
  rules: TournamentRule[];
  settings: Record<string, string>;
  standings: Record<GroupId, StandingRow[]>;
  best_second: StandingRow[];
  top_scorers: { player: Player; goals: number; rank: number }[];
  top_assists: { player: Player; assists: number; rank: number }[];
  top_mvps: { player: Player; mvps: number; rank: number }[];
  player_of_tournament?: { player: Player; points: number; rank: number; goals: number; assists: number; mvps: number; appearances?: number }[];
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
