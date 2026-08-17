import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import {
  createContactRequest,
  getContactForViewer,
  listPendingContactRequesterIds,
  respondContactRequest,
} from '@/lib/server/contact-requests';

export const runtime = 'nodejs';

async function uidFromBearer(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length).trim());
    return decoded.uid;
  } catch {
    return null;
  }
}

/** GET contact line / request status. `incoming=1` lists pending requester ids for the artist. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const incoming = url.searchParams.get('incoming') === '1';
    const artistId = (url.searchParams.get('artistId') || '').trim();
    const viewerId = await uidFromBearer(req);

    if (incoming) {
      if (!viewerId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
      const pendingRequesterIds = await listPendingContactRequesterIds(viewerId);
      return NextResponse.json({ pendingRequesterIds });
    }

    if (!artistId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const result = await getContactForViewer({ artistId, viewerId });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[profile/contact GET]', err);
    return NextResponse.json({ error: 'Failed to load contact' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action === 'respond' ? 'respond' : 'request';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    if (action === 'request') {
      const { allowed } = checkRateLimit(`contact-request:${userId}`, 10, 60 * 60 * 1000);
      if (!allowed) {
        return NextResponse.json({ error: 'Too many contact requests. Try again later.' }, { status: 429 });
      }
      const artistId = typeof body.artistId === 'string' ? body.artistId.trim() : '';
      if (!artistId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      const result = await createContactRequest({
        artistId,
        requesterId: userId,
        requesterName: typeof body.requesterName === 'string' ? body.requesterName : 'Artist',
        requesterSlug: typeof body.requesterSlug === 'string' ? body.requesterSlug : undefined,
      });
      return NextResponse.json(result);
    }

    const requesterId = typeof body.requesterId === 'string' ? body.requesterId.trim() : '';
    if (!requesterId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const result = await respondContactRequest({
      artistId: userId,
      requesterId,
      accept: body.accept === true,
      artistName: typeof body.artistName === 'string' ? body.artistName : 'Artist',
      artistSlug: typeof body.artistSlug === 'string' ? body.artistSlug : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (
      message === 'That is you.' ||
      message === 'You can’t request contact from this artist.' ||
      message === 'This artist is not taking contact requests.' ||
      message === 'This request is no longer pending.'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === 'Request not found.') {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('[profile/contact POST]', err);
    return NextResponse.json({ error: 'Failed to update contact request' }, { status: 500 });
  }
}
