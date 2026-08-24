import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { UploadKind } from '@/lib/upload-gate-types';
import { isProUser } from '@/lib/subscription';
import { getDb } from '@/lib/firebase/server';

const TICKET_TTL_MS = 10 * 60 * 1000;

type QuotaSpec = { free: number; pro: number };

const DAILY_QUOTAS: Record<UploadKind, QuotaSpec> = {
  wall_image: { free: 25, pro: 120 },
  voice: { free: 30, pro: 150 },
  drop_audio: { free: 12, pro: 60 },
  sheet_take: { free: 40, pro: 200 },
  profile_preview: { free: 20, pro: 100 },
};

const MAX_BYTES: Record<UploadKind, number> = {
  wall_image: 8 * 1024 * 1024,
  voice: 5 * 1024 * 1024,
  drop_audio: 40 * 1024 * 1024,
  sheet_take: 12 * 1024 * 1024,
  profile_preview: 12 * 1024 * 1024,
};

const CONTENT_TYPE_PATTERN: Record<UploadKind, string> = {
  wall_image: 'image/.*',
  voice: 'audio/.*',
  drop_audio: 'audio/.*',
  sheet_take: 'audio/.*',
  profile_preview: 'audio/.*',
};

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function pathPrefixForKind(kind: UploadKind, uid: string): string {
  switch (kind) {
    case 'wall_image':
      return `wall/${uid}/`;
    case 'voice':
      return `voice/${uid}/`;
    case 'drop_audio':
      return `drops/${uid}/`;
    case 'sheet_take':
      return `sheet-takes/${uid}/`;
    case 'profile_preview':
      return `profile-previews/${uid}/`;
  }
}

export function assertOwnedStoragePath(kind: UploadKind, uid: string, storagePath: string): void {
  const clean = storagePath.trim();
  if (!clean || clean.length > 400 || clean.includes('..')) {
    throw new Error('Invalid storage path.');
  }
  const prefix = pathPrefixForKind(kind, uid);
  if (!clean.startsWith(prefix)) {
    throw new Error('Storage path must stay under your account folder.');
  }
}

export type IssueUploadTicketInput = {
  uid: string;
  kind: UploadKind;
  storagePath: string;
  byteSize: number;
  contentType: string;
  companionPath?: string;
  companionByteSize?: number;
};

export type IssuedUploadTicket = {
  ticketId: string;
  expiresAt: string;
};

export async function issueUploadTicket(input: IssueUploadTicketInput): Promise<IssuedUploadTicket> {
  const uid = input.uid;
  const kind = input.kind;
  const storagePath = input.storagePath.trim();
  const byteSize = Math.floor(Number(input.byteSize));
  const contentType = (input.contentType || '').trim();

  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    throw new Error('Invalid upload size.');
  }
  if (byteSize > MAX_BYTES[kind]) {
    throw new Error('File exceeds the maximum size for this upload type.');
  }
  if (!contentType) {
    throw new Error('Content type is required.');
  }

  assertOwnedStoragePath(kind, uid, storagePath);

  let companionPath: string | undefined;
  let companionByteSize: number | undefined;
  if (input.companionPath?.trim()) {
    companionPath = input.companionPath.trim();
    assertOwnedStoragePath(kind, uid, companionPath);
    companionByteSize = Math.floor(Number(input.companionByteSize ?? 0));
    if (!Number.isFinite(companionByteSize) || companionByteSize <= 0) {
      throw new Error('Invalid companion upload size.');
    }
    if (companionByteSize > 12 * 1024 * 1024) {
      throw new Error('Companion file is too large.');
    }
  }

  const db = await getDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    throw new Error('Account not found.');
  }
  const userData = userSnap.data() || {};
  if (userData.status === 'blocked') {
    throw new Error('This account cannot upload.');
  }

  const pro = isProUser({
    subscriptionStatus: userData.subscriptionStatus as 'active' | 'none' | undefined,
  });
  const limit = pro ? DAILY_QUOTAS[kind].pro : DAILY_QUOTAS[kind].free;
  const dayKey = utcDayKey();
  const quotaRef = db.doc(`users/${uid}/uploadQuota/${dayKey}`);

  await db.runTransaction(async (tx) => {
    const quotaSnap = await tx.get(quotaRef);
    const counts = (quotaSnap.data()?.counts as Record<string, number> | undefined) || {};
    const used = counts[kind] || 0;
    if (used >= limit) {
      throw new Error(`Daily ${kind.replace(/_/g, ' ')} upload limit reached. Try again tomorrow or upgrade to Pro.`);
    }
    tx.set(
      quotaRef,
      {
        dayKey,
        counts: { ...counts, [kind]: used + 1 },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  const ticketId = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = Timestamp.fromMillis(Date.now() + TICKET_TTL_MS);

  await db.doc(`users/${uid}/uploadTickets/${ticketId}`).set({
    kind,
    storagePath,
    maxBytes: byteSize,
    contentTypePattern: CONTENT_TYPE_PATTERN[kind],
    used: false,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    ...(companionPath
      ? {
          companionPath,
          companionMaxBytes: companionByteSize,
        }
      : {}),
  });

  return {
    ticketId,
    expiresAt: expiresAt.toDate().toISOString(),
  };
}

export async function completeUploadTicket(uid: string, ticketId: string): Promise<void> {
  const cleanId = ticketId.trim();
  if (!cleanId || cleanId.length > 80) {
    throw new Error('Invalid upload ticket.');
  }

  const db = await getDb();
  const ref = db.doc(`users/${uid}/uploadTickets/${cleanId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Upload ticket not found or expired.');
  }
  const data = snap.data() || {};
  if (data.used === true) return;

  await ref.update({
    used: true,
    completedAt: FieldValue.serverTimestamp(),
  });
}
