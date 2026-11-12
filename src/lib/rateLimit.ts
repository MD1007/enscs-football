// Small in-memory rate limiter (per server process). Good enough for one
// instance: it slows password guessing and scripted vote flooding.

type Bucket = { count: number; resetAt: number };

const g = globalThis as unknown as { __enscsRateBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = g.__enscsRateBuckets || (g.__enscsRateBuckets = new Map());

function current(key: string, now: number): Bucket | null {
  const b = buckets.get(key);
  if (!b) return null;
  if (b.resetAt <= now) {
    buckets.delete(key);
    return null;
  }
  return b;
}

/** Seconds until the key is allowed again, or 0 when it is not blocked. */
export function blockedFor(key: string, limit: number): number {
  const now = Date.now();
  const b = current(key, now);
  return b && b.count >= limit ? Math.ceil((b.resetAt - now) / 1000) : 0;
}

/** Counts one event against the key; the window starts at the first event. */
export function recordHit(key: string, windowMs: number): number {
  const now = Date.now();
  const b = current(key, now);
  if (b) {
    b.count += 1;
    return b.count;
  }
  buckets.set(key, { count: 1, resetAt: now + windowMs });
  // Keep the map from growing without bound.
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => {
      if (v.resetAt <= now) buckets.delete(k);
    });
  }
  return 1;
}

export function clearHits(key: string) {
  buckets.delete(key);
}

/** Visitor address as seen through the hosting proxy. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'local';
}
