import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { createClearOffers, respondClearOffer } from '@/lib/server/lock';
import { isLockEnabled, LOCK_HOUSE_ID } from '@/lib/lock-feature';

export const runtime = 'nodejs';

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

    if (body.action === 'respond') {
      const offer = await respondClearOffer({
        lockId,
        userId,
        accept: body.accept === true,
      });
      return NextResponse.json({ offer });
    }

    const offers = Array.isArray(body.offers) ? body.offers : [];
    await createClearOffers({
      lockId,
      ownerId: userId,
      note: typeof body.note === 'string' ? body.note : undefined,
      offers: offers
        .filter(
          (o: { userId?: string; echoId?: string }) =>
            typeof o?.userId === 'string' && typeof o?.echoId === 'string'
        )
        .map((o: { userId: string; echoId: string; percent?: number | null }) => ({
          userId: o.userId,
          echoId: o.echoId,
          percent: typeof o.percent === 'number' ? o.percent : null,
        })),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clear failed';
    console.error('[lock clear]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
