import 'server-only';

import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

const WINDOW_MS = 48 * 60 * 60 * 1000;

function hashIp(ip: string): string {
  return createHash('sha256').update(ip.trim()).digest('hex');
}

export function resolveClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  return realIp || null;
}

export async function isReferralIpAllowed(db: Firestore, ip: string | null): Promise<boolean> {
  if (!ip) return true;
  const ref = db.collection('referralIpWindows').doc(hashIp(ip));
  const snap = await ref.get();
  const lastAt = snap.data()?.lastClaimAt as string | undefined;
  if (!lastAt) return true;
  return Date.now() - new Date(lastAt).getTime() >= WINDOW_MS;
}

export async function recordReferralIpClaim(db: Firestore, ip: string | null): Promise<void> {
  if (!ip) return;
  await db.collection('referralIpWindows').doc(hashIp(ip)).set(
    { lastClaimAt: new Date().toISOString(), ipHash: hashIp(ip) },
    { merge: true }
  );
}
