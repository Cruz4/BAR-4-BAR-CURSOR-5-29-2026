import { NextResponse } from 'next/server';
import { markActivityRead, markActivityUnread, markAllActivityRead } from '@/lib/server/activity';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';

export const runtime = 'nodejs';

/** Mark activity events read/unread (or mark all received events read). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId : '';
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    if (body.all === true) {
      const marked = await markAllActivityRead(userId);
      return NextResponse.json({ ok: true, marked });
    }

    const eventIds = Array.isArray(body.eventIds)
      ? body.eventIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    if (!eventIds.length) {
      return NextResponse.json({ error: 'Missing eventIds' }, { status: 400 });
    }

    const marked = body.unread === true
      ? await markActivityUnread(userId, eventIds)
      : await markActivityRead(userId, eventIds);
    return NextResponse.json({ ok: true, marked });
  } catch (err) {
    console.error('[activity/read]', err);
    return NextResponse.json({ error: 'Failed to update read state' }, { status: 500 });
  }
}
