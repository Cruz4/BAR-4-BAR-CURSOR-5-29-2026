import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { closeLock } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

/** Owner closes an Open LOCK — no more echoes. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ lockId: string }> }
) {
  if (!(await isLockFeatureEnabled())) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }
  try {
    const { lockId: raw } = await params;
    const lockId = ((raw || '').trim() === 'house' ? LOCK_HOUSE_ID : (raw || '').trim()) || LOCK_HOUSE_ID;
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId : '';
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

    const lock = await closeLock({ lockId, ownerId: userId });
    return NextResponse.json({ lock });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Close failed';
    console.error('[lock close]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
