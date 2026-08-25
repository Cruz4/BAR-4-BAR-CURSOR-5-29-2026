import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { emitActivityEvent } from '@/lib/server/activity';

export const runtime = 'nodejs';

const MENTION_RE = /@([a-z0-9_][a-z0-9_-]{1,47})/gi;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const actorId = typeof body.actorId === 'string' ? body.actorId : '';
    if (!actorId) return NextResponse.json({ error: 'Invalid actor' }, { status: 400 });
    try {
      await verifyCheckoutUser(req, actorId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) return NextResponse.json({ error: error.message }, { status: 401 });
      throw error;
    }
    const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim().slice(0, 128) : '';
    const commentId = typeof body.commentId === 'string' ? body.commentId.trim().slice(0, 128) : '';
    const sourceKind = body.sourceKind;
    const db = await getDb();
    const ref = sourceKind === 'post'
      ? db.doc(`posts/${sourceId}`)
      : sourceKind === 'post_comment'
        ? db.doc(`posts/${sourceId}/comments/${commentId}`)
        : sourceKind === 'drop_comment'
          ? db.doc(`shares/${sourceId}/comments/${commentId}`)
          : null;
    if (!ref) return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    const snap = await ref.get();
    const data = snap.data() || {};
    const sourceActorId = sourceKind === 'post' ? data.ownerId : data.authorId;
    if (!snap.exists || sourceActorId !== actorId) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    const text = typeof data.text === 'string' ? data.text : '';
    const slugs = [...new Set([...text.matchAll(MENTION_RE)].map((match) => match[1]!.toLowerCase()))].slice(0, 10);
    const actorProfile = await db.collection('publicProfiles').where('userId', '==', actorId).limit(1).get();
    const actorData = actorProfile.docs[0]?.data() || {};
    const actorName = typeof actorData.displayName === 'string' ? actorData.displayName : 'Music Fan';
    const actorSlug = actorProfile.docs[0]?.id;
    const mentions: Array<{ userId: string; slug: string; displayName: string }> = [];
    for (const slug of slugs) {
      const profile = await db.doc(`publicProfiles/${slug}`).get();
      const profileData = profile.data() || {};
      const recipientId = typeof profileData.userId === 'string' ? profileData.userId : '';
      if (!profile.exists || !recipientId || recipientId === actorId) continue;
      const [blockedByActor, blockedByRecipient] = await Promise.all([
        db.doc(`users/${actorId}/blocks/${recipientId}`).get(),
        db.doc(`users/${recipientId}/blocks/${actorId}`).get(),
      ]);
      if (blockedByActor.exists || blockedByRecipient.exists) continue;
      const displayName = typeof profileData.displayName === 'string' ? profileData.displayName : 'Music Fan';
      mentions.push({ userId: recipientId, slug: profile.id, displayName });
      await emitActivityEvent({
        type: 'mention', actorId, actorName, ...(actorSlug ? { actorSlug } : {}),
        recipientId, recipientName: displayName,
        ...(sourceKind === 'post' || sourceKind === 'post_comment' ? { postId: sourceId } : { shareId: sourceId }),
        ...(commentId ? { commentId } : {}),
        preview: text.slice(0, 120),
        href: sourceKind === 'drop_comment'
          ? `/song/${encodeURIComponent(sourceId)}${commentId ? `#comment-${encodeURIComponent(commentId)}` : ''}`
          : `/p/${encodeURIComponent(sourceId)}${commentId ? `#comment-${encodeURIComponent(commentId)}` : ''}`,
      });
    }
    if (mentions.length) await ref.set({ mentions, mentionsUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true, delivered: mentions.length });
  } catch (error) {
    console.error('[activity/mentions]', error);
    return NextResponse.json({ error: 'Could not deliver mentions' }, { status: 500 });
  }
}
