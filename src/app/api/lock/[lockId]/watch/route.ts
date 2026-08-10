import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { claimEchoAuthor, watchLock } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

/** Name your echo + watch the LOCK. */
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
    const echoId = typeof body.echoId === 'string' ? body.echoId : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : 'Artist';

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

    let echo = null;
    if (echoId) {
      echo = await claimEchoAuthor({ lockId, echoId, userId, displayName });
    }
    await watchLock({ lockId, userId, lastEchoId: echoId || undefined });

    return NextResponse.json({ ok: true, echo, watching: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Watch failed';
    console.error('[lock watch]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
