import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { requireBearerUid } from '@/lib/server/render/auth';
import {
  APPROVED_GENERATED_TAKE_LIMITS,
  resolveRenderTier,
} from '@/lib/song-generation/entitlements';
import type { User } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ takeId: string }> }
) {
  try {
    const uid = await requireBearerUid(request);
    const { takeId } = await context.params;
    const db = await getDb();
    const userSnap = await db.doc(`users/${uid}`).get();
    const user = userSnap.data() as User;
    const tier = resolveRenderTier(user);

    const approvedSnap = await db
      .collection(`users/${uid}/generatedTakes`)
      .where('approvedAt', '!=', null)
      .get();
    if (approvedSnap.size >= APPROVED_GENERATED_TAKE_LIMITS[tier]) {
      return NextResponse.json({ error: 'Approved studio library is full.' }, { status: 429 });
    }

    const ref = db.doc(`users/${uid}/generatedTakes/${takeId}`);
    const takeSnap = await ref.get();
    if (!takeSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (takeSnap.data()?.modelFamily !== 'ace-step') {
      return NextResponse.json(
        { error: 'This take is not a full ACE song. Generate again from the sheet.' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    await ref.set(
      {
        approvedAt: now,
        provenance: {
          ...(takeSnap.data()?.provenance || {}),
          disclosedAt: now,
        },
      },
      { merge: true }
    );

    await db.doc(`users/${uid}/albums/${takeSnap.data()?.albumId}/tracks/${takeSnap.data()?.trackId}`).set(
      { approvedGeneratedTakeId: takeId, updatedAt: now },
      { merge: true }
    );

    void import('@/lib/server/gamification').then(({ noteRenderAchievement }) => {
      void noteRenderAchievement(uid, 'keeper_take');
      if (takeSnap.data()?.workKind === 'instrumental') {
        void noteRenderAchievement(uid, 'beat_on_deck');
      }
    });

    return NextResponse.json({ ok: true, approvedAt: now });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
