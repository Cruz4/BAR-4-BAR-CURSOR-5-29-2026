import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getStripe } from '@/lib/stripe-server';
import { dropArtistNetCents, dropPlatformFeeCents } from '@/lib/drop-commerce';
import {
  EMPTY_DROP_PAYOUT_TOTALS,
  type DropPayoutMode,
  type DropPayoutTotals,
  type DropSaleRecord,
  type DropSaleStatus,
} from '@/lib/drop-earnings';
import { centsToUsdLabel } from '@/lib/drop-commerce';
import { recordStudioEvent } from '@/lib/server/studio-analytics';

const HELD_FLUSH_LIMIT = 25;

type SaleWrite = {
  shareId: string;
  title: string;
  buyerId: string;
  buyerName?: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  payoutMode: DropPayoutMode;
  stripeSessionId: string;
  connectAccountId?: string;
};

function summaryRef(db: Firestore, artistId: string) {
  return db.collection('users').doc(artistId).collection('dropPayouts').doc('summary');
}

function saleRef(db: Firestore, artistId: string, saleId: string) {
  return db.collection('users').doc(artistId).collection('dropEarnings').doc(saleId);
}

export function splitDropSale(amountCents: number): { feeCents: number; netCents: number } {
  return {
    feeCents: dropPlatformFeeCents(amountCents),
    netCents: dropArtistNetCents(amountCents),
  };
}

function parseTotals(raw: Record<string, unknown> | undefined): DropPayoutTotals {
  if (!raw) return { ...EMPTY_DROP_PAYOUT_TOTALS };
  return {
    grossCents: Math.max(0, Number(raw.grossCents) || 0),
    feeCents: Math.max(0, Number(raw.feeCents) || 0),
    netCents: Math.max(0, Number(raw.netCents) || 0),
    heldCents: Math.max(0, Number(raw.heldCents) || 0),
    paidCents: Math.max(0, Number(raw.paidCents) || 0),
  };
}

function parseSale(id: string, raw: Record<string, unknown>): DropSaleRecord | null {
  const status: DropSaleStatus =
    raw.status === 'paid' || raw.status === 'held' || raw.status === 'failed' ? raw.status : 'held';
  const payoutMode: DropPayoutMode = raw.payoutMode === 'destination' ? 'destination' : 'held';
  const amountCents = Math.max(0, Number(raw.amountCents) || 0);
  if (!amountCents) return null;
  return {
    id,
    shareId: typeof raw.shareId === 'string' ? raw.shareId : '',
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Drop',
    buyerId: typeof raw.buyerId === 'string' ? raw.buyerId : '',
    buyerName:
      typeof raw.buyerName === 'string' && raw.buyerName.trim()
        ? raw.buyerName.trim().slice(0, 80)
        : undefined,
    amountCents,
    feeCents: Math.max(0, Number(raw.feeCents) || 0),
    netCents: Math.max(0, Number(raw.netCents) || 0),
    status,
    payoutMode,
    stripeSessionId: typeof raw.stripeSessionId === 'string' ? raw.stripeSessionId : undefined,
    stripeTransferId: typeof raw.stripeTransferId === 'string' ? raw.stripeTransferId : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    paidAt: typeof raw.paidAt === 'string' ? raw.paidAt : undefined,
  };
}

export async function loadDropPayoutTotals(
  db: Firestore,
  artistId: string
): Promise<DropPayoutTotals> {
  const snap = await summaryRef(db, artistId).get();
  return parseTotals(snap.data() as Record<string, unknown> | undefined);
}

export async function listDropSales(
  db: Firestore,
  artistId: string,
  limit = 40
): Promise<DropSaleRecord[]> {
  const snap = await db
    .collection('users')
    .doc(artistId)
    .collection('dropEarnings')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs
    .map((doc) => parseSale(doc.id, doc.data() as Record<string, unknown>))
    .filter((row): row is DropSaleRecord => Boolean(row));
}

export async function recordDropSale(db: Firestore, artistId: string, sale: SaleWrite): Promise<void> {
  if (!artistId || sale.amountCents <= 0 || sale.netCents <= 0) return;

  const ref = saleRef(db, artistId, sale.stripeSessionId);
  const existing = await ref.get();
  if (existing.exists) return;

  let buyerName =
    typeof sale.buyerName === 'string' && sale.buyerName.trim()
      ? sale.buyerName.trim().slice(0, 80)
      : '';
  if (!buyerName && sale.buyerId) {
    try {
      const buyerSnap = await db.collection('users').doc(sale.buyerId).get();
      const buyer = buyerSnap.data() || {};
      buyerName =
        (typeof buyer.displayName === 'string' && buyer.displayName.trim()) ||
        (typeof buyer.name === 'string' && buyer.name.trim()) ||
        'Fan';
    } catch {
      buyerName = 'Fan';
    }
  }
  buyerName = (buyerName || 'Fan').slice(0, 80);

  const status: DropSaleStatus = sale.payoutMode === 'destination' ? 'paid' : 'held';
  const now = new Date().toISOString();
  const title = sale.title.slice(0, 120);
  await ref.set({
    shareId: sale.shareId,
    title,
    buyerId: sale.buyerId,
    buyerName,
    amountCents: sale.amountCents,
    feeCents: sale.feeCents,
    netCents: sale.netCents,
    status,
    payoutMode: sale.payoutMode,
    stripeSessionId: sale.stripeSessionId,
    connectAccountId: sale.connectAccountId || null,
    createdAt: now,
    paidAt: status === 'paid' ? now : null,
  });

  const totalsPatch: Record<string, unknown> = {
    grossCents: FieldValue.increment(sale.amountCents),
    feeCents: FieldValue.increment(sale.feeCents),
    netCents: FieldValue.increment(sale.netCents),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (status === 'paid') totalsPatch.paidCents = FieldValue.increment(sale.netCents);
  else totalsPatch.heldCents = FieldValue.increment(sale.netCents);

  await summaryRef(db, artistId).set(totalsPatch, { merge: true });
  await recordStudioEvent(artistId, 'drop_sale_recorded', {
    shareId: sale.shareId,
    amountCents: sale.amountCents,
    netCents: sale.netCents,
    payoutMode: sale.payoutMode,
  });

  try {
    const { emitActivityEvent } = await import('@/lib/server/activity');
    const preview = `${title} · ${centsToUsdLabel(sale.amountCents)} · you keep ${centsToUsdLabel(sale.netCents)}`;
    await emitActivityEvent({
      type: 'drop_sold',
      actorId: sale.buyerId || 'system',
      actorName: buyerName,
      recipientId: artistId,
      shareId: sale.shareId,
      preview: preview.slice(0, 160),
      href: '/earnings',
    });
  } catch (err) {
    console.warn('[drop-earnings] sale activity', err);
  }
}

async function markSalePaid(
  db: Firestore,
  artistId: string,
  saleId: string,
  transferId: string,
  netCents: number
): Promise<boolean> {
  const ref = saleRef(db, artistId, saleId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const data = snap.data() || {};
    if (data.status === 'paid') return false;
    const now = new Date().toISOString();
    tx.update(ref, {
      status: 'paid',
      stripeTransferId: transferId,
      paidAt: now,
    });
    tx.set(
      summaryRef(db, artistId),
      {
        heldCents: FieldValue.increment(-netCents),
        paidCents: FieldValue.increment(netCents),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });
}

export async function releaseHeldDropEarnings(
  db: Firestore,
  artistId: string,
  destinationAccountId: string
): Promise<{ released: number; remaining: number; errors: string[] }> {
  const heldSnap = await db
    .collection('users')
    .doc(artistId)
    .collection('dropEarnings')
    .where('status', '==', 'held')
    .limit(HELD_FLUSH_LIMIT)
    .get();

  if (heldSnap.empty) {
    return { released: 0, remaining: 0, errors: [] };
  }

  const stripe = getStripe();
  const errors: string[] = [];
  let released = 0;

  for (const doc of heldSnap.docs) {
    const sale = parseSale(doc.id, doc.data() as Record<string, unknown>);
    if (!sale || sale.netCents <= 0) continue;
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: sale.netCents,
          currency: 'usd',
          destination: destinationAccountId,
          metadata: {
            artistId,
            saleId: sale.id,
            shareId: sale.shareId,
            feature: 'bar4bar-first-drops',
          },
        },
        { idempotencyKey: `drop-earn-${sale.id}` }
      );
      const moved = await markSalePaid(db, artistId, sale.id, transfer.id, sale.netCents);
      if (moved) released += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed';
      errors.push(`${sale.title}: ${message}`);
      console.error('[drop-earnings] transfer failed', artistId, sale.id, err);
    }
  }

  const leftover = await db
    .collection('users')
    .doc(artistId)
    .collection('dropEarnings')
    .where('status', '==', 'held')
    .limit(1)
    .get();

  return { released, remaining: leftover.empty ? 0 : leftover.size, errors };
}
