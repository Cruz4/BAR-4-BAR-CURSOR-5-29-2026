import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getLock, listEchoes, ensureHouseLock, deleteLock, attachViewerEchoLikes } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';
import { canAccessLockApi } from '@/lib/server/lock-access';
import { getAuth } from '@/lib/firebase/server';

export const runtime = 'nodejs';

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ lockId: string }> }
) {
  try {
    const { lockId: raw } = await params;
    const lockId = (raw || '').trim() || LOCK_HOUSE_ID;
    const resolvedId = lockId === 'house' ? LOCK_HOUSE_ID : lockId;
    if (!(await canAccessLockApi(resolvedId))) {
      return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
    }
    if (resolvedId === LOCK_HOUSE_ID) {
      await ensureHouseLock();
    }
    const lock = await getLock(resolvedId);
    if (!lock) {
      return NextResponse.json({ error: 'LOCK not found' }, { status: 404 });
    }
    const viewerId = await optionalUid(req);
    const [newestRaw, topRaw] = await Promise.all([
      listEchoes(lock.id, { limit: 40, order: 'new' }),
      listEchoes(lock.id, { limit: 8, order: 'score' }),
    ]);
    const [newest, top] = await Promise.all([
      attachViewerEchoLikes(lock.id, newestRaw, viewerId),
      attachViewerEchoLikes(lock.id, topRaw, viewerId),
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
