import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import db, { logActivity, initDatabase } from '@/lib/db';

export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { confirmation } = await request.json();
    if (confirmation !== 'RESET_ENSCS_TOURNAMENT') {
      return NextResponse.json(
        { error: 'Confirmation phrase must match "RESET_ENSCS_TOURNAMENT"' },
        { status: 400 }
      );
    }

    // Wipe tables and re-initialize
    db.exec(`
      DELETE FROM match_events;
      DELETE FROM matches;
      DELETE FROM players;
      DELETE FROM teams;
      DELETE FROM tournament_rules;
      DELETE FROM tournament_settings;
    `);

    // Re-seed
    initDatabase();

    logActivity('RESET_TOURNAMENT', 'Entire tournament reset to original seeded schedule and rosters', admin.username);

    return NextResponse.json({ success: true, message: 'Tournament successfully reset.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

