import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { autoPopulateKnockoutStage, resetKnockoutStage, unfinishedGroupMatches } from '@/lib/tournamentService';
import db, { logActivity } from '@/lib/db';

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Playoff first, then the semi-final draw. Refused while group matches remain.
    if (body.action === 'auto_populate' || body.action === 'random_draw') {
      try {
        return NextResponse.json(autoPopulateKnockoutStage(admin.username));
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Could not advance the knockout stage' }, { status: 400 });
      }
    }

    if (body.action === 'reset') {
      return NextResponse.json(resetKnockoutStage(admin.username));
    }

    if (body.action === 'update_fixture') {
      const { match_id, home_team_id, away_team_id, scheduled_time, stage } = body;
      const match = db.prepare('SELECT stage FROM matches WHERE id = ?').get(match_id) as { stage: string } | undefined;
      if (!match || match.stage === 'group') {
        return NextResponse.json({ error: 'Not a knockout fixture' }, { status: 400 });
      }
      // Teams can only be placed in knockout fixtures once the group stage is over.
      if ((home_team_id || away_team_id) && unfinishedGroupMatches() > 0) {
        return NextResponse.json(
          { error: 'The group stage is not finished yet: knockout teams cannot be set.' },
          { status: 400 }
        );
      }
      const allowedStages = ['playoff', 'semi_final', 'third_place', 'final'];
      db.prepare(`
        UPDATE matches
        SET home_team_id = ?,
            away_team_id = ?,
            scheduled_time = COALESCE(?, scheduled_time),
            stage = COALESCE(?, stage)
        WHERE id = ?
      `).run(
        home_team_id || null,
        away_team_id || null,
        scheduled_time || null,
        allowedStages.includes(stage) ? stage : null,
        match_id
      );

      logActivity('UPDATE_KNOCKOUT_FIXTURE', `Updated knockout match #${match_id}`, admin.username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
