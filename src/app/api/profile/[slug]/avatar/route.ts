import { NextResponse } from 'next/server';
import { getPublicArtistAvatarChip } from '@/lib/server/gamification';

export const runtime = 'nodejs';

/** Lightweight public avatar for feed / Discover chips (Vesperfold / photo). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const chip = await getPublicArtistAvatarChip(slug);
    if (!chip) {
      return NextResponse.json({ avatarUrl: null }, { status: 404 });
    }
    return NextResponse.json({
      avatarUrl: chip.avatarUrl,
      starMarkUseStar: chip.starMarkUseStar,
      starMarkSeed: chip.starMarkSeed,
      slug: chip.slug,
      studioBadge: chip.studioBadge,
    });
  } catch (err) {
    console.error('[profile/slug/avatar]', err);
    return NextResponse.json({ error: 'Failed to load avatar' }, { status: 500 });
  }
}
