import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getDb } from '@/lib/firebase/server';
import { processGamificationEvent } from '@/lib/server/gamification';
import { emitActivityEvent } from '@/lib/server/activity';
import { SYSTEM_ACTOR_ID, SYSTEM_ACTOR_NAME } from '@/lib/activity/types';
import { loveInkRewardUnlockId } from '@/lib/gamification/love-rewards';

export const runtime = 'nodejs';

function safeId(value: string): boolean {
  return value.length > 0 && value.length <= 240 && !value.includes('/');
}

/** Grant verified XP to whoever received a post/comment/drop love. Idempotent per like. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    const commentId = typeof body.commentId === 'string' ? body.commentId.trim() : '';
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim().toUpperCase() : '';

    if (!safeId(userId) || (postId && !safeId(postId)) || (commentId && !safeId(commentId)) || (shareId && !safeId(shareId))) {
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
    let recipientId = '';
    let rewardKey = '';

    if (postId && commentId) {
      const likeSnap = await db.doc(`posts/${postId}/comments/${commentId}/likes/${userId}`).get();
      if (!likeSnap.exists) return NextResponse.json({ error: 'Like not found' }, { status: 400 });
      const commentSnap = await db.doc(`posts/${postId}/comments/${commentId}`).get();
      if (!commentSnap.exists) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      recipientId = String(commentSnap.data()?.authorId || '');
      rewardKey = `post:${postId}:c:${commentId}:u:${userId}`;
    } else if (postId) {
      const likeSnap = await db.doc(`posts/${postId}/likes/${userId}`).get();
      if (!likeSnap.exists) return NextResponse.json({ error: 'Like not found' }, { status: 400 });
      const postSnap = await db.doc(`posts/${postId}`).get();
      if (!postSnap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      recipientId = String(postSnap.data()?.ownerId || '');
      rewardKey = `post:${postId}:u:${userId}`;
    } else if (shareId && commentId) {
      const likeSnap = await db.doc(`shares/${shareId}/comments/${commentId}/likes/${userId}`).get();
      if (!likeSnap.exists) return NextResponse.json({ error: 'Like not found' }, { status: 400 });
      const commentSnap = await db.doc(`shares/${shareId}/comments/${commentId}`).get();
      if (!commentSnap.exists) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      recipientId = String(commentSnap.data()?.authorId || '');
      rewardKey = `share:${shareId}:c:${commentId}:u:${userId}`;
    } else if (shareId) {
      const likeSnap = await db.doc(`shares/${shareId}/loves/${userId}`).get();
      if (!likeSnap.exists) return NextResponse.json({ error: 'Like not found' }, { status: 400 });
      const shareSnap = await db.doc(`shares/${shareId}`).get();
      if (!shareSnap.exists) return NextResponse.json({ error: 'Share not found' }, { status: 404 });
      recipientId = String(shareSnap.data()?.ownerId || '');
      rewardKey = `share:${shareId}:u:${userId}`;
    } else {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (!recipientId || recipientId === userId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const tickId = createHash('sha256').update(rewardKey).digest('hex');
    const tickRef = db.collection('users').doc(recipientId).collection('loveRewards').doc(tickId);
    try {
      await tickRef.create({
        rewardKey,
        grantedAt: new Date().toISOString(),
        likerId: userId,
        ...(postId ? { postId } : {}),
        ...(commentId ? { commentId } : {}),
        ...(shareId ? { shareId } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code === '6' || /already exists|ALREADY_EXISTS/i.test(message)) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      throw error;
    }

    let result;
    try {
      result = await processGamificationEvent(recipientId, 'love_received', {
        postId: postId || null,
        commentId: commentId || null,
        shareId: shareId || null,
      });
    } catch (error) {
      // The verified event did not finish; release the claim so a retry can recover.
      await tickRef.delete().catch(() => undefined);
      throw error;
    }

    const lifetimeLovesReceived = result.summary.lifetimeLovesReceived || 0;
    const milestoneUnlock = result.unlocks.find(
      (unlock) => unlock.id === loveInkRewardUnlockId(lifetimeLovesReceived)
    );
    if (milestoneUnlock) {
      await emitActivityEvent({
        type: 'love_milestone',
        actorId: SYSTEM_ACTOR_ID,
        actorName: SYSTEM_ACTOR_NAME,
        recipientId,
        preview: milestoneUnlock.description,
        href: '/studio-progress',
      });
    }

    return NextResponse.json({
      ok: true,
      xpGain: result.xpGain,
      inkReward: milestoneUnlock?.inkReward || 0,
    });
  } catch (err) {
    console.error('[social/love-reward]', err);
    return NextResponse.json({ error: 'Failed to grant love reward' }, { status: 500 });
  }
}
