import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import {
  isImprintInCollection,
  listImprintCollection,
  saveImprintToCollection,
  unsaveImprintFromCollection,
} from '@/lib/server/imprint-collection';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';

export const runtime = 'nodejs';

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
