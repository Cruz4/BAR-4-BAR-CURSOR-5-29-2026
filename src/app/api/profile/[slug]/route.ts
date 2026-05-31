import { NextResponse } from 'next/server';
import { getPublicProfile } from '@/lib/server/gamification';
import { getAchievement } from '@/lib/gamification/achievements';
import { rankFromXp } from '@/lib/gamification/ranks';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const profile = await getPublicProfile(slug);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const badges = (profile.badgeIds as string[] || [])
      .map((id) => getAchievement(id))
      .filter(Boolean);

    const rank = rankFromXp(Number(profile.xp || 0), true);

    return NextResponse.json({
      ...profile,
      rankLabel: rank.label,
      badges,
    });
  } catch (err) {
    console.error('[profile/slug]', err);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
