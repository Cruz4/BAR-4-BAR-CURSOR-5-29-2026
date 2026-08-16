import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { connectStatusFromUser, createConnectDashboardLink } from '@/lib/server/stripe-connect';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'First Drops is off' }, { status: 404 });
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
    const status = connectStatusFromUser((await db.collection('users').doc(userId).get()).data());
    if (!status.accountId) {
      return NextResponse.json({ error: 'Connect payouts first.' }, { status: 400 });
    }
    if (!status.detailsSubmitted) {
      return NextResponse.json({ error: 'Finish payouts setup first.' }, { status: 400 });
    }

    const url = await createConnectDashboardLink(status.accountId);
    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not open payouts';
    console.error('[drops/payouts/dashboard]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
