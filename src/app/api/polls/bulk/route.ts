import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { clientIp } from '@/lib/rateLimit';
import { getPollsState, hashVoterFp, MatchPollsResponse } from '@/lib/polls';
import db from '@/lib/db';
import { Match } from '@/lib/types';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'enscs_voter';

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
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
  });
}

/**
 * GET /api/polls/bulk?fp=HASH
 * Returns poll states for all matches that have an active poll:
 *   - upcoming matches (winner poll open)
 *   - recently finished matches within the MOTM window
 *   - finished matches with votes (closed results)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fp = searchParams.get('fp') || '';

    const { cid: voterCid, isNew } = resolveVoterCid(request);
    const ip = clientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const voterFp = fp ? hashVoterFp(ip, userAgent, fp) : null;

    // Get all matches that might have polls
    const matches = db
      .prepare(
        `SELECT id, status, home_team_id, away_team_id, stage, finished_at
         FROM matches
         WHERE (status = 'upcoming' AND home_team_id > 0 AND away_team_id > 0)
            OR status = 'live'
            OR status = 'finished'
         ORDER BY
           CASE status
             WHEN 'live' THEN 0
             WHEN 'upcoming' THEN 1
             WHEN 'finished' THEN 2
           END,
           scheduled_time ASC`
      )
      .all() as (Match & { finished_at?: number | null })[];

    const polls: MatchPollsResponse[] = [];

    for (const m of matches) {
      const state = getPollsState(m.id, voterCid, voterFp);
      if (!state) continue;
      polls.push(state);
    }

    const response = NextResponse.json({ polls });
    if (isNew) attachVoterCookie(response, voterCid);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bulk polls' },
      { status: 500 }
    );
  }
}

