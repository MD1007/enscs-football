import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import db, { logActivity } from '@/lib/db';

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, name_ar, group_id, color } = await request.json();
    if (!name || !group_id) {
      return NextResponse.json({ error: 'Team name and group are required' }, { status: 400 });
    }

    const res = db.prepare(`
      INSERT INTO teams (name, name_ar, group_id, color)
      VALUES (?, ?, ?, ?)
    `).run(name, name_ar || null, group_id, color || '#3B82F6');

    logActivity('CREATE_TEAM', `Created team "${name}" in Group ${group_id}`, admin.username);

    return NextResponse.json({ success: true, team_id: res.lastInsertRowid });
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
    const { id, name, name_ar, group_id, color, captain_id, goalkeeper_id, player_positions } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM teams WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // A captain / goalkeeper must be a player of this team.
    const belongsToTeam = db.prepare('SELECT id FROM players WHERE id = ? AND team_id = ?');
    if (captain_id && !belongsToTeam.get(captain_id, id)) {
      return NextResponse.json({ error: 'Selected captain is not a player of this team' }, { status: 400 });
    }
    if (goalkeeper_id && !belongsToTeam.get(goalkeeper_id, id)) {
      return NextResponse.json({ error: 'Selected goalkeeper is not a player of this team' }, { status: 400 });
    }

    const update = db.transaction(() => {
      // name_ar is only touched when it is part of the request.
      db.prepare(`
        UPDATE teams
        SET name = COALESCE(?, name),
            name_ar = CASE WHEN ? = 1 THEN ? ELSE name_ar END,
            group_id = COALESCE(?, group_id),
            color = COALESCE(?, color)
        WHERE id = ?
      `).run(name || null, name_ar !== undefined ? 1 : 0, name_ar || null, group_id || null, color || null, id);

      // Captain: only synchronized when sent (undefined = leave as is).
      if (captain_id !== undefined) {
        db.prepare(`UPDATE teams SET captain_id = ? WHERE id = ?`).run(captain_id || null, id);
        db.prepare(`UPDATE players SET is_captain = 0 WHERE team_id = ?`).run(id);
        if (captain_id) {
          db.prepare(`UPDATE players SET is_captain = 1 WHERE id = ? AND team_id = ?`).run(captain_id, id);
        }
      }

      // Goalkeeper: only synchronized when sent (undefined = leave as is).
      if (goalkeeper_id !== undefined) {
        db.prepare(`UPDATE teams SET goalkeeper_id = ? WHERE id = ?`).run(goalkeeper_id || null, id);
        db.prepare(`UPDATE players SET position = 'Attacker' WHERE team_id = ? AND is_goalkeeper = 1 AND id != ?`).run(id, goalkeeper_id || 0);
        db.prepare(`UPDATE players SET is_goalkeeper = 0 WHERE team_id = ?`).run(id);
        if (goalkeeper_id) {
          db.prepare(`UPDATE players SET is_goalkeeper = 1, position = 'Goalkeeper' WHERE id = ? AND team_id = ?`).run(goalkeeper_id, id);
        }
      }

      // Update player positions if provided
      if (Array.isArray(player_positions)) {
        const updatePos = db.prepare(`
          UPDATE players
          SET position = ?,
              is_goalkeeper = CASE WHEN ? = 'Goalkeeper' OR ? = 1 THEN 1 ELSE 0 END
          WHERE id = ? AND team_id = ?
        `);
        for (const pos of player_positions) {
          if (pos.id && pos.position) {
            updatePos.run(pos.position, pos.position, pos.is_goalkeeper ? 1 : 0, pos.id, id);
          }
        }
      }
    });
    update();

    logActivity('UPDATE_TEAM', `Updated team #${id} ("${name || id}")`, admin.username);

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
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(id) as any;
    db.prepare('DELETE FROM teams WHERE id = ?').run(id);

    logActivity('DELETE_TEAM', `Deleted team "${team?.name || id}"`, admin.username);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

