import { NextResponse } from 'next/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import {
  acceptFold,
  declineFold,
  foldBackUnread,
  getFold,
  markFoldRead,
  passBar,
} from '@/lib/server/folds';
import { isFoldsFeatureEnabled } from '@/lib/server/folds-feature';
import type { FoldBarReply } from '@/lib/folds/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    if (!(await isFoldsFeatureEnabled())) {
      return NextResponse.json({ error: 'Folds is off' }, { status: 404 });
    }
    const url = new URL(req.url);
    const foldId = (url.searchParams.get('foldId') || '').trim();
    const userId = (url.searchParams.get('userId') || '').trim();
    if (!foldId || !userId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }
    const fold = await getFold(foldId);
    if (!fold || !fold.memberIds.includes(userId)) {
      return NextResponse.json({ error: 'Fold not found.' }, { status: 404 });
    }
    return NextResponse.json({ fold });
  } catch (err) {
    console.error('[folds GET]', err);
    return NextResponse.json({ error: 'Failed to load fold' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isFoldsFeatureEnabled())) {
      return NextResponse.json({ error: 'Folds is off' }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const action = typeof body.action === 'string' ? body.action : '';
    if (!userId || !action) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    if (action === 'pass') {
      const { allowed } = checkRateLimit(`fold-pass:${userId}`, 40, 60 * 60 * 1000);
      if (!allowed) {
        return NextResponse.json({ error: 'Slow down — too many bars this hour.' }, { status: 429 });
      }
      const peerId = typeof body.peerId === 'string' ? body.peerId.trim() : '';
      const text = typeof body.text === 'string' ? body.text : '';
      if (!peerId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      const replyRaw = body.replyTo && typeof body.replyTo === 'object' ? (body.replyTo as Record<string, unknown>) : null;
      const replyTo: FoldBarReply | undefined =
        replyRaw && typeof replyRaw.barId === 'string'
          ? {
              barId: replyRaw.barId,
              text: typeof replyRaw.text === 'string' ? replyRaw.text : '',
              senderId: typeof replyRaw.senderId === 'string' ? replyRaw.senderId : '',
            }
          : undefined;
      const result = await passBar({
        senderId: userId,
        senderName: typeof body.senderName === 'string' ? body.senderName : 'Artist',
        senderSlug: typeof body.senderSlug === 'string' ? body.senderSlug : undefined,
        peerId,
        text,
        clientId: typeof body.clientId === 'string' ? body.clientId : undefined,
        replyTo,
      });
      return NextResponse.json(result);
    }

    const foldId = typeof body.foldId === 'string' ? body.foldId.trim() : '';
    if (!foldId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    if (action === 'read') {
      const fold = await markFoldRead({ foldId, userId });
      return NextResponse.json({ fold });
    }
    if (action === 'unread') {
      const fold = await foldBackUnread({ foldId, userId });
      return NextResponse.json({ fold });
    }
    if (action === 'accept') {
      const fold = await acceptFold({ foldId, userId });
      return NextResponse.json({ fold });
    }
    if (action === 'decline') {
      const fold = await declineFold({ foldId, userId });
      return NextResponse.json({ fold });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (
      message === 'That is you.' ||
      message === 'Write a bar first.' ||
      message === 'You can’t pass a bar to this artist.' ||
      message === 'Artist not found.' ||
      message === 'That fold is not yours.' ||
      message === 'Wait for them to open it.' ||
      message === 'They still have the pass.'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === 'Fold not found.') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[folds POST]', err);
    return NextResponse.json({ error: 'Failed to update fold' }, { status: 500 });
  }
}
