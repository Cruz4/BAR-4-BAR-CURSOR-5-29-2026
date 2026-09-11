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

function incrementMemoryWindow(
  key: string,
  delta: number,
  max: number,
  windowMs: number
): { count: number; crossed: boolean } {
  const now = Date.now();
  const amount = Math.max(0, delta);
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: amount, resetAt: now + windowMs });
    return { count: amount, crossed: amount > max };
  }

  const previous = entry.count;
  entry.count += amount;
  return { count: entry.count, crossed: previous <= max && entry.count > max };
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

/** Add `delta` to a shared window (Ink spent, signup count). `crossed` is the first time count exceeds max. */
export async function incrementWindowCount(
  key: string,
  delta: number,
  max: number,
  windowMs: number
): Promise<{ count: number; crossed: boolean }> {
  if (!hasAdminFirestoreCredentials()) {
    return incrementMemoryWindow(key, delta, max, windowMs);
  }

  const now = Date.now();
  const amount = Math.max(0, delta);
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
        tx.set(ref, { count: amount, resetAt: now + windowMs, updatedAt: now });
        return { count: amount, crossed: amount > max };
      }

      const nextCount = count + amount;
      tx.set(ref, { count: nextCount, resetAt, updatedAt: now }, { merge: true });
      return { count: nextCount, crossed: count <= max && nextCount > max };
    });
  } catch (error) {
    console.warn('[rate-limit] increment unavailable; using local fallback', error);
    return incrementMemoryWindow(key, delta, max, windowMs);
  }
}
