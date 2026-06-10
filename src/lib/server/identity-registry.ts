import 'server-only';

import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

export const IDENTITY_REGISTRY_COLLECTION = 'identityRegistry';

export type IdentityRegistryDoc = {
  emailHash: string;
  welcomeInkGrantedAt?: string | null;
  welcomeInkGrantedToUid?: string | null;
  trialGrantedAt?: string | null;
  trialGrantedToUid?: string | null;
  lastDeletedAt?: string | null;
  lastDeletedUid?: string | null;
  deleteCount?: number;
  updatedAt: string;
};

export type IdentityEntitlements = {
  emailHash: string | null;
  welcomeInkEligible: boolean;
  trialEligible: boolean;
};

export type SignupEntitlementReservation = {
  welcomeInk: number;
  trialInk: number;
  returningIdentity: boolean;
};

function registrySecret(): string {
  return (
    process.env.IDENTITY_REGISTRY_SECRET?.trim() ||
    process.env.INVITE_GATE_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim()?.slice(0, 32) ||
    'b4b-dev-identity-registry-secret-change-me'
  );
}

export function normalizeIdentityEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashIdentityEmail(email: string): string {
  const normalized = normalizeIdentityEmail(email);
  return createHash('sha256')
    .update(`${registrySecret()}:${normalized}`)
    .digest('hex');
}

function registryRef(db: Firestore, emailHash: string) {
  return db.collection(IDENTITY_REGISTRY_COLLECTION).doc(emailHash);
}

export async function loadIdentityEntitlements(
  db: Firestore,
  email: string | null | undefined
): Promise<IdentityEntitlements> {
  if (!email?.trim()) {
    return { emailHash: null, welcomeInkEligible: true, trialEligible: true };
  }

  const emailHash = hashIdentityEmail(email);
  const snap = await registryRef(db, emailHash).get();
  const data = snap.data() as IdentityRegistryDoc | undefined;

  return {
    emailHash,
    welcomeInkEligible: !data?.welcomeInkGrantedAt,
    trialEligible: !data?.trialGrantedAt,
  };
}

/**
 * Atomically reserve one-time welcome Ink and trial grants for a new account.
 * Returns zero amounts when the normalized email already consumed those entitlements.
 */
export async function reserveSignupEntitlements(
  db: Firestore,
  email: string,
  userId: string,
  opts: {
    welcomeInkAmount: number;
    trialInkAmount: number;
    wantsTrial: boolean;
  }
): Promise<SignupEntitlementReservation> {
  const emailHash = hashIdentityEmail(email);
  const ref = registryRef(db, emailHash);
  const now = new Date().toISOString();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data() as IdentityRegistryDoc | undefined;

    const welcomeEligible = !existing?.welcomeInkGrantedAt;
    const trialEligible = !existing?.trialGrantedAt;
    const grantWelcome = welcomeEligible && opts.welcomeInkAmount > 0;
    const grantTrial =
      trialEligible && opts.wantsTrial && opts.trialInkAmount > 0;

    const patch: IdentityRegistryDoc = {
      emailHash,
      updatedAt: now,
    };

    if (grantWelcome) {
      patch.welcomeInkGrantedAt = now;
      patch.welcomeInkGrantedToUid = userId;
    } else if (existing?.welcomeInkGrantedAt) {
      patch.welcomeInkGrantedAt = existing.welcomeInkGrantedAt;
      patch.welcomeInkGrantedToUid = existing.welcomeInkGrantedToUid ?? null;
    }

    if (grantTrial) {
      patch.trialGrantedAt = now;
      patch.trialGrantedToUid = userId;
    } else if (existing?.trialGrantedAt) {
      patch.trialGrantedAt = existing.trialGrantedAt;
      patch.trialGrantedToUid = existing.trialGrantedToUid ?? null;
    }

    if (existing?.lastDeletedAt) patch.lastDeletedAt = existing.lastDeletedAt;
    if (existing?.lastDeletedUid) patch.lastDeletedUid = existing.lastDeletedUid;
    if (typeof existing?.deleteCount === 'number') patch.deleteCount = existing.deleteCount;

    tx.set(ref, patch, { merge: true });

    return {
      welcomeInk: grantWelcome ? opts.welcomeInkAmount : 0,
      trialInk: grantTrial ? opts.trialInkAmount : 0,
      returningIdentity: !welcomeEligible || (opts.wantsTrial && !trialEligible),
    };
  });
}

/** Persist entitlement consumption when an account is self-deleted or eradicated. */
export async function writeIdentityTombstone(
  db: Firestore,
  email: string,
  userId: string,
  flags: { hadWelcomeInk: boolean; hadTrial: boolean }
): Promise<void> {
  if (!email.trim()) return;

  const emailHash = hashIdentityEmail(email);
  const ref = registryRef(db, emailHash);
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.data() as IdentityRegistryDoc | undefined;

    const patch: IdentityRegistryDoc = {
      emailHash,
      updatedAt: now,
      lastDeletedAt: now,
      lastDeletedUid: userId,
      deleteCount: (existing?.deleteCount ?? 0) + 1,
    };

    if (flags.hadWelcomeInk && !existing?.welcomeInkGrantedAt) {
      patch.welcomeInkGrantedAt = now;
      patch.welcomeInkGrantedToUid = userId;
    } else if (existing?.welcomeInkGrantedAt) {
      patch.welcomeInkGrantedAt = existing.welcomeInkGrantedAt;
      patch.welcomeInkGrantedToUid = existing.welcomeInkGrantedToUid ?? null;
    }

    if (flags.hadTrial && !existing?.trialGrantedAt) {
      patch.trialGrantedAt = now;
      patch.trialGrantedToUid = userId;
    } else if (existing?.trialGrantedAt) {
      patch.trialGrantedAt = existing.trialGrantedAt;
      patch.trialGrantedToUid = existing.trialGrantedToUid ?? null;
    }

    tx.set(ref, patch, { merge: true });
  });
}
