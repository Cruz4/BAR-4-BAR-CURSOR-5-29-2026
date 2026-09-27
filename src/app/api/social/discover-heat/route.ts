import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { grantDiscoverHeat, revokeDiscoverHeat } from '@/lib/server/discover-heat';
import type { DiscoverHeatKind } from '@/lib/discover-heat';

export const runtime = 'nodejs';

function safeId(value: string): boolean {
  return value.length > 0 && value.length <= 240 && !value.includes('/');
}

function heatKind(value: unknown): DiscoverHeatKind | null {
  return value === 'love' || value === 'reply' || value === 'reverb' ? value : null;
}

/**
 * Grant or revoke Discover heat after the client writes the like, reply, or Reverb.
 * The server checks that write before the score moves.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    const commentId = typeof body.commentId === 'string' ? body.commentId.trim() : '';
    const kind = heatKind(body.kind);
    const direction = body.direction === 'revoke' ? 'revoke' : body.direction === 'grant' ? 'grant' : '';

    if (!safeId(userId) || !safeId(postId) || !kind || !direction || (commentId && !safeId(commentId))) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (kind === 'reply' && !commentId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const db = await getDb();
    const postSnap = await db.doc(`posts/${postId}`).get();
    if (!postSnap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const ownerId = String(postSnap.data()?.ownerId || '');
    if (direction === 'grant' && ownerId === userId) {
      return NextResponse.json({ ok: true, applied: false });
    }

    if (kind === 'love') {
      const likeExists = (await db.doc(`posts/${postId}/likes/${userId}`).get()).exists;
      if (direction === 'grant' && !likeExists) {
        return NextResponse.json({ error: 'Like not found' }, { status: 400 });
      }
      if (direction === 'revoke' && likeExists) {
        return NextResponse.json({ ok: true, applied: false });
      }
    } else if (kind === 'reply') {
      const commentSnap = await db.doc(`posts/${postId}/comments/${commentId}`).get();
      if (direction === 'grant') {
        if (!commentSnap.exists || String(commentSnap.data()?.authorId || '') !== userId) {
          return NextResponse.json({ error: 'Reply not found' }, { status: 400 });
        }
      } else if (commentSnap.exists) {
        return NextResponse.json({ ok: true, applied: false });
      }
    } else {
      const pointerExists = (await db.doc(`users/${userId}/reverbs/${postId}`).get()).exists;
      if (direction === 'grant' && !pointerExists) {
        return NextResponse.json({ error: 'Reverb not found' }, { status: 400 });
      }
      if (direction === 'revoke' && pointerExists) {
        return NextResponse.json({ ok: true, applied: false });
      }
    }

    const tickKey = kind === 'reply' ? commentId : userId;
    const applied =
      direction === 'grant'
        ? await grantDiscoverHeat(db, { postId, kind, tickKey, actorId: userId })
        : await revokeDiscoverHeat(db, { postId, kind, tickKey, actorId: userId });

    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    console.error('[social/discover-heat]', err);
    return NextResponse.json({ error: 'Failed to update Discover heat' }, { status: 500 });
  }
}
