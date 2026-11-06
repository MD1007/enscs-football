import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import db, { logActivity } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const teams = db.prepare('SELECT * FROM teams').all();
    const players = db.prepare('SELECT * FROM players').all();
    const matches = db.prepare('SELECT * FROM matches').all();
    const match_events = db.prepare('SELECT * FROM match_events').all();
    const tournament_settings = db.prepare('SELECT * FROM tournament_settings').all();
    const tournament_rules = db.prepare('SELECT * FROM tournament_rules').all();

    const backup = {
      exported_at: new Date().toISOString(),
      admin_username: admin.username,
      tournament_settings,
      tournament_rules,
      teams,
      players,
      matches,
      match_events,
    };

    return NextResponse.json(backup);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backup = await request.json();

    if (!backup.teams || !backup.matches) {
      return NextResponse.json({ error: 'Invalid backup file structure' }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      // Clear current data
      db.exec(`
        DELETE FROM match_events;
        DELETE FROM matches;
        DELETE FROM players;
        DELETE FROM teams;
        DELETE FROM tournament_rules;
        DELETE FROM tournament_settings;
      `);

      // Restore settings
      if (backup.tournament_settings) {
        const insSetting = db.prepare('INSERT INTO tournament_settings (key, value) VALUES (?, ?)');
        for (const s of backup.tournament_settings) {
          insSetting.run(s.key, s.value);
        }
      }

      // Restore rules
      if (backup.tournament_rules) {
        const insRule = db.prepare('INSERT INTO tournament_rules (id, category, title, content, display_order) VALUES (?, ?, ?, ?, ?)');
        for (const r of backup.tournament_rules) {
          insRule.run(r.id, r.category, r.title, r.content, r.display_order);
        }
      }

      // Restore teams
      const insTeam = db.prepare('INSERT INTO teams (id, name, name_ar, group_id, color, logo_url, captain_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const t of backup.teams) {
        insTeam.run(t.id, t.name, t.name_ar, t.group_id, t.color, t.logo_url, t.captain_id);
      }

      // Restore players
      const insPlayer = db.prepare('INSERT INTO players (id, name, name_ar, team_id, is_captain, squad_number) VALUES (?, ?, ?, ?, ?, ?)');
      for (const p of backup.players) {
        insPlayer.run(p.id, p.name, p.name_ar, p.team_id, p.is_captain, p.squad_number);
      }

      // Restore matches
      const insMatch = db.prepare(`
        INSERT INTO matches (id, stage, group_id, matchday, home_team_id, away_team_id, home_score, away_score, home_penalties, away_penalties, status, scheduled_time, is_time_set, venue, notes, winner_team_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of backup.matches) {
        insMatch.run(
          m.id,
          m.stage,
          m.group_id,
          m.matchday,
          m.home_team_id,
          m.away_team_id,
          m.home_score,
          m.away_score,
          m.home_penalties,
          m.away_penalties,
          m.status,
          m.scheduled_time,
          m.is_time_set ? 1 : 0,
          m.venue,
          m.notes,
          m.winner_team_id
        );
      }

      // Restore events
      if (backup.match_events) {
        const insEvent = db.prepare('INSERT INTO match_events (id, match_id, team_id, player_id, event_type, minute, detail) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const ev of backup.match_events) {
          insEvent.run(ev.id, ev.match_id, ev.team_id, ev.player_id, ev.event_type, ev.minute, ev.detail);
        }
      }

      logActivity('RESTORE_BACKUP', 'Restored complete tournament database from backup JSON', admin.username);
    });

    transaction();

    return NextResponse.json({ success: true, message: 'Tournament restored successfully from backup.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

