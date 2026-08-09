import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { submitEcho } from '@/lib/server/lock';
import { isLockEnabled, LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { getAuth } from '@/lib/firebase/server';

export const runtime = 'nodejs';

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}

/** Guest or signed-in — submit one bar to a LOCK. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ lockId: string }> }
) {
  if (!isLockEnabled()) {
    return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
  }
  try {
    const { lockId: raw } = await params;
    const lockId = ((raw || '').trim() === 'house' ? LOCK_HOUSE_ID : (raw || '').trim()) || LOCK_HOUSE_ID;
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text : '';
    const parentEchoId = typeof body.parentEchoId === 'string' ? body.parentEchoId : null;

    const ipLimit = checkRateLimit(`lock-echo:${clientIp(req)}`, 20, 60 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many locks from this network. Try later.', code: 'LOCK_RATE' },
        { status: 429 }
      );
    }

    let authorId: string | null = null;
    let authorName: string | null = null;
    const header = req.headers.get('authorization');
    if (header?.startsWith('Bearer ')) {
      try {
        const auth = await getAuth();
        const decoded = await auth.verifyIdToken(header.slice(7));
        authorId = decoded.uid;
        authorName =
          (typeof body.displayName === 'string' && body.displayName.trim()) ||
          decoded.name ||
          'Artist';
      } catch {
        /* treat as guest */
      }
    }

    const result = await submitEcho({
      lockId,
      text,
      parentEchoId,
      authorId,
      authorName,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not lock bar';
    const status = /not found|closed|few words/i.test(message) ? 400 : 500;
    console.error('[lock echo]', err);
    return NextResponse.json({ error: message }, { status });
  }
}
