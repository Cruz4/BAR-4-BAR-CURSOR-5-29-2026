import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { listFriendshipsForUser } from '@/lib/server/friendships';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';

export const runtime = 'nodejs';

/**
 * GET /api/friends?of=TARGET&userId=VIEWER&status=accepted|pending
 *
 * - Signed-in viewer of own circle: accepted + pending (or filtered)
 * - Signed-in / anonymous viewing someone else: accepted only (public)
 */
export async function GET(req: Request) {
  if (!hasAdminFirestoreCredentials()) {
    return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const viewerId = searchParams.get('userId')?.trim() || '';
  const of = searchParams.get('of')?.trim() || viewerId;
  const statusRaw = searchParams.get('status')?.trim().toLowerCase();
  const status =
    statusRaw === 'accepted' || statusRaw === 'pending' ? statusRaw : undefined;

  if (!of) {
    return NextResponse.json({ error: 'Missing of' }, { status: 400 });
  }

  const isSelf = Boolean(viewerId && of === viewerId);

  if (viewerId) {
    try {
      await verifyCheckoutUser(req, viewerId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }
  } else if (status === 'pending') {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  try {
    // Public friends lists never expose pending invites.
    const effectiveStatus = isSelf ? status : 'accepted';
    const friendships = await listFriendshipsForUser(of, {
      ...(effectiveStatus ? { status: effectiveStatus } : {}),
      limit: 400,
    });
    return NextResponse.json({
      friendships,
      of,
      count: friendships.length,
    });
  } catch (err) {
    console.error('[friends]', err);
    return NextResponse.json({ error: 'Could not load friends' }, { status: 500 });
  }
}
