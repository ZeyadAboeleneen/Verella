import "server-only";
import { headers } from "next/headers";

/**
 * In-memory fixed-window rate limiter. Sufficient for a single Node instance
 * (Phase 1 deployment target — see docs/SETUP.md). If this app is ever run
 * as multiple instances behind a load balancer, swap the Map for a shared
 * store (Redis `INCR` + `EXPIRE` is the standard pattern) so limits are
 * enforced across instances instead of per-process.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup so the Map doesn't grow unbounded over a long-running process.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();
function cleanupIfDue() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Returns true if the action is allowed, false if the caller has exceeded
 * `limit` attempts within `windowMs`. Keys by action name + identifier
 * (typically IP, sometimes IP+email for tighter per-account limits).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  cleanupIfDue();
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function enforceRateLimit(
  action: string,
  limit: number,
  windowMs: number,
  extraKey?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await getClientIp();
  const key = extraKey ? `${action}:${ip}:${extraKey}` : `${action}:${ip}`;
  const allowed = checkRateLimit(key, limit, windowMs);
  if (!allowed) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }
  return { ok: true };
}
