import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { clientIp } from '@/lib/rateLimit';
import { getAdminFromRequest } from '@/lib/auth';
import { getPollsState, recordVote, resetPoll, hashVoterFp } from '@/lib/polls';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'enscs_voter';
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function resolveVoterCid(request: NextRequest): { cid: string; isNew: boolean } {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  if (existing && /^[a-f0-9]{64}$/i.test(existing)) {
    return { cid: existing, isNew: false };
  }
  const newCid = crypto.randomBytes(32).toString('hex');
  return { cid: newCid, isNew: true };
}

function attachVoterCookie(response: NextResponse, cid: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: cid,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchIdStr = searchParams.get('match_id');
    const fp = searchParams.get('fp') || '';

    if (!matchIdStr) {
      return NextResponse.json({ error: 'match_id parameter is required' }, { status: 400 });
    }

    const matchId = parseInt(matchIdStr, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match_id' }, { status: 400 });
    }

    const { cid: voterCid, isNew } = resolveVoterCid(request);
    const ip = clientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const voterFp = fp ? hashVoterFp(ip, userAgent, fp) : null;

    const data = getPollsState(matchId, voterCid, voterFp);
    if (!data) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const response = NextResponse.json(data);
    if (isNew) {
      attachVoterCookie(response, voterCid);
    }
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch polls' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { match_id, poll, choice, fp } = body;
    if (!match_id || !poll || !choice) {
      return NextResponse.json({ error: 'match_id, poll, and choice are required' }, { status: 400 });
    }

    const matchId = parseInt(String(match_id), 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match_id' }, { status: 400 });
    }

    const { cid: voterCid, isNew } = resolveVoterCid(request);
    const ip = clientIp(request);
    const userAgent = request.headers.get('user-agent') || '';

    const result = recordVote({
      matchId,
      poll,
      choice: String(choice),
      voterCid,
      clientFp: String(fp || ''),
      clientIp: ip,
      userAgent,
    });

    if (!result.success) {
      const response = NextResponse.json({ error: result.error || 'Vote rejected' }, { status: result.status });
      if (isNew) attachVoterCookie(response, voterCid);
      return response;
    }

    // Return the updated state for convenience
    const voterFp = hashVoterFp(ip, userAgent, String(fp || ''));
    const updatedState = getPollsState(matchId, voterCid, voterFp);

    const response = NextResponse.json({
      success: true,
      message: 'Vote recorded',
      poll,
      choice,
      state: updatedState,
    });
    if (isNew) attachVoterCookie(response, voterCid);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record vote' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchIdStr = searchParams.get('match_id');
    const poll = searchParams.get('poll') || 'all';

    if (!matchIdStr) {
      return NextResponse.json({ error: 'match_id parameter is required' }, { status: 400 });
    }

    const matchId = parseInt(matchIdStr, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match_id' }, { status: 400 });
    }

    const res = resetPoll(matchId, poll, admin.username);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reset poll' }, { status: 500 });
  }
}

