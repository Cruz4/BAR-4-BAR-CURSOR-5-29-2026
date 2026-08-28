import 'server-only';

import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import {
  isSafeShareTargetPath,
  mintShareCampaignCode,
  normalizeShareCampaignCode,
  type ShareCampaignKind,
  type ShareCampaignPublic,
} from '@/lib/share-attribution';
import {
  assertMutationsAllowed,
  getProductSurfaces,
  ProductSurfacesMutationBlockedError,
} from '@/lib/server/product-surfaces';

const COLLECTION = 'shareCampaigns';

export type ShareCampaignDoc = ShareCampaignPublic & {
  ownerId: string;
  createdAt: string;
  openCount: number;
};

export class ShareAttributionError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ShareAttributionError';
    this.status = status;
  }
}

function mapPublic(code: string, data: Record<string, unknown>): ShareCampaignPublic | null {
  const kind =
    data.kind === 'release' || data.kind === 'profile' || data.kind === 'achievement'
      ? data.kind
      : null;
  const targetPath = typeof data.targetPath === 'string' ? data.targetPath : '';
  if (!kind || !isSafeShareTargetPath(targetPath)) return null;
  return {
    code,
    kind,
    targetPath,
    title: typeof data.title === 'string' ? data.title.slice(0, 120) : undefined,
    channel: typeof data.channel === 'string' ? data.channel.slice(0, 40) : undefined,
  };
}

async function unusedCode(db: Firestore): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code =
      attempt < 4
        ? mintShareCampaignCode(10)
        : randomBytes(8).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    const normalized = normalizeShareCampaignCode(code);
    if (!normalized) continue;
    if (!(await db.collection(COLLECTION).doc(normalized).get()).exists) return normalized;
  }
  throw new ShareAttributionError('Could not reserve a campaign code. Try again.', 500);
}

export async function createShareCampaign(input: {
  ownerId: string;
  kind: ShareCampaignKind;
  targetPath: string;
  title?: string;
  channel?: string;
}): Promise<ShareCampaignDoc> {
  const surfaces = await getProductSurfaces();
  if (surfaces.sharing !== 'v2') {
    throw new ShareAttributionError('Share Studio is not enabled.', 403);
  }
  try {
    await assertMutationsAllowed();
  } catch (error) {
    if (error instanceof ProductSurfacesMutationBlockedError) {
      throw new ShareAttributionError(error.message, 503);
    }
    throw error;
  }

  if (!input.ownerId?.trim()) {
    throw new ShareAttributionError('Sign in required.', 401);
  }
  if (!isSafeShareTargetPath(input.targetPath)) {
    throw new ShareAttributionError('Invalid share target.');
  }

  const db = await getDb();
  const code = await unusedCode(db);
  const now = new Date().toISOString();
  const doc: ShareCampaignDoc = {
    code,
    ownerId: input.ownerId,
    kind: input.kind,
    targetPath: input.targetPath,
    title: input.title?.trim().slice(0, 120) || undefined,
    channel: input.channel?.trim().slice(0, 40) || undefined,
    createdAt: now,
    openCount: 0,
  };

  await db.collection(COLLECTION).doc(code).set(doc);
  return doc;
}

export async function resolveShareCampaign(
  rawCode: string
): Promise<ShareCampaignPublic | null> {
  const code = normalizeShareCampaignCode(rawCode);
  if (!code) return null;

  const surfaces = await getProductSurfaces();
  if (surfaces.sharing === 'off') return null;

  const db = await getDb();
  const snap = await db.collection(COLLECTION).doc(code).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  const publicCampaign = mapPublic(code, data);
  if (!publicCampaign) return null;

  // Soft open counter — best-effort, ignore failures
  try {
    await snap.ref.update({ openCount: FieldValue.increment(1) });
  } catch {
    /* ignore */
  }

  return publicCampaign;
}
