import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import {
  isHouseReleaseCreditedToUser,
  toLinkedHouseRelease,
  type LinkedHouseRelease,
} from '@/lib/house-artist-link';

export const runtime = 'nodejs';

/** House releases owned by or credited to this artist (Edit Public Page + Release Catalog). */
export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get('userId')?.trim() || '';
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id.' }, { status: 400 });
    }
    await verifyCheckoutUser(req, userId);

    const db = await getDb();
    const snap = await db.collection('shares').where('houseRelease', '==', true).get();
    const byId = new Map<string, LinkedHouseRelease>();
    for (const doc of snap.docs) {
      const share = (doc.data() || {}) as Record<string, unknown>;
      if (!isHouseReleaseCreditedToUser(share, userId)) continue;
      const row = toLinkedHouseRelease(doc.id, share);
      if (row) byId.set(row.shareId, row);
    }

    return NextResponse.json({ releases: [...byId.values()] });
  } catch (error) {
    if (error instanceof CheckoutAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[profile/house-releases GET]', error);
    return NextResponse.json({ error: 'Could not load House releases.' }, { status: 500 });
  }
}
