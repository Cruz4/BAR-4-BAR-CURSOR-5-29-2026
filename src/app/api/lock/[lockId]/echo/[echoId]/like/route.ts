import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { toggleEchoLike } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { canAccessLockApi } from '@/lib/server/lock-access';
import { getAuth } from '@/lib/firebase/server';

export const runtime = 'nodejs';

async function handleLike(
  req: Request,
  params: Promise<{ lockId: string; echoId: string }>,
  like: boolean
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
    const limited = await checkRateLimit(`lock-echo-like:${decoded.uid}`, 60, 60 * 1000);
    if (!limited.allowed) {
      return NextResponse.json({ error: 'Slow down' }, { status: 429 });
    }

    const result = await toggleEchoLike({
      lockId,
      echoId,
      userId: decoded.uid,
      like,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not mic this bar';
    const status = /not found|Sign in/i.test(message) ? 400 : 500;
    console.error('[lock echo like]', err);
    return NextResponse.json({ error: message }, { status });
  }
}

/** Mic a house / LOCK reply (like, mic icon). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ lockId: string; echoId: string }> }
) {
  return handleLike(req, params, true);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ lockId: string; echoId: string }> }
) {
  return handleLike(req, params, false);
}
