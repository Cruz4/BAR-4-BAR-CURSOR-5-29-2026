import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { loadDropPayoutTotals, listDropSales } from '@/lib/server/drop-earnings';
import { connectStatusFromUser, refreshConnectAccount } from '@/lib/server/stripe-connect';
import { EMPTY_DROP_CONNECT_STATUS } from '@/lib/drop-earnings';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await isFirstDropsEnabled())) {
    return NextResponse.json({ error: 'Music Releases is off' }, { status: 404 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId')?.trim() || '';
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

  try {
    const db = await getDb();
    const userSnap = await db.collection('users').doc(userId).get();
    const userData = userSnap.data() || {};
    let connect = connectStatusFromUser(userData);
    if (connect.accountId) {
      try {
        connect = await refreshConnectAccount(db, userId, connect.accountId);
      } catch (err) {
        console.warn('[drops/payouts/status] connect refresh', err);
      }
    } else {
      connect = { ...EMPTY_DROP_CONNECT_STATUS };
    }

    const [totals, sales] = await Promise.all([
      loadDropPayoutTotals(db, userId),
      listDropSales(db, userId),
    ]);

    return NextResponse.json({ connect, totals, sales });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not load earnings';
    console.error('[drops/payouts/status]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
