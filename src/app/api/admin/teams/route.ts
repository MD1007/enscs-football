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
    const { id, name, name_ar, group_id, color, captain_id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    db.prepare(`
      UPDATE teams
      SET name = COALESCE(?, name),
          name_ar = ?,
          group_id = COALESCE(?, group_id),
          color = COALESCE(?, color),
          captain_id = ?
      WHERE id = ?
    `).run(name, name_ar || null, group_id, color, captain_id || null, id);

    // Update is_captain on players
    if (captain_id) {
      db.prepare(`UPDATE players SET is_captain = 0 WHERE team_id = ?`).run(id);
      db.prepare(`UPDATE players SET is_captain = 1 WHERE id = ? AND team_id = ?`).run(captain_id, id);
    }

    logActivity('UPDATE_TEAM', `Updated team #${id} ("${name}")`, admin.username);

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

