import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { submitEcho } from '@/lib/server/lock';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';
import { canAccessLockApi } from '@/lib/server/lock-access';
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
  try {
    const { lockId: raw } = await params;
    const lockId = ((raw || '').trim() === 'house' ? LOCK_HOUSE_ID : (raw || '').trim()) || LOCK_HOUSE_ID;
    if (!(await canAccessLockApi(lockId))) {
      return NextResponse.json({ error: 'LOCK is off' }, { status: 404 });
    }
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
    let authorSlug: string | null =
      typeof body.authorSlug === 'string' && body.authorSlug.trim()
        ? body.authorSlug.trim().slice(0, 80)
        : null;
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
      authorSlug,
    });

    // Server-side funnel (Telegram) — reliable even if client beacon fails
    try {
      const { recordLockFunnelEvent } = await import('@/lib/server/record-lock-funnel-event');
      const { LOCK_FUNNEL_EVENTS } = await import('@/lib/lock-funnel-events');
      const branched = Boolean(parentEchoId);
      const meta = {
        lockId,
        lockScore: result.echo.lockScore,
        branched,
        authorName: authorName || null,
        userId: authorId || null,
        userName: authorName || null,
        isHouse: lockId === LOCK_HOUSE_ID,
      };
      await recordLockFunnelEvent(LOCK_FUNNEL_EVENTS.SUBMIT, { metadata: meta });
      if (branched) {
        await recordLockFunnelEvent(LOCK_FUNNEL_EVENTS.BRANCH, { metadata: meta });
      }
    } catch (e) {
      console.warn('[lock echo] funnel', e);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not lock bar';
    const status = /not found|closed|few words/i.test(message) ? 400 : 500;
    console.error('[lock echo]', err);
    return NextResponse.json({ error: message }, { status });
  }
}
