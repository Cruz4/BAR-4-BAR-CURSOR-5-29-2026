import { NextResponse } from 'next/server';
import { getStripe, verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getDb } from '@/lib/firebase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
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
    const userSnap = await db.collection('users').doc(userId).get();
    const stripeCustomerId = userSnap.data()?.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing profile yet. Subscribe to Pro or buy ink first.' },
        { status: 400 }
      );
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/usage?tab=settings`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Portal session failed';
    console.error('Stripe Portal Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
