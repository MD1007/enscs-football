import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import db, { logActivity } from '@/lib/db';

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, name_ar, team_id, is_captain, squad_number, position, is_goalkeeper } = await request.json();
    if (!name || !team_id) {
      return NextResponse.json({ error: 'Player name and team ID are required' }, { status: 400 });
    }

    const assignedPos = position || (is_goalkeeper ? 'Goalkeeper' : 'Attacker');
    const isGK = is_goalkeeper || assignedPos === 'Goalkeeper' ? 1 : 0;

    const res = db.prepare(`
      INSERT INTO players (name, name_ar, team_id, is_captain, squad_number, position, is_goalkeeper)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, name_ar || null, team_id, is_captain ? 1 : 0, squad_number || null, assignedPos, isGK);

    const playerId = Number(res.lastInsertRowid);

    if (is_captain) {
      db.prepare(`UPDATE teams SET captain_id = ? WHERE id = ?`).run(playerId, team_id);
    }

    if (isGK) {
      db.prepare(`UPDATE players SET is_goalkeeper = 0 WHERE team_id = ? AND id != ?`).run(team_id, playerId);
      db.prepare(`UPDATE teams SET goalkeeper_id = ? WHERE id = ?`).run(playerId, team_id);
    }

    logActivity('ADD_PLAYER', `Added player "${name}" (${assignedPos}) to team #${team_id}`, admin.username);

    return NextResponse.json({ success: true, player_id: playerId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name, name_ar, team_id, is_captain, squad_number, position, is_goalkeeper } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const isGK = is_goalkeeper !== undefined ? (is_goalkeeper ? 1 : 0) : (position === 'Goalkeeper' ? 1 : undefined);

    db.prepare(`
      UPDATE players
      SET name = COALESCE(?, name),
          name_ar = ?,
          team_id = COALESCE(?, team_id),
          is_captain = COALESCE(?, is_captain),
          squad_number = ?,
          position = COALESCE(?, position),
          is_goalkeeper = COALESCE(?, is_goalkeeper)
      WHERE id = ?
    `).run(name, name_ar || null, team_id, is_captain !== undefined ? (is_captain ? 1 : 0) : null, squad_number || null, position, isGK, id);

    if (is_captain && team_id) {
      db.prepare(`UPDATE teams SET captain_id = ? WHERE id = ?`).run(id, team_id);
    }

    if (isGK === 1 && team_id) {
      db.prepare(`UPDATE players SET is_goalkeeper = 0 WHERE team_id = ? AND id != ?`).run(team_id, id);
      db.prepare(`UPDATE teams SET goalkeeper_id = ? WHERE id = ?`).run(id, team_id);
    }

    logActivity('UPDATE_PLAYER', `Updated player #${id} ("${name}")`, admin.username);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const player = db.prepare('SELECT name, team_id FROM players WHERE id = ?').get(id) as any;
    db.prepare('DELETE FROM players WHERE id = ?').run(id);

    // If was captain, remove captain_id on team
    if (player) {
      db.prepare('UPDATE teams SET captain_id = NULL WHERE captain_id = ?').run(id);
    }

    logActivity('DELETE_PLAYER', `Deleted player "${player?.name || id}"`, admin.username);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

