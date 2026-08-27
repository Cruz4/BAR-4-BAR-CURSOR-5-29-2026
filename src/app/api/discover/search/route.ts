import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { getArtistHomeConfig } from '@/lib/server/artist-home';
import { searchPublicMusicNetwork } from '@/lib/server/discovery-search';
import {
  discoverySearchFiltersFromParams,
  hasDiscoverySearchFilters,
} from '@/lib/discovery-search';

export const runtime = 'nodejs';

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return (await (await getAuth()).verifyIdToken(header.slice('Bearer '.length))).uid;
  } catch {
    return null;
  }
}
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().slice(0, 80);
    const filters = discoverySearchFiltersFromParams(searchParams);
    const requestedLimit = Number(searchParams.get('limit')) || 7;
    const limit = Math.min(Math.max(Math.floor(requestedLimit), 1), 60);
    if (query.length < 2 && !hasDiscoverySearchFilters(filters)) {
      return NextResponse.json({ hits: [], total: 0, hasMore: false });
    }
    const viewerUserId = await optionalUid(req);
    const viewerIdentity = viewerUserId
      ? (await getArtistHomeConfig(viewerUserId)).featured.soundIdentity
      : undefined;
    const result = await searchPublicMusicNetwork({
      query,
      viewerIdentity,
      excludeUserId: viewerUserId || undefined,
      limit,
      filters,
    });
    const response = NextResponse.json({
      hits: result.hits,
      total: result.total,
      hasMore: result.total > result.hits.length,
    });
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Authorization');
    return response;
  } catch (error) {
    console.error('[discover/search]', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
