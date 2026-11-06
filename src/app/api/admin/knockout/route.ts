import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { autoPopulateKnockoutStage } from '@/lib/tournamentService';
import db, { logActivity } from '@/lib/db';

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === 'auto_populate') {
      const res = autoPopulateKnockoutStage(admin.username);
      return NextResponse.json(res);
    }

    if (body.action === 'update_fixture') {
      const { match_id, home_team_id, away_team_id, scheduled_time, stage } = body;
      db.prepare(`
        UPDATE matches
        SET home_team_id = ?,
            away_team_id = ?,
            scheduled_time = COALESCE(?, scheduled_time),
            stage = COALESCE(?, stage)
        WHERE id = ?
      `).run(home_team_id || null, away_team_id || null, scheduled_time || null, stage || null, match_id);

      logActivity('UPDATE_KNOCKOUT_FIXTURE', `Updated knockout match #${match_id}`, admin.username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

