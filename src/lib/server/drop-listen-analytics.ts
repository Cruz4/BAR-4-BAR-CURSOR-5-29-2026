import 'server-only';

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  dropListenMilestoneSeconds,
  normalizeDropListenSource,
  type DropListenMilestone,
  type DropListenSource,
} from '@/lib/drop-listen-analytics';
import type { DropListenProof } from '@/lib/server/drop-listen-proof';
import { dropListenerKeyForUser } from '@/lib/server/drop-listener-identity';
import { emergingEntryPath } from '@/lib/emerging-ranking';

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

function dayKey(at = new Date()): string {
  return at.toISOString().slice(0, 10);
}

function titleFromShare(data: Record<string, unknown>): string {
  const payload = data.data && typeof data.data === 'object'
    ? (data.data as Record<string, unknown>)
    : {};
  return typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim().slice(0, 120)
    : 'First Drop';
}

function sourceIncrement(source: DropListenSource): Record<string, unknown> {
  return { [`sources.${source}`]: FieldValue.increment(1) };
}

export async function recordQualifiedListenProgress(
  db: Firestore,
  input: {
    proof: DropListenProof;
    listenerKey: string;
    milestone: DropListenMilestone;
    source?: unknown;
  }
): Promise<{ counted: boolean; qualified: boolean }> {
  if (input.proof.l !== input.listenerKey) return { counted: false, qualified: false };

  const requiredSec = dropListenMilestoneSeconds(input.milestone, input.proof.d);
  const wallClockSec = (Date.now() - input.proof.i) / 1000;
  if (wallClockSec + 2 < Math.max(3, requiredSec)) {
    return { counted: false, qualified: false };
  }

  const shareRef = db.collection('shares').doc(input.proof.s);
  const shareSnap = await shareRef.get();
  if (!shareSnap.exists) return { counted: false, qualified: false };
  const share = shareSnap.data() as Record<string, unknown>;
  const ownerId = typeof share.ownerId === 'string' ? share.ownerId : '';
  if (!ownerId) return { counted: false, qualified: false };
  if (input.listenerKey === dropListenerKeyForUser(ownerId)) {
    return { counted: false, qualified: false };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const day = dayKey(now);
  const source = normalizeDropListenSource(input.source);
  const listenerId = safeId(input.listenerKey);
  const milestoneTickRef = shareRef
    .collection('listenTicks')
    .doc(`${day}_${listenerId}_${input.milestone}`);
  const qualifies = input.milestone >= 80;
  const qualifiedTickRef = shareRef
    .collection('listenTicks')
    .doc(`${day}_${listenerId}_qualified`);
  const audienceRef = db.doc(`users/${ownerId}/dropAudience/${listenerId}`);
  const summaryRef = db.doc(`users/${ownerId}/dropInsights/summary`);
  const dailyRef = db.doc(
    `users/${ownerId}/dropInsightDays/${day}_${safeId(input.proof.s)}`
  );
  const emergingRef = db.doc(emergingEntryPath(ownerId, now));

  return db.runTransaction(async (tx) => {
    const [milestoneTick, qualifiedTick, audienceSnap] = await Promise.all([
      tx.get(milestoneTickRef),
      qualifies ? tx.get(qualifiedTickRef) : Promise.resolve(null),
      tx.get(audienceRef),
    ]);
    if (milestoneTick.exists) return { counted: false, qualified: false };

    const audience = audienceSnap.data() || {};
    const newQualifiedDay = qualifies && !qualifiedTick?.exists;
    const newAudienceDay = newQualifiedDay && audience.lastQualifiedDay !== day;
    const firstQualified = newAudienceDay && !audience.firstQualifiedAt;
    const repeatDay =
      newAudienceDay &&
      typeof audience.lastQualifiedDay === 'string' &&
      audience.lastQualifiedDay !== day;

    tx.set(milestoneTickRef, {
      milestone: input.milestone,
      listenerKey: input.listenerKey,
      source,
      full: input.proof.f === 1,
      trackId: input.proof.t || null,
      at: nowIso,
    });

    const milestoneField = `milestone${input.milestone}`;
    const basePatch: Record<string, unknown> = {
      ownerId,
      shareId: input.proof.s,
      title: titleFromShare(share),
      day,
      [milestoneField]: FieldValue.increment(1),
      updatedAt: nowIso,
    };
    tx.set(dailyRef, basePatch, { merge: true });
    tx.set(
      summaryRef,
      {
        [milestoneField]: FieldValue.increment(1),
        updatedAt: nowIso,
      },
      { merge: true }
    );

    if (input.milestone === 100) {
      tx.set(dailyRef, { completions: FieldValue.increment(1) }, { merge: true });
      tx.set(summaryRef, { completions: FieldValue.increment(1) }, { merge: true });
    }

    if (newQualifiedDay) {
      tx.set(qualifiedTickRef, {
        listenerKey: input.listenerKey,
        source,
        at: nowIso,
      });
      tx.set(
        dailyRef,
        {
          qualifiedListeners: FieldValue.increment(1),
          ...(repeatDay ? { repeatListeners: FieldValue.increment(1) } : {}),
          ...sourceIncrement(source),
        },
        { merge: true }
      );
      if (newAudienceDay) {
        tx.set(
          summaryRef,
          {
            qualifiedListenerDays: FieldValue.increment(1),
            ...(firstQualified ? { lifetimeQualifiedListeners: FieldValue.increment(1) } : {}),
            ...(repeatDay ? { repeatListenerDays: FieldValue.increment(1) } : {}),
          },
          { merge: true }
        );
      }
      tx.set(
        emergingRef,
        {
          userId: ownerId,
          qualifiedListeners: FieldValue.increment(1),
          ...(repeatDay ? { repeatListeners: FieldValue.increment(1) } : {}),
          updatedAt: nowIso,
        },
        { merge: true }
      );
      tx.set(
        audienceRef,
        {
          listenerKey: input.listenerKey,
          firstQualifiedAt: audience.firstQualifiedAt || nowIso,
          lastQualifiedAt: nowIso,
          lastQualifiedDay: day,
          ...(newAudienceDay ? { qualifiedDayCount: FieldValue.increment(1) } : {}),
          authenticated: input.proof.a === 1,
          lastSource: source,
        },
        { merge: true }
      );
    }

    return { counted: true, qualified: newQualifiedDay };
  });
}

export async function recordDropPurchaseInsight(
  db: Firestore,
  input: {
    ownerId: string;
    shareId: string;
    buyerListenerKey: string;
    amountCents: number;
    title: string;
  }
): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  const day = dayKey(now);
  const listenerId = safeId(input.buyerListenerKey);
  const purchaseTickRef = db.doc(
    `users/${input.ownerId}/dropPurchaseTicks/${safeId(input.shareId)}_${listenerId}`
  );
  const audienceRef = db.doc(`users/${input.ownerId}/dropAudience/${listenerId}`);
  const summaryRef = db.doc(`users/${input.ownerId}/dropInsights/summary`);
  const dailyRef = db.doc(
    `users/${input.ownerId}/dropInsightDays/${day}_${safeId(input.shareId)}`
  );
  const emergingRef = db.doc(emergingEntryPath(input.ownerId, now));
  const organicPurchaseEligible =
    input.buyerListenerKey !== dropListenerKeyForUser(input.ownerId);

  await db.runTransaction(async (tx) => {
    const [tick, audienceSnap] = await Promise.all([
      tx.get(purchaseTickRef),
      tx.get(audienceRef),
    ]);
    if (tick.exists) return;
    const audience = audienceSnap.data() || {};
    const repeatBuyer = Number(audience.purchaseCount) > 0;
    tx.set(purchaseTickRef, { shareId: input.shareId, listenerKey: input.buyerListenerKey, at: nowIso });
    tx.set(
      audienceRef,
      {
        listenerKey: input.buyerListenerKey,
        firstPurchaseAt: audience.firstPurchaseAt || nowIso,
        lastPurchaseAt: nowIso,
        purchaseCount: FieldValue.increment(1),
      },
      { merge: true }
    );
    tx.set(
      dailyRef,
      {
        ownerId: input.ownerId,
        shareId: input.shareId,
        title: input.title.slice(0, 120),
        day,
        purchases: FieldValue.increment(1),
        ...(organicPurchaseEligible ? { organicPurchases: FieldValue.increment(1) } : {}),
        grossCents: FieldValue.increment(Math.max(0, Math.round(input.amountCents))),
        ...(repeatBuyer ? { repeatBuyers: FieldValue.increment(1) } : {}),
        updatedAt: nowIso,
      },
      { merge: true }
    );
    tx.set(
      summaryRef,
      {
        purchases: FieldValue.increment(1),
        purchaseConversions: FieldValue.increment(1),
        grossCents: FieldValue.increment(Math.max(0, Math.round(input.amountCents))),
        ...(repeatBuyer ? { repeatBuyers: FieldValue.increment(1) } : {}),
        updatedAt: nowIso,
      },
      { merge: true }
    );
    if (organicPurchaseEligible) {
      tx.set(
        emergingRef,
        {
          userId: input.ownerId,
          purchaseConversions: FieldValue.increment(1),
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }
  });
}
