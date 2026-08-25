import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { normalizeDropAudio, dropPriceSummary, normalizeDropPrice } from '@/lib/drop-commerce';
import { resolvePublicProfileSlugDoc } from '@/lib/server/profile-slug';

export const runtime = 'nodejs';
const PAGE_SIZE = 15;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const db = await getDb();
    const owner = await resolvePublicProfileSlugDoc(db, slug);
    if (!owner) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const cursor = new URL(req.url).searchParams.get('cursor') || '';
    const snap = await db.collection('shares').where('ownerId', '==', owner.userId).get();
    const songs = snap.docs.flatMap((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      if (raw.type === 'album') return [];
      const data = raw.data && typeof raw.data === 'object' ? raw.data as Record<string, unknown> : {};
      const audio = normalizeDropAudio(data.dropAudio);
      if (!audio) return [];
      const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : typeof raw.createdAt === 'string' ? raw.createdAt : '';
      const price = normalizeDropPrice(data.dropPrice);
      return [{
        shareId: doc.id,
        ownerId: owner.userId,
        type: 'track' as const,
        title: typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 120) : 'Untitled track',
        hasDropAudio: true,
        price,
        dropPriceSummary: dropPriceSummary(price),
        playCount: Math.max(0, Number(raw.playCount) || 0),
        previewCount: Math.max(0, Number(raw.previewCount) || 0),
        purchaseCount: Math.max(0, Number(raw.purchaseCount) || 0),
        updatedAt,
      }];
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const start = cursor ? Math.max(0, songs.findIndex((song) => song.shareId === cursor) + 1) : 0;
    const page = songs.slice(start, start + PAGE_SIZE);
    return NextResponse.json({
      songs: page,
      nextCursor: start + PAGE_SIZE < songs.length ? page.at(-1)?.shareId || null : null,
      total: songs.length,
    }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
  } catch (error) {
    console.error('[profile/songs]', error);
    return NextResponse.json({ error: 'Could not load pressed songs' }, { status: 500 });
  }
}
