export type GroupId = 'A' | 'B' | 'C';

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'postponed' | 'cancelled';

export type MatchStage = 'group' | 'semi_final' | 'third_place' | 'final';

export type EventType = 'goal' | 'assist' | 'yellow_card' | 'red_card';

export interface Player {
  id: number;
  name: string;
  name_ar?: string | null;
  team_id: number;
  team_name?: string;
  is_captain: boolean;
  squad_number?: number | null;
  created_at?: string;
  // Aggregated stats
  goals?: number;
  assists?: number;
  yellow_cards?: number;
  red_cards?: number;
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
  minute?: number | null;
  detail?: string | null;
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
