import { NextResponse } from 'next/server';
import { getPublicArtistAvatar, getPublicProfile } from '@/lib/server/gamification';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';

export const runtime = 'nodejs';

/** Lightweight public avatar for feed / Discover chips (Vesperfold / photo). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const profile = await getPublicProfile(slug);
    if (!profile) {
      return NextResponse.json({ avatarUrl: null }, { status: 404 });
    }
    const data = profile as Record<string, unknown>;
    const starMarkUseStar = data.starMarkUseStar === true;
    const starMarkSeed = normalizeVesperfoldSeed(
      typeof data.starMarkSeed === 'number' ? data.starMarkSeed : 0
    );
    const avatarUrl = await getPublicArtistAvatar(slug);
    return NextResponse.json({
      avatarUrl: avatarUrl ?? null,
      starMarkUseStar,
      starMarkSeed: starMarkUseStar ? starMarkSeed : null,
    });
  } catch (err) {
    console.error('[profile/slug/avatar]', err);
    return NextResponse.json({ error: 'Failed to load avatar' }, { status: 500 });
  }
}
