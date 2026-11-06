import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { updateMatchResult, updateMatchSchedule } from '@/lib/tournamentService';
import db, { logActivity } from '@/lib/db';

export async function PUT(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, match_id, home_score, away_score, home_penalties, away_penalties, status, events, winner_team_id, mvp_player_id, scheduled_time, venue } = body;

    if (!match_id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
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

    // Update match result and events
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

