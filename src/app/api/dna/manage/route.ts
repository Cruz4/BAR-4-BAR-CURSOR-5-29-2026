import { FieldValue, type WriteBatch } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import {
  dnaShareIdentity,
  isDnaShareLineage,
} from '@/lib/release-management';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { invalidateDiscoverySearchCatalog } from '@/lib/server/discovery-search';
import { canonicalShareVisibility } from '@/lib/server/dna-visibility';

export const runtime = 'nodejs';

function safeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('/');
}

async function ownerShareRecords(ownerId: string) {
  const db = await getDb();
  const snap = await db.collection('shares').where('ownerId', '==', ownerId).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }));
}

export async function GET(req: Request) {
  try {
    const shareId = new URL(req.url).searchParams.get('shareId')?.trim().toUpperCase() || '';
    if (!safeId(shareId)) {
      return NextResponse.json({ error: 'Invalid Lyrics DNA Drop.' }, { status: 400 });
    }
    const db = await getDb();
    const visibility = await canonicalShareVisibility(db, shareId);
    if (!visibility) {
      return NextResponse.json({ dnaLive: false, releaseLive: false }, { status: 404 });
    }
    return NextResponse.json(visibility);
  } catch (error) {
    console.error('[dna/manage visibility]', error);
    return NextResponse.json({ error: 'Could not verify this Lyrics DNA Drop.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const type = body.type === 'album' || body.type === 'track' ? body.type : null;
    const projectId = body.projectId;
    const albumId = body.albumId;
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim().toUpperCase() : '';
    if (
      !safeId(userId) ||
      !type ||
      !safeId(projectId) ||
      !safeId(shareId) ||
      (type === 'track' && !safeId(albumId))
    ) {
      return NextResponse.json({ error: 'Invalid Lyrics DNA Drop request.' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    const db = await getDb();
    const targetRef = type === 'album'
      ? db.doc(`users/${userId}/albums/${projectId}`)
      : db.doc(`users/${userId}/albums/${albumId}/tracks/${projectId}`);
    const [targetSnap, currentShareSnap, records] = await Promise.all([
      targetRef.get(),
      db.doc(`shares/${shareId}`).get(),
      ownerShareRecords(userId),
    ]);
    if (!targetSnap.exists) {
      return NextResponse.json({ error: 'This project was not found in your Vault.' }, { status: 404 });
    }
    if (currentShareSnap.exists && currentShareSnap.data()?.ownerId !== userId) {
      return NextResponse.json({ error: 'You can only take your own Lyrics DNA Drops offline.' }, { status: 403 });
    }

    const targetData = currentShareSnap.exists
      ? currentShareSnap.data() as Record<string, unknown>
      : {
          ownerId: userId,
          type,
          projectId,
          data: type === 'album' ? { title: targetSnap.data()?.title || '' } : {},
        };
    const identity = dnaShareIdentity(targetData);
    const matching = records.filter(
      (record) => record.id === shareId || (isDnaShareLineage(record.data) && dnaShareIdentity(record.data) === identity)
    );
    const now = new Date().toISOString();
    const writes: Array<(batch: WriteBatch) => void> = [
      (batch) => batch.set(targetRef, {
        shareId: FieldValue.delete(),
        dnaStatus: 'unlisted',
        updatedAt: now,
      }, { merge: true }),
      ...matching.map((record) => (batch: WriteBatch) => batch.set(
        db.doc(`shares/${record.id}`),
        {
          dnaStatus: 'unlisted',
          updatedAt: now,
          'data.dnaStatus': 'unlisted',
        },
        { merge: true }
      )),
    ];
    for (let index = 0; index < writes.length; index += 450) {
      const batch = db.batch();
      for (const write of writes.slice(index, index + 450)) write(batch);
      await batch.commit();
    }
    invalidateDiscoverySearchCatalog();
    return NextResponse.json({ ok: true, hiddenShareCount: matching.length });
  } catch (error) {
    console.error('[dna/manage]', error);
    return NextResponse.json({ error: 'Could not take this Lyrics DNA Drop offline.' }, { status: 500 });
  }
}
