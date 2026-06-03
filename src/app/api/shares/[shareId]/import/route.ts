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

    await shareRef.update({
      imports: FieldValue.increment(1),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[shares/import]', err);
    return NextResponse.json({ error: 'Failed to record import' }, { status: 500 });
  }
}
