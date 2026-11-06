import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { getActivityLogs } from '@/lib/tournamentService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = getActivityLogs(100);
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

