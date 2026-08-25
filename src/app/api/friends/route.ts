import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { listFriendshipsForUser } from '@/lib/server/friendships';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { needsVanitySlugUpgrade } from '@/lib/profile/profile-slug';

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
      enrichSlugs: searchParams.get('publicCards') !== '1',
    });
    if (searchParams.get('publicCards') === '1') {
      const friendIds = friendships
        .flatMap((friendship) => friendship.uids)
        .filter((id) => id && id !== of);
      const uniqueIds = [...new Set(friendIds)];
      const db = await getDb();
      const profileDocs = [];
      for (let index = 0; index < uniqueIds.length; index += 30) {
        const chunk = uniqueIds.slice(index, index + 30);
        if (!chunk.length) continue;
        const snap = await db.collection('publicProfiles').where('userId', 'in', chunk).get();
        profileDocs.push(...snap.docs);
      }
      const byUser = new Map<string, (typeof profileDocs)[number]>();
      for (const doc of profileDocs) {
        const data = doc.data() as Record<string, unknown>;
        const uid = typeof data.userId === 'string' ? data.userId : '';
        if (!uid || needsVanitySlugUpgrade(doc.id, uid)) continue;
        const current = byUser.get(uid);
        if (!current || String(data.updatedAt || '') > String(current.data().updatedAt || '')) {
          byUser.set(uid, doc);
        }
      }
      const avatarSnaps = profileDocs.length
        ? await db.getAll(...profileDocs.map((profile) => profile.ref.collection('assets').doc('avatar')))
        : [];
      const avatarBySlug = new Map(
        avatarSnaps.flatMap((avatar) => {
          const slug = avatar.ref.parent.parent?.id;
          const url = avatar.data()?.url;
          return slug && typeof url === 'string' && url.trim()
            ? [[slug, url.trim()] as const]
            : [];
        })
      );
      const cards = uniqueIds.flatMap((uid) => {
        const doc = byUser.get(uid);
        if (!doc) return [];
        const data = doc.data() as Record<string, unknown>;
        return [{
          userId: uid,
          name:
            typeof data.displayName === 'string' && data.displayName.trim()
              ? data.displayName.trim()
              : 'Music Fan',
          slug: doc.id,
          isLivePublic: true,
          studioBadge: data.studioBadge === 'pro' ? 'pro' : 'free',
          starMarkUseStar: data.starMarkUseStar === true,
          ...(typeof data.starMarkSeed === 'number' ? { starMarkSeed: data.starMarkSeed } : {}),
          ...(avatarBySlug.get(doc.id)
            ? { avatarUrl: avatarBySlug.get(doc.id) }
            : {}),
        }];
      });
      const page = pageNumber(searchParams.get('page'));
      const limit = Math.min(400, Math.max(1, Number(searchParams.get('limit')) || 20));
      return NextResponse.json({
        cards: cards.slice(page * limit, page * limit + limit),
        page,
        pageCount: Math.max(1, Math.ceil(cards.length / limit)),
        count: cards.length,
        of,
      });
    }
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

function pageNumber(value: string | null): number {
  return Math.max(0, Math.min(200, Math.floor(Number(value) || 0)));
}
