import { NextResponse } from 'next/server';
import { getLeaderboardSnapshot, recordGamificationAnalytics } from '@/lib/server/gamification';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const weekKey = url.searchParams.get('week') || undefined;
    const userId = url.searchParams.get('userId');
    const data = await getLeaderboardSnapshot(weekKey || undefined, userId || undefined);

    if (userId) {
      try {
        const uid = await verifyCheckoutUser(req, userId);
        await recordGamificationAnalytics(uid, 'leaderboard_view', { weekKey: data.weekKey });
      } catch (e) {
        if (!(e instanceof CheckoutAuthError)) throw e;
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[gamification/leaderboard]', err);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
