import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { getTrustedAppOrigin } from '@/lib/server/trusted-origin';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { isDropPayoutCountry } from '@/lib/drop-earnings';
import {
  createConnectOnboardingLink,
  ensureConnectAccount,
} from '@/lib/server/stripe-connect';
import { recordStudioEvent } from '@/lib/server/studio-analytics';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'Music Releases is off' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : 'US';
    const email = typeof body.email === 'string' ? body.email : undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Missing user.' }, { status: 400 });
    }
    if (!isDropPayoutCountry(country)) {
      return NextResponse.json({ error: 'Pick a supported payout country.' }, { status: 400 });
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
    const { status, created } = await ensureConnectAccount(db, userId, { email, country });
    if (!status.accountId) {
      return NextResponse.json({ error: 'Could not create a payouts account.' }, { status: 500 });
    }

    if (status.transfersActive && status.detailsSubmitted) {
      return NextResponse.json({ url: null, ready: true, created });
    }

    const origin = getTrustedAppOrigin(req);
    const url = await createConnectOnboardingLink(status.accountId, origin);
    await recordStudioEvent(userId, 'drop_connect_started', { country, created }, email);

    return NextResponse.json({ url, ready: false, created });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : 'Could not start payouts';
    const connectOff = /connect is not enabled|signed up for connect/i.test(raw);
    const message = connectOff
      ? 'Stripe Connect is not turned on for this live Stripe account yet. Open dashboard.stripe.com/connect in Live mode, complete Get started, then tap Connect payouts again. No redeploy needed.'
      : raw;
    console.error('[drops/payouts/onboard]', err);
    return NextResponse.json(
      {
        error: message,
        ...(connectOff
          ? { code: 'connect_not_enabled', dashboardUrl: 'https://dashboard.stripe.com/connect' }
          : {}),
      },
      { status: connectOff ? 409 : 500 }
    );
  }
}
