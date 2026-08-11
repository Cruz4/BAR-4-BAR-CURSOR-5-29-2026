import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { listLocksByOwner, listMyLockContributions } from '@/lib/server/lock';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

/** Auth: your Finish this bar casts + named replies. */
export async function GET(req: Request) {
  if (!(await isLockFeatureEnabled())) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }

  const userId = new URL(req.url).searchParams.get('userId')?.trim() || '';
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
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
    const [owned, contributed] = await Promise.all([
      listLocksByOwner(userId, { limit: 40 }),
      listMyLockContributions(userId, 40),
    ]);
    return NextResponse.json({ owned, contributed });
  } catch (err) {
    console.error('[lock mine]', err);
    return NextResponse.json({ error: 'Could not load your desk' }, { status: 500 });
  }
}
