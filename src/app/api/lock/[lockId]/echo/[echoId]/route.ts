import { NextResponse } from 'next/server';
import { deleteEcho } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';
import { getAuth } from '@/lib/firebase/server';

export const runtime = 'nodejs';

/** Author or cast owner — delete one reply. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ lockId: string; echoId: string }> }
) {
  if (!(await isLockFeatureEnabled())) {
    return NextResponse.json({ error: 'Finish-the-bar is off' }, { status: 404 });
  }
  try {
    const { lockId: raw, echoId: echoRaw } = await params;
    const lockId = ((raw || '').trim() === 'house' ? LOCK_HOUSE_ID : (raw || '').trim()) || LOCK_HOUSE_ID;
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
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete reply';
    const status = /not found|Only the writer|Sign in/i.test(message)
      ? /Only the writer/i.test(message)
        ? 403
        : 400
      : 500;
    console.error('[lock echo delete]', err);
    return NextResponse.json({ error: message }, { status });
  }
}
