import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import type { DropLibraryEntry } from '@/lib/drop-commerce';

export const runtime = 'nodejs';

export async function GET(req: Request) {
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
    const items = snap.docs
      .map((d) => d.data() as DropLibraryEntry)
      .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Library failed';
    console.error('[drops/library]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
