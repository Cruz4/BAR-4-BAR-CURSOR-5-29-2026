import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import {
  isImprintInCollection,
  listImprintCollection,
  saveImprintToCollection,
  unsaveImprintFromCollection,
} from '@/lib/server/imprint-collection';
import { activityPostHash } from '@/lib/activity/post-deep-link';
import { emitActivityEvent } from '@/lib/server/activity';
import { profileHref } from '@/lib/profile/profile-slug';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';

export const runtime = 'nodejs';

async function userProfile(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string
): Promise<{ name: string; slug?: string }> {
  const snap = await db.doc(`users/${userId}/gamification/summary`).get();
  const data = snap.data() || {};
  const name =
    (typeof data.displayName === 'string' && data.displayName.trim()) ||
    (typeof data.artistName === 'string' && data.artistName.trim()) ||
    'Artist';
  const slug =
    typeof data.profileSlug === 'string' && data.profileSlug.trim()
      ? data.profileSlug.trim()
      : undefined;
  return { name, ...(slug ? { slug } : {}) };
}

async function emitImprintSaveNotifications(
  db: Awaited<ReturnType<typeof getDb>>,
  input: {
    saverId: string;
    postId: string;
    hostProfileUserId?: string;
  }
) {
  const postSnap = await db.doc(`posts/${input.postId}`).get();
  const post = postSnap.data() || {};
  const ownerId = String(post.ownerId || '');
  const hostId = (input.hostProfileUserId || '').trim();
  const preview =
    (typeof post.text === 'string' && post.text.trim()) ||
    (typeof post.quoteText === 'string' && post.quoteText.trim()) ||
    undefined;

  const actor = await userProfile(db, input.saverId);
  const base = {
    actorId: input.saverId,
    actorName: actor.name,
    ...(actor.slug ? { actorSlug: actor.slug } : {}),
    postId: input.postId,
    ...(preview ? { preview: preview.slice(0, 120) } : {}),
  };

  if (ownerId && ownerId !== input.saverId) {
    await emitActivityEvent({
      ...base,
      type: 'post_imprint_saved',
    }).catch((error) => {
      console.warn('[posts/imprint-collection post owner activity]', error);
    });
  }

  if (hostId && hostId !== input.saverId && hostId !== ownerId) {
    const host = await userProfile(db, hostId);
    const href =
      profileHref(host.slug, activityPostHash(input.postId)) || '/activity';
    await emitActivityEvent({
      ...base,
      type: 'profile_imprint_saved',
      recipientId: hostId,
      recipientName: host.name,
      ...(host.slug ? { recipientSlug: host.slug } : {}),
      href,
    }).catch((error) => {
      console.warn('[posts/imprint-collection profile host activity]', error);
    });
  }
}

/** Save / unsave / list personal imprint collection entries. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get('userId') || '').trim();
    const postId = (url.searchParams.get('postId') || '').trim();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const db = await getDb();
    if (postId) {
      const saved = await isImprintInCollection(db, userId, postId);
      return NextResponse.json({ saved });
    }

    const entries = await listImprintCollection(db, userId);
    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[posts/imprint-collection GET]', err);
    return NextResponse.json({ error: 'Could not load collection' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    const hostProfileUserId =
      typeof body.hostProfileUserId === 'string' ? body.hostProfileUserId.trim() : '';
    const action = typeof body.action === 'string' ? body.action : '';
    if (!userId || !postId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
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
    if (action === 'save') {
      const result = await saveImprintToCollection(db, userId, postId);
      if (result.isNew) {
        await emitImprintSaveNotifications(db, {
          saverId: userId,
          postId,
          ...(hostProfileUserId ? { hostProfileUserId } : {}),
        });
      }
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === 'unsave') {
      const result = await unsaveImprintFromCollection(db, userId, postId);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'Post not found.' || message === 'That post is not an Imprint.') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('[posts/imprint-collection POST]', err);
    return NextResponse.json({ error: 'Could not update collection' }, { status: 500 });
  }
}
