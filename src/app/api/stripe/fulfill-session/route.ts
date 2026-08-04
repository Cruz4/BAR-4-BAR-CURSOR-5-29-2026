import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { getStripe, verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { fulfillPaidCheckoutSession } from '@/lib/stripe-fulfillment';

export const runtime = 'nodejs';

/** Credits ink / Pro after Stripe redirect when webhook is delayed or unavailable (local dev). */
export async function POST(req: Request) {
  try {
    const { sessionId, userId } = await req.json();

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Missing sessionId or userId' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (sessionUserId !== userId) {
      return NextResponse.json({ error: 'Checkout session does not belong to this account.' }, { status: 403 });
    }

    const db = await getDb();
    const result = await fulfillPaidCheckoutSession(
      db,
      session as unknown as Parameters<typeof fulfillPaidCheckoutSession>[1]
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fulfillment failed';
    console.error('Fulfill session error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
