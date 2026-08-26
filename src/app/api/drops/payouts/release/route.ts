import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { refreshConnectAccount, isConnectTransferReady } from '@/lib/server/stripe-connect';
import { releaseHeldDropEarnings } from '@/lib/server/drop-earnings';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'Music Releases is off' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return NextResponse.json({ error: 'Missing user.' }, { status: 400 });
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
    const accountId =
      typeof userSnap.data()?.stripeConnectAccountId === 'string'
        ? userSnap.data()?.stripeConnectAccountId
        : '';
    if (!accountId) {
      return NextResponse.json({ error: 'Connect payouts first.' }, { status: 400 });
    }

    const connect = await refreshConnectAccount(db, userId, accountId);
    if (!isConnectTransferReady(connect) || !connect.accountId) {
      return NextResponse.json(
        { error: 'Stripe still needs a few payout details before we can send held sales.' },
        { status: 400 }
      );
    }

    const result = await releaseHeldDropEarnings(db, userId, connect.accountId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not release earnings';
    console.error('[drops/payouts/release]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
