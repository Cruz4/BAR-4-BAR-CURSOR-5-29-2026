import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { parseActivityPostHash } from '@/lib/activity/post-deep-link';
import { postFromServerDoc } from '@/lib/server/public-post';
import { resolvePublicProfileSlugDoc } from '@/lib/server/profile-slug';

export const runtime = 'nodejs';
const PAGE_SIZE = 15;

function pageNumber(value: string | null): number {
  return Math.max(0, Math.min(200, Math.floor(Number(value) || 0)));
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const db = await getDb();
    const owner = await resolvePublicProfileSlugDoc(db, slug);
    if (!owner) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind') === 'images'
      ? 'images'
      : searchParams.get('kind') === 'imprints'
        ? 'imprints'
        : 'wall';
    const target = parseActivityPostHash(searchParams.get('target'));
    let page = pageNumber(searchParams.get('page'));
    const posts = db.collection('posts');

    if (kind === 'images') {
      const cursor = searchParams.get('cursor') || '';
      let query = posts.where('ownerId', '==', owner.userId).orderBy('createdAt', 'desc');
      if (cursor) query = query.startAfter(cursor);
      const rows: ReturnType<typeof postFromServerDoc>[] = [];
      let lastCreatedAt = cursor;
      let exhausted = false;
      for (let pass = 0; pass < 8 && rows.length < PAGE_SIZE && !exhausted; pass += 1) {
        const snap = await query.limit(60).get();
        exhausted = snap.size < 60;
        for (const doc of snap.docs) {
          lastCreatedAt = String(doc.data().createdAt || '');
          const post = postFromServerDoc(doc.id, doc.data() as Record<string, unknown>);
          if (post.imageUrl) rows.push(post);
          if (rows.length >= PAGE_SIZE) break;
        }
        if (!exhausted && lastCreatedAt) {
          query = posts
            .where('ownerId', '==', owner.userId)
            .orderBy('createdAt', 'desc')
            .startAfter(lastCreatedAt);
        }
      }
      return NextResponse.json({
        posts: rows,
        nextCursor: !exhausted && lastCreatedAt ? lastCreatedAt : null,
      });
    }

    if (kind === 'imprints') {
      const ids = (searchParams.get('ids') || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 12);
      const rows: ReturnType<typeof postFromServerDoc>[] = [];
      for (const id of ids) {
        const snap = await posts.doc(id).get();
        const data = snap.data() || {};
        if (!snap.exists || data.ownerId !== owner.userId || !data.quotePress) continue;
        rows.push(postFromServerDoc(snap.id, data as Record<string, unknown>));
      }
      return NextResponse.json({ posts: rows });
    }

    if (target?.postId) {
      try {
        const targetSnap = await posts.doc(target.postId).get();
        const targetData = targetSnap.data() || {};
        if (targetSnap.exists && targetData.ownerId === owner.userId && targetData.createdAt) {
          const newer = await posts
            .where('ownerId', '==', owner.userId)
            .where('createdAt', '>', targetData.createdAt)
            .count()
            .get();
          page = Math.floor((newer.data().count || 0) / PAGE_SIZE);
        }
      } catch (error) {
        console.error('[profile/posts] target page', error);
      }
    }

    const [snap, totalSnap] = await Promise.all([
      posts
        .where('ownerId', '==', owner.userId)
        .orderBy('createdAt', 'desc')
        .offset(page * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .get(),
      posts.where('ownerId', '==', owner.userId).count().get(),
    ]);
    const total = totalSnap.data().count || 0;
    const rows = snap.docs.map((doc) => postFromServerDoc(doc.id, doc.data() as Record<string, unknown>));
    if (target?.postId && !rows.some((post) => post.id === target.postId)) {
      try {
        const targetSnap = await posts.doc(target.postId).get();
        const targetData = targetSnap.data() || {};
        if (targetSnap.exists && targetData.ownerId === owner.userId) {
          rows.unshift(postFromServerDoc(targetSnap.id, targetData as Record<string, unknown>));
        }
      } catch (error) {
        console.error('[profile/posts] target merge', error);
      }
    }
    return NextResponse.json({
      posts: rows,
      page,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
    });
  } catch (error) {
    console.error('[profile/posts]', error);
    return NextResponse.json({ error: 'Could not load profile posts' }, { status: 500 });
  }
}
