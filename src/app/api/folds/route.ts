import { NextResponse } from 'next/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import {
  acceptFold,
  declineFold,
  deleteFoldForUser,
  foldBackUnread,
  getFold,
  markAllFoldsRead,
  markAllFoldsUnread,
  markFoldRead,
  passBar,
  reactToFoldBar,
  voteFoldPoll,
} from '@/lib/server/folds';
import { isFoldsFeatureEnabled } from '@/lib/server/folds-feature';
import type { FoldBarReply } from '@/lib/folds/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    if (!(await isFoldsFeatureEnabled())) {
      return NextResponse.json({ error: 'Messaging is off' }, { status: 404 });
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
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }
    return NextResponse.json({ fold });
  } catch (err) {
    console.error('[folds GET]', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isFoldsFeatureEnabled())) {
      return NextResponse.json({ error: 'Messaging is off' }, { status: 404 });
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
        image: body.image,
        voice: body.voice,
        poll: body.poll,
        quotePress: body.quotePress,
      });
      return NextResponse.json(result);
    }

    if (action === 'read_all') {
      const marked = await markAllFoldsRead(userId);
      return NextResponse.json({ ok: true, marked });
    }
    if (action === 'unread_all') {
      const marked = await markAllFoldsUnread(userId);
      return NextResponse.json({ ok: true, marked });
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
    if (action === 'delete') {
      const fold = await deleteFoldForUser({ foldId, userId });
      return NextResponse.json({ fold });
    }
    if (action === 'vote_poll') {
      const barId = typeof body.barId === 'string' ? body.barId.trim() : '';
      const optionId = typeof body.optionId === 'string' ? body.optionId.trim() : '';
      if (!barId || !optionId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      const bar = await voteFoldPoll({ foldId, barId, userId, optionId });
      return NextResponse.json({ bar });
    }
    if (action === 'react') {
      const barId = typeof body.barId === 'string' ? body.barId.trim() : '';
      if (!barId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      const kind = typeof body.kind === 'string' ? body.kind : null;
      const bar = await reactToFoldBar({ foldId, barId, userId, kind });
      return NextResponse.json({ bar });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (
      message === 'That is you.' ||
      message === 'Write a message first.' ||
      message === 'You can’t message this artist.' ||
      message === 'Artist not found.' ||
      message === 'That conversation isn’t yours.' ||
      message === 'Wait for them to open it.' ||
      message === 'They haven’t accepted yet.' ||
      message === 'Invalid attachment.' ||
      message === 'That poll is gone.' ||
      message === 'Pick a poll choice.' ||
      message === 'Your vote was already locked in.' ||
      message === 'Pick a reaction.' ||
      message === 'Message not found.' ||
      message.startsWith('Add at least') ||
      message.startsWith('Every poll') ||
      message.startsWith('Polls need') ||
      message.startsWith('Poll choices')
    ) {
      const status = message === 'Your vote was already locked in.' ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    if (message === 'Conversation not found.') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[folds POST]', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
