-- =========================================================================
-- ENSCS FOOTBALL TOURNAMENT – SUPABASE SCHEMA & SECURITY POLICIES (RLS)
-- National Higher School of Cybersecurity (ENSCS), Algeria
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TOURNAMENT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS tournament_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE tournament_settings ENABLE ROW LEVEL SECURITY;
-- Public can read settings
CREATE POLICY "Public read tournament settings" ON tournament_settings FOR SELECT USING (true);
-- Only authenticated admins can update settings
CREATE POLICY "Admin write tournament settings" ON tournament_settings FOR ALL TO authenticated USING (true);

-- 3. TOURNAMENT RULES TABLE
CREATE TABLE IF NOT EXISTS tournament_rules (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tournament_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rules" ON tournament_rules FOR SELECT USING (true);
CREATE POLICY "Admin write rules" ON tournament_rules FOR ALL TO authenticated USING (true);

-- 4. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    group_id TEXT NOT NULL CHECK (group_id IN ('A', 'B', 'C')),
    color TEXT DEFAULT '#3B82F6',
    logo_url TEXT,
    captain_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Admin write teams" ON teams FOR ALL TO authenticated USING (true);

-- 5. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    is_captain BOOLEAN DEFAULT false,
    squad_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Admin write players" ON players FOR ALL TO authenticated USING (true);

-- Add foreign key back to teams for captain
ALTER TABLE teams ADD CONSTRAINT fk_captain FOREIGN KEY (captain_id) REFERENCES players(id) ON DELETE SET NULL;

-- 6. MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
    id BIGSERIAL PRIMARY KEY,
    stage TEXT NOT NULL DEFAULT 'group' CHECK (stage IN ('group', 'semi_final', 'third_place', 'final')),
    group_id TEXT CHECK (group_id IN ('A', 'B', 'C')),
    matchday INTEGER,
    home_team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    home_score INTEGER,
    away_score INTEGER,
    home_penalties INTEGER,
    away_penalties INTEGER,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'postponed', 'cancelled')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    venue TEXT DEFAULT 'ENSCS Football Arena',
    notes TEXT,
    winner_team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Admin write matches" ON matches FOR ALL TO authenticated USING (true);

-- 7. MATCH EVENTS TABLE (Goals, Assists, Cards)
CREATE TABLE IF NOT EXISTS match_events (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('goal', 'assist', 'yellow_card', 'red_card')),
    minute INTEGER CHECK (minute >= 1 AND minute <= 130),
    detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read match events" ON match_events FOR SELECT USING (true);
CREATE POLICY "Admin write match events" ON match_events FOR ALL TO authenticated USING (true);

-- 8. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    admin_username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read activity logs" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================================================
-- SEED DATA CAN BE INSERTED VIA SCRIPT OR THE ADMIN DASHBOARD
-- =========================================================================

