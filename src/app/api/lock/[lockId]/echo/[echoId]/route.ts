import { NextResponse } from 'next/server';
import { deleteEcho } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { canAccessLockApi } from '@/lib/server/lock-access';
import { getAuth } from '@/lib/firebase/server';

export const runtime = 'nodejs';

/** Author, cast owner, or studio admin — delete one reply. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ lockId: string; echoId: string }> }
) {
  try {
    const { lockId: raw, echoId: echoRaw } = await params;
    const lockId = ((raw || '').trim() === 'house' ? LOCK_HOUSE_ID : (raw || '').trim()) || LOCK_HOUSE_ID;
    if (!(await canAccessLockApi(lockId))) {
      return NextResponse.json({ error: 'Finish-the-bar is off' }, { status: 404 });
    }
    const echoId = (echoRaw || '').trim();
    if (!echoId) {
      return NextResponse.json({ error: 'Missing reply id' }, { status: 400 });
    }

    const header = req.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice(7));

    await deleteEcho({
      lockId,
      echoId,
      requesterId: decoded.uid,
      requesterEmail: decoded.email || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete reply';
    const status = /not found|Only the writer|Sign in/i.test(message)
      ? /Only the writer|studio admin/i.test(message)
        ? 403
        : 400
      : 500;
    console.error('[lock echo delete]', err);
    return NextResponse.json({ error: message }, { status });
  }
}
