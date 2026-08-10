import { NextResponse } from 'next/server';
import { listRecentOpenLocks } from '@/lib/server/lock';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';
import {
  listLeaderboardRisers,
  listRecentPublicPosts,
  listRecentPublicProfiles,
  listRecentShareSummaries,
} from '@/lib/server/gamification';

export const runtime = 'nodejs';

/**
 * Scene home Discover stream — recent public activity across the site.
 * All sources are already public-read; this route only aggregates light summaries.
 * `?view=all` returns a deeper slice for the full Discover page.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const excludeUserId = searchParams.get('excludeUserId') || undefined;
    const viewAll = searchParams.get('view') === 'all';

    const [artists, posts, drops, risers, locks] = await Promise.all([
      listRecentPublicProfiles({
        limit: viewAll ? 24 : 8,
        excludeUserId,
      }),
      listRecentPublicPosts({
        limit: viewAll ? 24 : 10,
        excludeOwnerId: excludeUserId,
      }),
      listRecentShareSummaries({
        limit: viewAll ? 18 : 6,
        excludeOwnerId: excludeUserId,
      }),
      listLeaderboardRisers({ limit: 5, excludeUserId }),
      (await isLockFeatureEnabled())
        ? listRecentOpenLocks(viewAll ? 12 : 6).catch(() => [])
        : Promise.resolve([]),
    ]);

    const lockCards = (locks || []).map((l) => ({
      id: l.id,
      ownerName: l.ownerName,
      ownerSlug: l.ownerSlug,
      seedBar: l.seedBar,
      echoCount: l.echoCount,
      updatedAt: l.updatedAt,
    }));

    return NextResponse.json(
      { artists, posts, drops, risers, locks: lockCards },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' } }
    );
  } catch (err) {
    console.error('[discover]', err);
    return NextResponse.json({ error: 'Discover failed' }, { status: 500 });
  }
}
