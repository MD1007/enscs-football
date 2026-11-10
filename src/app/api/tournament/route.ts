import { NextResponse } from 'next/server';
import { getFullTournamentData } from '@/lib/tournamentService';
import { getAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = getAdminFromRequest(request);
    const data = getFullTournamentData({ isAdmin: Boolean(admin) });
    return NextResponse.json({ ...data, server_time: Date.now() });
  } catch (error: any) {
    console.error('Error fetching tournament data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
  }
}

