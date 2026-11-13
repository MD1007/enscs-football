import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { updateMatchResult, updateMatchSchedule, recalculateAutoMvps, recordForfeit } from '@/lib/tournamentService';
import db, { logActivity } from '@/lib/db';

export async function PUT(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      action,
      match_id,
      home_score,
      away_score,
      home_penalties,
      away_penalties,
      status,
      events,
      winner_team_id,
      mvp_player_id,
      mvp_mode,
      mvp_score,
      possession_home,
      possession_away,
      shots_home,
      shots_away,
      shots_on_target_home,
      shots_on_target_away,
      fouls_home,
      fouls_away,
      scheduled_time,
      venue,
    } = body;

    // Re-run the automatic Man of the Match formula on all finished matches
    // (preview first, then apply). Manual picks are left alone.
    if (action === 'recalculate_mvp') {
      return NextResponse.json({ success: true, ...recalculateAutoMvps(Boolean(body.apply), admin.username) });
    }

    if (!match_id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Stopwatch-only action: stores the pitch-side clock so every visitor sees the live minute.
    if (action === 'clock') {
      const exists = db.prepare('SELECT id FROM matches WHERE id = ?').get(Number(match_id));
      if (!exists) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      }
      const running = Boolean(body.running);
      const elapsed = Math.max(0, Math.min(Number(body.elapsed_ms) || 0, 6 * 60 * 60 * 1000));
      // Which part of the match: first half, half time or second half.
      const period = ['first', 'half_time', 'second'].includes(body.period) ? String(body.period) : null;
      const now = Date.now();
      db.prepare(
        'UPDATE matches SET clock_running = ?, clock_started_at = ?, clock_accumulated_ms = ?, clock_period = ? WHERE id = ?'
      ).run(running ? 1 : 0, running ? now : null, Math.round(elapsed), period, Number(match_id));
      // Not an audit-log event, but it must still reach the cloud backup.
      (globalThis as unknown as { __enscsBackupSoon?: () => void }).__enscsBackupSoon?.();
      return NextResponse.json({ success: true, server_time: now });
    }

    // Award the match by forfeit: one team did not show up.
    if (action === 'forfeit') {
      const result = recordForfeit(Number(match_id), Number(body.forfeit_team_id), Number(body.goals), admin.username);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Schedule-only action
    if (action === 'schedule') {
      if (!scheduled_time) {
        return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
      }
      updateMatchSchedule(Number(match_id), scheduled_time, venue || 'Terrain ENSCS', admin.username);
      return NextResponse.json({ success: true, message: 'Match scheduled successfully' });
    }

    // If updating schedule alongside result
    if (scheduled_time) {
      updateMatchSchedule(Number(match_id), scheduled_time, venue || 'Terrain ENSCS', admin.username);
    }

    // Update match result, stats, MVP, and events
    updateMatchResult(
      Number(match_id),
      {
        home_score: home_score !== undefined && home_score !== '' ? Number(home_score) : null,
        away_score: away_score !== undefined && away_score !== '' ? Number(away_score) : null,
        home_penalties: home_penalties !== undefined && home_penalties !== '' ? Number(home_penalties) : null,
        away_penalties: away_penalties !== undefined && away_penalties !== '' ? Number(away_penalties) : null,
        status: status || 'finished',
        winner_team_id: winner_team_id ? Number(winner_team_id) : null,
        mvp_player_id: mvp_player_id ? Number(mvp_player_id) : null,
        mvp_mode: mvp_mode || 'auto',
        mvp_score: mvp_score !== undefined && mvp_score !== null ? Number(mvp_score) : null,
        possession_home: possession_home !== undefined && possession_home !== '' && possession_home !== null ? Number(possession_home) : null,
        possession_away: possession_away !== undefined && possession_away !== '' && possession_away !== null ? Number(possession_away) : null,
        shots_home: shots_home !== undefined && shots_home !== '' && shots_home !== null ? Number(shots_home) : null,
        shots_away: shots_away !== undefined && shots_away !== '' && shots_away !== null ? Number(shots_away) : null,
        shots_on_target_home: shots_on_target_home !== undefined && shots_on_target_home !== '' && shots_on_target_home !== null ? Number(shots_on_target_home) : null,
        shots_on_target_away: shots_on_target_away !== undefined && shots_on_target_away !== '' && shots_on_target_away !== null ? Number(shots_on_target_away) : null,
        fouls_home: fouls_home !== undefined && fouls_home !== '' && fouls_home !== null ? Number(fouls_home) : null,
        fouls_away: fouls_away !== undefined && fouls_away !== '' && fouls_away !== null ? Number(fouls_away) : null,
        // Goalkeepers, saves and guests: only changed when the request includes them,
        // so an older open admin tab can never wipe them.
        home_gk_id: body.home_gk_id !== undefined ? (body.home_gk_id ? Number(body.home_gk_id) : null) : undefined,
        away_gk_id: body.away_gk_id !== undefined ? (body.away_gk_id ? Number(body.away_gk_id) : null) : undefined,
        home_saves: body.home_saves !== undefined ? Number(body.home_saves) || 0 : undefined,
        away_saves: body.away_saves !== undefined ? Number(body.away_saves) || 0 : undefined,
        home_pen_saves: body.home_pen_saves !== undefined ? Number(body.home_pen_saves) || 0 : undefined,
        away_pen_saves: body.away_pen_saves !== undefined ? Number(body.away_pen_saves) || 0 : undefined,
        guests: Array.isArray(body.guests) ? body.guests : undefined,
        shootout: Array.isArray(body.shootout) ? body.shootout : undefined,
        events: events || [],
      },
      admin.username
    );

    return NextResponse.json({ success: true, message: 'Match updated successfully' });
  } catch (error: any) {
    console.error('Error updating match:', error);
    return NextResponse.json({ error: error.message || 'Failed to update match' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { stage, group_id, matchday, home_team_id, away_team_id, scheduled_time, venue } = body;

    const result = db.prepare(`
      INSERT INTO matches (stage, group_id, matchday, home_team_id, away_team_id, scheduled_time, venue, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming')
    `).run(
      stage || 'group',
      group_id || null,
      matchday ? Number(matchday) : null,
      home_team_id ? Number(home_team_id) : null,
      away_team_id ? Number(away_team_id) : null,
      scheduled_time || new Date().toISOString(),
      venue || 'ENSCS Football Arena'
    );

    logActivity('CREATE_MATCH', `Created new match ID #${result.lastInsertRowid}`, admin.username);

    return NextResponse.json({ success: true, match_id: result.lastInsertRowid });
  } catch (error: any) {
    console.error('Error creating match:', error);
    return NextResponse.json({ error: error.message || 'Failed to create match' }, { status: 500 });
  }
}

