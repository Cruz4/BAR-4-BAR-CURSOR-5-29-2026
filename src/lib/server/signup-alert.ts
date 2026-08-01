import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';

/**
 * Telegram + admin feed for a new artist — at most once per uid.
 * Fixes the race where usage-init / data-context create the user doc before
 * login's syncUserProfile, so `wasNew` was false and signup alerts never fired.
 */
export async function enqueueSignupAlertOnce(input: {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  ref?: string | null;
  method?: string | null;
  guestId?: string | null;
  guestAlias?: string | null;
  barsWritten?: number | null;
  assistsUsed?: number | null;
}): Promise<boolean> {
  const userId = input.userId?.trim();
  if (!userId) return false;

  if (hasAdminFirestoreCredentials()) {
    try {
      const db = await getDb();
      const summaryRef = db.doc(`users/${userId}/analytics/summary`);
      let shouldAlert = false;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(summaryRef);
        const data = snap.data() || {};
        if (data.signupAlertedAt) return;
        const now = new Date().toISOString();
        tx.set(
          summaryRef,
          {
            signupAlertedAt: now,
            signupAt: data.signupAt || now,
            ...(input.guestId ? { guestId: input.guestId } : {}),
            ...(input.guestAlias ? { guestAlias: input.guestAlias } : {}),
            updatedAt: now,
          },
          { merge: true }
        );
        shouldAlert = true;
      });
      if (!shouldAlert) return false;
    } catch (error) {
      console.warn('[enqueueSignupAlertOnce] dedupe failed, alerting anyway:', (error as Error).message);
    }
  }

  const tryBits: string[] = [];
  if (typeof input.barsWritten === 'number') {
    tryBits.push(`${input.barsWritten} bar${input.barsWritten === 1 ? '' : 's'}`);
  }
  if (typeof input.assistsUsed === 'number') {
    tryBits.push(`${input.assistsUsed} assist${input.assistsUsed === 1 ? '' : 's'}`);
  }

  await enqueueAdminAlert({
    kind: 'signup',
    userId,
    userEmail: input.userEmail ?? null,
    userName: input.userName ?? null,
    ref: input.ref ?? null,
    method: input.method ?? null,
    guestId: input.guestId ?? null,
    guestAlias: input.guestAlias ?? null,
    detail: tryBits.length ? `try sheet: ${tryBits.join(' · ')}` : null,
  });
  return true;
}
