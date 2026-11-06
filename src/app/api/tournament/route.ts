import { NextResponse } from 'next/server';
import { getFullTournamentData } from '@/lib/tournamentService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getFullTournamentData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching tournament data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch data' }, { status: 500 });
  }
}

