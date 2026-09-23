import 'server-only';

import { getDb } from '@/lib/firebase/server';
import {
  CLOUD_RENDER_MONTHLY_CAPS,
  LOCAL_RENDER_MONTHLY_CAPS,
  resolveRenderTier,
} from '@/lib/song-generation/entitlements';
import type { User } from '@/lib/types';

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function getRenderUsage(uid: string, key = monthKey()) {
  const db = await getDb();
  const ref = db.doc(`users/${uid}/renderUsage/${key}`);
  const snap = await ref.get();
  const data = snap.data() || {};
  return {
    localRenders: typeof data.localRenders === 'number' ? data.localRenders : 0,
    cloudRenders: typeof data.cloudRenders === 'number' ? data.cloudRenders : 0,
    cloudPassesUsed: typeof data.cloudPassesUsed === 'number' ? data.cloudPassesUsed : 0,
  };
}

function isDevRenderQuotaBypassed(): boolean {
  return (
    process.env.NODE_ENV === 'development' && process.env.RENDER_DEV_AUTO_WORKER === 'true'
  );
}

export async function assertRenderQuota(
  uid: string,
  user: Pick<User, 'subscriptionStatus' | 'subscriptionProduct' | 'proFeaturePreviewExpiresAt'>,
  route: 'local' | 'cloud'
): Promise<void> {
  if (isDevRenderQuotaBypassed()) return;
  const tier = resolveRenderTier(user);
  const usage = await getRenderUsage(uid);
  if (route === 'local' && usage.localRenders >= LOCAL_RENDER_MONTHLY_CAPS[tier]) {
    throw new Response(JSON.stringify({ error: 'Local render monthly cap reached.' }), {
      status: 429,
    });
  }
  if (route === 'cloud' && usage.cloudRenders >= CLOUD_RENDER_MONTHLY_CAPS[tier]) {
    throw new Response(JSON.stringify({ error: 'Cloud render monthly cap reached.' }), {
      status: 429,
    });
  }
}

export async function decrementRenderUsage(
  uid: string,
  route: 'local' | 'cloud',
  cloudPass = false
): Promise<void> {
  const db = await getDb();
  const key = monthKey();
  const ref = db.doc(`users/${uid}/renderUsage/${key}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const localRenders = Math.max(
      0,
      (typeof data.localRenders === 'number' ? data.localRenders : 0) - (route === 'local' ? 1 : 0)
    );
    const cloudRenders = Math.max(
      0,
      (typeof data.cloudRenders === 'number' ? data.cloudRenders : 0) - (route === 'cloud' ? 1 : 0)
    );
    const cloudPassesUsed = Math.max(
      0,
      (typeof data.cloudPassesUsed === 'number' ? data.cloudPassesUsed : 0) - (cloudPass ? 1 : 0)
    );
    tx.set(
      ref,
      { localRenders, cloudRenders, cloudPassesUsed, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  });
}

export async function incrementRenderUsage(
  uid: string,
  route: 'local' | 'cloud',
  cloudPass = false
): Promise<void> {
  if (isDevRenderQuotaBypassed()) return;
  const db = await getDb();
  const key = monthKey();
  const ref = db.doc(`users/${uid}/renderUsage/${key}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const localRenders = (typeof data.localRenders === 'number' ? data.localRenders : 0) + (route === 'local' ? 1 : 0);
    const cloudRenders = (typeof data.cloudRenders === 'number' ? data.cloudRenders : 0) + (route === 'cloud' ? 1 : 0);
    const cloudPassesUsed =
      (typeof data.cloudPassesUsed === 'number' ? data.cloudPassesUsed : 0) + (cloudPass ? 1 : 0);
    tx.set(
      ref,
      { localRenders, cloudRenders, cloudPassesUsed, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  });
}
