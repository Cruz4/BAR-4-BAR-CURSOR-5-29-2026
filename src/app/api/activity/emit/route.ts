import { NextResponse } from 'next/server';
import { emitActivityEvent, type EmitActivityInput } from '@/lib/server/activity';
import { isActivityType, isServerOnlyActivityType } from '@/lib/activity/types';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';

export const runtime = 'nodejs';

/** Emit a social activity event (received + given). Actor must match auth. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const actorId = typeof body.actorId === 'string' ? body.actorId : '';
    const type = body.type;

    if (!actorId || !isActivityType(type) || isServerOnlyActivityType(type)) {
      return NextResponse.json({ error: 'Invalid activity payload' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, actorId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const input: EmitActivityInput = {
      type,
      actorId,
      actorName: typeof body.actorName === 'string' ? body.actorName : 'Artist',
      ...(typeof body.actorSlug === 'string' ? { actorSlug: body.actorSlug } : {}),
      ...(typeof body.recipientId === 'string' ? { recipientId: body.recipientId } : {}),
      ...(typeof body.recipientName === 'string' ? { recipientName: body.recipientName } : {}),
      ...(typeof body.postId === 'string' ? { postId: body.postId } : {}),
      ...(typeof body.commentId === 'string' ? { commentId: body.commentId } : {}),
      ...(typeof body.shareId === 'string' ? { shareId: body.shareId } : {}),
      ...(typeof body.preview === 'string' ? { preview: body.preview } : {}),
      ...(typeof body.href === 'string' ? { href: body.href } : {}),
    };

    const result = await emitActivityEvent(input);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[activity/emit]', err);
    return NextResponse.json({ error: 'Failed to emit activity' }, { status: 500 });
  }
}
