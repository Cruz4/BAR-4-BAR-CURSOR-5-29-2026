import 'server-only';

import { randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { FREESTYLE_BILL_AFTER_CHUNKS } from '@/lib/costs';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

const SESSION_IDLE_MS = 2 * 60 * 1000;
const SESSION_MAX_MS = 2 * 60 * 60 * 1000;

type SessionState = {
  startedAt: number;
  expiresAt: number;
  chunkCount: number;
  billed: boolean;
  billingReservationId?: string;
};

export type FreestyleChunkClaim = {
  shouldCharge: boolean;
  reservationId?: string;
};

const localSessions = new Map<string, SessionState>();

function nextSessionState(current: Partial<SessionState> | undefined, now: number) {
  const startedAt = Number(current?.startedAt || 0);
  const active =
    startedAt > 0 &&
    Number(current?.expiresAt || 0) > now &&
    now - startedAt < SESSION_MAX_MS;
  const base: SessionState = active
    ? {
        startedAt,
        expiresAt: now + SESSION_IDLE_MS,
        chunkCount: Math.max(0, Number(current?.chunkCount || 0)),
        billed: current?.billed === true,
        billingReservationId: current?.billingReservationId,
      }
    : {
        startedAt: now,
        expiresAt: now + SESSION_IDLE_MS,
        chunkCount: 0,
        billed: false,
      };

  base.chunkCount += 1;
  const shouldCharge = !base.billed && base.chunkCount >= FREESTYLE_BILL_AFTER_CHUNKS;
  const reservationId = shouldCharge ? randomUUID() : undefined;
  if (shouldCharge) {
    base.billed = true;
    base.billingReservationId = reservationId;
  }

  return { state: base, claim: { shouldCharge, reservationId } };
}

/** Claim the next audible transcription chunk from server-owned session state. */
export async function claimFreestyleChunk(userId: string): Promise<FreestyleChunkClaim> {
  const now = Date.now();
  if (!hasAdminFirestoreCredentials()) {
    const next = nextSessionState(localSessions.get(userId), now);
    localSessions.set(userId, next.state);
    return next.claim;
  }

  const db = await getDb();
  const ref = db.doc(`users/${userId}/aiSessions/freestyle`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = nextSessionState(snap.data() as Partial<SessionState> | undefined, now);
    tx.set(ref, { ...next.state, updatedAt: now });
    return next.claim;
  });
}

/** A failed paid model call is refunded by ai-gate, so make the next chunk billable again. */
export async function releaseFailedFreestyleCharge(
  userId: string,
  reservationId: string | undefined
): Promise<void> {
  if (!reservationId) return;

  if (!hasAdminFirestoreCredentials()) {
    const current = localSessions.get(userId);
    if (current?.billingReservationId === reservationId) {
      localSessions.set(userId, { ...current, billed: false, billingReservationId: undefined });
    }
    return;
  }

  const db = await getDb();
  const ref = db.doc(`users/${userId}/aiSessions/freestyle`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.data()?.billingReservationId !== reservationId) return;
    tx.set(
      ref,
      { billed: false, billingReservationId: FieldValue.delete(), updatedAt: Date.now() },
      { merge: true }
    );
  });
}
