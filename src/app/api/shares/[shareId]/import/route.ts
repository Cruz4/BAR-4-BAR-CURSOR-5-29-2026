import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';

export const runtime = 'nodejs';

/** Increment DNA Drop import counter — clients cannot write shares directly. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const { userId } = await req.json().catch(() => ({}));

    if (!shareId?.trim() || !userId) {
      return NextResponse.json({ error: 'Missing shareId or userId' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const db = await getDb();
    const shareRef = db.collection('shares').doc(shareId.trim().toUpperCase());
    const snap = await shareRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }
    const rawShare = snap.data() || {};
    if (rawShare.dnaStatus === 'unlisted' || rawShare.data?.dnaStatus === 'unlisted') {
      return NextResponse.json({ error: 'This lyric preview is offline.' }, { status: 404 });
    }

    await shareRef.update({
      imports: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });

    const share = rawShare;
    const ownerId = typeof share.ownerId === 'string' ? share.ownerId : '';
    const isForeignImport = Boolean(ownerId && ownerId !== userId);

    try {
      const { emitActivityEvent } = await import('@/lib/server/activity');
      let actorName = 'Artist';
      let actorSlug: string | undefined;
      try {
        const userSnap = await db.collection('users').doc(userId).get();
        if (userSnap.exists && typeof userSnap.data()?.displayName === 'string') {
          actorName = userSnap.data()!.displayName;
        }
        const gSnap = await db.doc(`users/${userId}/gamification/summary`).get();
        if (typeof gSnap.data()?.profileSlug === 'string') {
          actorSlug = gSnap.data()!.profileSlug;
        }
      } catch {
        /* ignore */
      }
      await emitActivityEvent({
        type: 'dna_import',
        actorId: userId,
        actorName,
        ...(actorSlug ? { actorSlug } : {}),
        shareId: shareId.trim().toUpperCase(),
        recipientId: ownerId || undefined,
        recipientName: typeof share.ownerName === 'string' ? share.ownerName : undefined,
      });
    } catch (activityErr) {
      console.warn('[shares/import activity]', activityErr);
    }

    if (isForeignImport) {
      try {
        const { processGamificationEvent } = await import('@/lib/server/gamification');
        await processGamificationEvent(userId, 'dna_imported', { shareId: shareId.trim().toUpperCase() });
        if (ownerId) {
          await processGamificationEvent(ownerId, 'dna_drop_imported_by_other', {
            shareId: shareId.trim().toUpperCase(),
            importerId: userId,
          });
        }
      } catch (gamiErr) {
        console.warn('[shares/import gamification]', gamiErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[shares/import]', err);
    return NextResponse.json({ error: 'Failed to record import' }, { status: 500 });
  }
}
