import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { getPersistenceStatus, backupIfChanged } from '@/lib/persistence';

export const dynamic = 'force-dynamic';

// Cloud backup status for the admin dashboard.
export async function GET(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(getPersistenceStatus());
}

// "Save now": forces an immediate backup attempt.
export async function POST(request: Request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const saved = await backupIfChanged();
  return NextResponse.json({ saved, ...getPersistenceStatus() });
}
