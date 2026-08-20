import 'server-only';

import { getDb } from '@/lib/firebase/server';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { isMasterAdminEmail } from '@/lib/server/master-admin';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';
import { getSceneLivePublic } from '@/lib/server/scene-live';

function normalizeLockId(lockId: string): string {
  const id = (lockId || '').trim();
  return id === 'house' || !id ? LOCK_HOUSE_ID : id;
}

/** House bar of the day is live on The Scene (independent of LOCK System kill switch). */
export async function isHouseBarLive(): Promise<boolean> {
  try {
    const live = await getSceneLivePublic();
    return Boolean(live.houseBar.enabled && live.houseBar.seedBar.trim());
  } catch {
    return false;
  }
}

/**
 * LOCK APIs are available when the LOCK System is on,
 * or when this is the house cast and House bar of the day is pinned.
 */
export async function canAccessLockApi(lockId: string): Promise<boolean> {
  if (await isLockFeatureEnabled()) return true;
  const id = normalizeLockId(lockId);
  if (id !== LOCK_HOUSE_ID) return false;
  return isHouseBarLive();
}

/** Master admin email or Firestore users/{uid}.role === admin. */
export async function isStudioAdminUser(input: {
  uid: string;
  email?: string | null;
}): Promise<boolean> {
  if (isMasterAdminEmail(input.email)) return true;
  try {
    const db = await getDb();
    const snap = await db.doc(`users/${input.uid}`).get();
    return Boolean(snap.exists && snap.data()?.role === 'admin');
  } catch {
    return false;
  }
}
