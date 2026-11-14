import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function makeRoom(now: number): void {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  // Still full of live buckets: drop the oldest (Map keeps insertion order) so memory stays bounded.
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

/**
 * Fixed-window in-memory limiter. Good enough for a single-instance deployment;
 * swap for a shared store (Redis) when running several instances.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (!current && buckets.size >= MAX_BUCKETS) makeRoom(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return current.count <= limit
    ? { ok: true, retryAfterSeconds: 0 }
    : { ok: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
}

/**
 * Client identifier for rate limiting.
 * X-Forwarded-For is attacker-controlled unless a trusted reverse proxy sets it, so it is only
 * honoured when TRUST_PROXY=true, and then only its right-most entry (the hop our proxy observed).
 * Without a trusted proxy every client shares one bucket; the per-username and global login
 * limits still bound brute-force and CPU cost.
 */
export function clientIp(headers: Headers): string {
  if (process.env.TRUST_PROXY !== "true") return "local";
  const hops = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (hops && hops.length > 0) return hops[hops.length - 1];
  return headers.get("x-real-ip") ?? "local";
}
