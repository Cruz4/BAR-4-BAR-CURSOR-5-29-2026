'use server';

import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { initializeUserUsage } from '@/lib/server/usage-init';

export async function initUserUsageAction(
  idToken: string,
  userId: string
): Promise<{ ok: boolean }> {
  try {
    if (!hasAdminFirestoreCredentials()) {
      console.error('[initUserUsageAction] Admin Firestore credentials missing');
      return { ok: false };
    }
    await initializeUserUsage(idToken, userId);
    return { ok: true };
  } catch (error) {
    console.warn('[initUserUsageAction] skipped:', (error as Error).message);
    return { ok: false };
  }
}
