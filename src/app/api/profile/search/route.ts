import { NextResponse } from 'next/server';
import { searchPublicArtists } from '@/lib/server/gamification';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const excludeUserId = searchParams.get('excludeUserId') || undefined;
    if (q.trim().length < 2) {
      return NextResponse.json({ artists: [] });
    }
    const artists = await searchPublicArtists(q, { excludeUserId, limit: 12 });
    return NextResponse.json({ artists });
  } catch (err) {
    console.error('[profile/search]', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
