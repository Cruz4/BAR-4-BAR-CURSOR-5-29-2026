import { NextResponse } from 'next/server';
import { getStripe, verifyCheckoutUser, CheckoutAuthError, resolveStripeCustomerId } from '@/lib/stripe-server';
import { getDb } from '@/lib/firebase/server';
import { getTrustedAppOrigin } from '@/lib/server/trusted-origin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { userId, returnTab } = await req.json();

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
    const stripeCustomerId = await resolveStripeCustomerId(
      stripe,
      db,
      userId,
      userSnap.data()?.stripeCustomerId as string | undefined
    );

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing profile yet. Subscribe to Pro or buy ink first.' },
        { status: 400 }
      );
    }

    const origin = getTrustedAppOrigin(req);
    const tab = returnTab === 'cloud' ? 'cloud' : 'settings';
    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/usage?tab=${tab}`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Portal session failed';
    console.error('Stripe Portal Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
