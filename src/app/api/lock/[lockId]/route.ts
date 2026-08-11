import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getLock, listEchoes, ensureHouseLock, deleteLock } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lockId: string }> }
) {
  if (!(await isLockFeatureEnabled())) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }
  try {
    const { lockId: raw } = await params;
    const lockId = (raw || '').trim() || LOCK_HOUSE_ID;
    if (lockId === LOCK_HOUSE_ID || lockId === 'house') {
      await ensureHouseLock();
    }
    const lock = await getLock(lockId === 'house' ? LOCK_HOUSE_ID : lockId);
    if (!lock) {
      return NextResponse.json({ error: 'LOCK not found' }, { status: 404 });
    }
    const [newest, top] = await Promise.all([
      listEchoes(lock.id, { limit: 40, order: 'new' }),
      listEchoes(lock.id, { limit: 8, order: 'score' }),
    ]);
    return NextResponse.json({
      lock,
      echoes: newest,
      topEchoes: top,
    });
  } catch (err) {
    console.error('[lock GET]', err);
    return NextResponse.json({ error: 'Failed to load LOCK' }, { status: 500 });
  }
}

/** Owner hard-deletes their Finish this bar cast. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ lockId: string }> }
) {
  if (!(await isLockFeatureEnabled())) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }
  try {
    const { lockId: raw } = await params;
    const lockId =
      ((raw || '').trim() === 'house' ? LOCK_HOUSE_ID : (raw || '').trim()) || LOCK_HOUSE_ID;
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

    await deleteLock({ lockId, ownerId: userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    console.error('[lock DELETE]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
