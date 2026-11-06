import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'enscs-football-tournament-2026-super-secret-key-1337';
const COOKIE_NAME = 'enscs_admin_token';

export interface AdminPayload {
  id: number;
  username: string;
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch (error) {
    return null;
  }
}

export function getAdminFromRequest(request: Request): AdminPayload | null {
  // Check authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAdminToken(token);
    if (payload) return payload;
  }

  // Check cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match) {
      const token = decodeURIComponent(match[1]);
      return verifyAdminToken(token);
    }
  }

  return null;
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  try {
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    if (!tokenCookie?.value) return null;
    return verifyAdminToken(tokenCookie.value);
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

