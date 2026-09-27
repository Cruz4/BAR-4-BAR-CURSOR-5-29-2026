import { NextResponse } from 'next/server';
import {
  getArtistHomeProspectByViewToken,
  prospectPublicProfileFromRecord,
  recordProspectView,
} from '@/lib/server/artist-home-prospects';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const viewToken = url.searchParams.get('token') || '';
    const record = await getArtistHomeProspectByViewToken(viewToken);
    if (!record) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }
    void recordProspectView(record.id);
    const profile = prospectPublicProfileFromRecord(record);
    const wallPosts = Array.isArray(profile.prospectWallPosts) ? profile.prospectWallPosts : [];
    return NextResponse.json({
      profile,
      prospectId: record.id,
      slug: record.slug,
      wallPosts,
    });
  } catch (err) {
    console.error('[artist-home-prospect/view]', err);
    return NextResponse.json({ error: 'Failed to load preview' }, { status: 500 });
  }
}
