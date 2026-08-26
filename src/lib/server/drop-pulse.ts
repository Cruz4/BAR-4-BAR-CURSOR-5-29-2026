import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { emitActivityEvent } from '@/lib/server/activity';
import type { DropPulseKind } from '@/lib/drop-pulse';

const SPIN_DEDUPE_MS = 6 * 60 * 60 * 1000;

function shareRef(db: Firestore, shareId: string) {
  return db.collection('shares').doc(shareId);
}

/** Count a preview or full spin. Deduped per viewer for 6h. Owner spins are ignored. */
export async function recordDropSpin(
  db: Firestore,
  input: {
    shareId: string;
    kind: DropPulseKind;
    viewerId?: string | null;
    dedupeKey?: string | null;
  }
): Promise<{ counted: boolean }> {
  const shareId = input.shareId.trim();
  if (!shareId) return { counted: false };

  const snap = await shareRef(db, shareId).get();
  if (!snap.exists) return { counted: false };
  const data = snap.data() || {};
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const viewerId = input.viewerId?.trim() || '';
  if (viewerId && ownerId && viewerId === ownerId) return { counted: false };

  const tickId = `${input.dedupeKey?.trim() || viewerId || 'anon'}_${input.kind}`;
  const tickRef = shareRef(db, shareId).collection('spinTicks').doc(tickId.slice(0, 120));
  const tickSnap = await tickRef.get();
  const now = Date.now();
  if (tickSnap.exists) {
    const at = Date.parse(String(tickSnap.data()?.at || ''));
    if (Number.isFinite(at) && now - at < SPIN_DEDUPE_MS) return { counted: false };
  }

  const field = input.kind === 'play' ? 'playCount' : 'previewCount';
  const batch = db.batch();
  batch.set(
    shareRef(db, shareId),
    {
      [field]: FieldValue.increment(1),
      lastSpinAt: new Date(now).toISOString(),
    },
    { merge: true }
  );
  batch.set(tickRef, { kind: input.kind, viewerId: viewerId || null, at: new Date(now).toISOString() });
  await batch.commit();
  return { counted: true };
}

/**
 * Count an unlock (paid or free). First cop is sticky.
 * Bumps updatedAt so the drop resurfaces on The Scene.
 */
export async function recordDropUnlock(
  db: Firestore,
  input: {
    shareId: string;
    buyerId: string;
    buyerName?: string;
    title?: string;
    amountCents?: number;
  }
): Promise<{ counted: boolean; firstCop: boolean }> {
  const shareId = input.shareId.trim();
  const buyerId = input.buyerId.trim();
  if (!shareId || !buyerId) return { counted: false, firstCop: false };

  const ref = shareRef(db, shareId);
  const snap = await ref.get();
  if (!snap.exists) return { counted: false, firstCop: false };
  const data = snap.data() || {};
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
  const ownerName = typeof data.ownerName === 'string' ? data.ownerName : 'Artist';
  if (ownerId && ownerId === buyerId) return { counted: false, firstCop: false };

  const already = typeof data.firstBuyerId === 'string' && data.firstBuyerId.trim();
  const firstCop = !already;
  const now = new Date().toISOString();
  const title =
    input.title?.trim() ||
    (data.data && typeof data.data === 'object' && typeof (data.data as { title?: string }).title === 'string'
      ? (data.data as { title: string }).title
      : 'Release');

  const patch: Record<string, unknown> = {
    purchaseCount: FieldValue.increment(1),
    lastPulseAt: now,
    updatedAt: now,
  };
  if (firstCop) {
    patch.firstBuyerId = buyerId;
    patch.firstBuyerName = (input.buyerName || 'Artist').trim().slice(0, 80);
    patch.firstBuyerAt = now;
  }

  await ref.set(patch, { merge: true });

  if (typeof input.amountCents === 'number' && input.amountCents > 0 && ownerId) {
    try {
      const [{ recordDropPurchaseInsight }, { dropListenerKeyForUser }] = await Promise.all([
        import('@/lib/server/drop-listen-analytics'),
        import('@/lib/server/drop-listener-identity'),
      ]);
      await recordDropPurchaseInsight(db, {
        ownerId,
        shareId,
        buyerListenerKey: dropListenerKeyForUser(buyerId),
        amountCents: input.amountCents,
        title,
      });
    } catch (err) {
      console.warn('[drop-pulse] purchase insight', err);
    }
  }

  // Paid unlocks notify via `drop_sold` from recordDropSale — avoid double ping.
  const paidUnlock = typeof input.amountCents === 'number' && input.amountCents > 0;
  if (ownerId && !paidUnlock) {
    try {
      await emitActivityEvent({
        type: 'drop_unlocked',
        actorId: buyerId,
        actorName: (input.buyerName || 'Artist').trim().slice(0, 80),
        recipientId: ownerId,
        recipientName: ownerName,
        shareId,
        preview: title.slice(0, 120),
        href: `/song/${shareId}`,
      });
    } catch (err) {
      console.warn('[drop-pulse] activity', err);
    }
  }

  return { counted: true, firstCop };
}
