import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import type { DropLibraryEntry } from '@/lib/drop-commerce';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import {
  hydrateDropLibraryItems,
  listHouseReleaseLibraryItems,
  listOwnerPressedLibraryItems,
} from '@/lib/server/drop-library-hydrate';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'Music Releases is off' }, { status: 404 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    if (!userId) return NextResponse.json({ error: 'Missing user.' }, { status: 400 });

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const db = await getDb();
    const snap = await db.collection('users').doc(userId).collection('dropLibrary').get();
    const raw = snap.docs
      .map((d) => d.data() as DropLibraryEntry)
      .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
    const [bought, own, house] = await Promise.all([
      hydrateDropLibraryItems(db, raw),
      listOwnerPressedLibraryItems(db, userId),
      listHouseReleaseLibraryItems(db),
    ]);
    const ownIds = new Set(own.map((item) => item.shareId));
    const houseIds = new Set(house.map((item) => item.shareId));
    const items = [
      ...own,
      ...house.filter((item) => !ownIds.has(item.shareId)),
      ...bought.filter((item) => !ownIds.has(item.shareId) && !houseIds.has(item.shareId)),
    ];
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Library failed';
    console.error('[drops/library]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
