import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase/server';
import { getPublicProfile } from '@/lib/server/gamification';
import { getAchievement } from '@/lib/gamification/achievements';
import { rankFromXp } from '@/lib/gamification/ranks';
import { getDb } from '@/lib/firebase/server';
import {
  resolveProfileReachDisplay,
} from '@/lib/server/reach-display';

export const runtime = 'nodejs';

async function optionalUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const profile = await getPublicProfile(slug);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = profile as Record<string, unknown>;
    const badges = ((profileData.badgeIds as string[]) || [])
      .map((id) => getAchievement(id))
      .filter(Boolean);

    const rank = rankFromXp(Number(profileData.xp || 0), true);
    const viewerId = await optionalUid(req);
    const ownerId = typeof profileData.userId === 'string' ? profileData.userId : '';
    const liveSlug = (profile as { slug?: string }).slug || slug;
    const db = await getDb();
    const reach = await resolveProfileReachDisplay(db, liveSlug, ownerId, profileData);
    const profileViewCountUnique = reach.unique;
    const legacyProfilePageLoads = reach.legacy;
    /** Header: unique people plus total public wall opens when higher. */
    const profileViewCount = reach.display;
    const ownerProfileViewCount =
      viewerId && ownerId && viewerId === ownerId ? profileViewCount : undefined;

    return NextResponse.json({
      ...profile,
      slug: (profile as { slug?: string }).slug || slug,
      rankId: rank.id,
      rankLabel: rank.label,
      badges,
      profileViewCount,
      profileViewCountUnique,
      legacyProfilePageLoads,
      ...(ownerProfileViewCount !== undefined ? { ownerProfileViewCount } : {}),
    });
  } catch (err) {
    console.error('[profile/slug]', err);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
