import { NextResponse } from 'next/server';
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

    const [artists, posts, drops, risers] = await Promise.all([
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
    ]);

    return NextResponse.json(
      { artists, posts, drops, risers },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120' } }
    );
  } catch (err) {
    console.error('[discover]', err);
    return NextResponse.json({ error: 'Discover failed' }, { status: 500 });
  }
}
