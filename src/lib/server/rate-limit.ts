import 'server-only';

import { createHash } from 'crypto';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function checkMemoryRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > max) {
    return { allowed: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }

  return { allowed: true };
}

/**
 * Shared fixed-window limiter. Production counters live in Firestore so Cloud
 * Run instances enforce one limit; local development falls back to memory.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  if (!hasAdminFirestoreCredentials()) {
    return checkMemoryRateLimit(key, max, windowMs);
  }

  const now = Date.now();
  const documentId = createHash('sha256').update(key).digest('hex');

  try {
    const db = await getDb();
    const ref = db.doc(`rate_limits/${documentId}`);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      const resetAt = Number(data.resetAt || 0);
      const count = Number(data.count || 0);

      if (!snap.exists || now >= resetAt) {
        tx.set(ref, { count: 1, resetAt: now + windowMs, updatedAt: now });
        return { allowed: true };
      }

      const nextCount = count + 1;
      tx.set(ref, { count: nextCount, resetAt, updatedAt: now }, { merge: true });
      if (nextCount > max) {
        return { allowed: false, retryAfterMs: Math.max(0, resetAt - now) };
      }
      return { allowed: true };
    });
  } catch (error) {
    console.warn('[rate-limit] shared counter unavailable; using local fallback', error);
    return checkMemoryRateLimit(key, max, windowMs);
  }
}
