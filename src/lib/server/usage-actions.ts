'use server';

import { initializeUserUsage } from '@/lib/server/usage-init';

export async function initUserUsageAction(
  idToken: string,
  userId: string
): Promise<{ ok: boolean }> {
  try {
    await initializeUserUsage(idToken, userId);
    return { ok: true };
  } catch (error) {
    console.warn('[initUserUsageAction] skipped:', (error as Error).message);
    return { ok: false };
  }
}
