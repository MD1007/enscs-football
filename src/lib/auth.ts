import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

import crypto from 'crypto';

const COOKIE_NAME = 'enscs_admin_token';

// SHA-256 fingerprints of signing secrets that were once published in this
// repository (docs, config, old source). Anyone could use them to forge an
// admin session, so they are never accepted, even if still configured.
const PUBLISHED_SECRET_FINGERPRINTS = new Set([
  '7597bc59b41c2b6be9c1ce3e5353e1702a59262a76f8eec67c5decb4eb424a15',
  '122d1b09f2686d4885170632814fef0207d53ccd9973edb616ba4a3b611e71d0',
  'db40cf0c61cdea8c24844d46302aa00b3af2c1a0a9f2cf746df366c48d82f2cf',
  '12a042c63e7ca79300c9f88b5a08bd75bf2c99e282b430837369656c17d5eec9',
]);

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Session signing secret, resolved once per process:
 *  1. JWT_SECRET, unless it is missing or one of the published values;
 *  2. otherwise a secret derived from other private server settings, so it
 *     stays stable across restarts without extra configuration;
 *  3. otherwise a random secret (admins simply log in again after a restart).
 */
function resolveJwtSecret(): string {
  const configured = process.env.JWT_SECRET || '';
  if (configured && !PUBLISHED_SECRET_FINGERPRINTS.has(sha256(configured))) {
    return configured;
  }

  const privateMaterial = [process.env.ADMIN_PASSWORD, process.env.GITHUB_BACKUP_TOKEN].filter(Boolean).join('|');
  if (privateMaterial) {
    return crypto.createHmac('sha256', privateMaterial).update('enscs-admin-session-v1').digest('hex');
  }

  return crypto.randomBytes(48).toString('hex');
}

const g = globalThis as unknown as { __enscsJwtSecret?: string };
const JWT_SECRET = g.__enscsJwtSecret || (g.__enscsJwtSecret = resolveJwtSecret());

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

