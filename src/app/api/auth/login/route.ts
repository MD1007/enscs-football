import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { signAdminToken, COOKIE_NAME } from '@/lib/auth';
import { blockedFor, recordHit, clearHits, clientIp } from '@/lib/rateLimit';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
// Hash of a random string: compared against when the username does not exist.
const DUMMY_HASH = bcrypt.hashSync(Math.random().toString(36) + Date.now(), 10);

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Login protection: after too many wrong attempts from one address, that
    // address must wait. (Per address, not per username, so nobody can lock
    // the real admin out by guessing against the admin's name.)
    const ip = clientIp(request);
    const ipKey = `login:${ip}`;
    const wait = blockedFor(ipKey, MAX_FAILED_LOGINS);
    if (wait > 0) {
      const minutes = Math.ceil(wait / 60);
      return NextResponse.json(
        { error: `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      );
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(String(username)) as any;
    // Always run a hash comparison so a wrong username takes as long as a wrong password.
    const passwordMatch = bcrypt.compareSync(String(password), admin?.password_hash || DUMMY_HASH);

    if (!admin || !passwordMatch) {
      const failures = recordHit(ipKey, LOCKOUT_WINDOW_MS);
      // A burst of failures from many addresses slows every further guess down.
      if (recordHit('login:all', LOCKOUT_WINDOW_MS) > 40) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      const left = Math.max(0, MAX_FAILED_LOGINS - failures);
      return NextResponse.json(
        {
          error:
            left > 0
              ? `Invalid credentials (${left} attempt${left === 1 ? '' : 's'} left before a 15-minute pause)`
              : 'Too many wrong attempts. Try again in 15 minutes.',
        },
        { status: left > 0 ? 401 : 429 }
      );
    }

    clearHits(ipKey);

    const token = signAdminToken({ id: admin.id, username: admin.username });

    const response = NextResponse.json({
      success: true,
      user: { id: admin.id, username: admin.username },
      token,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

