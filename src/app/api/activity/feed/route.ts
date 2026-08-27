import { NextResponse } from 'next/server';
import { getActivitySummary, listActivityFeedPage } from '@/lib/server/activity';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import type { ActivityDirection } from '@/lib/activity/types';

export const runtime = 'nodejs';

/** Authenticated, paginated Activity history. Read entries remain in the response. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    const direction: ActivityDirection =
      searchParams.get('direction') === 'given' ? 'given' : 'received';
    const limit = Number(searchParams.get('limit')) || 60;
    const cursor = (searchParams.get('cursor') || '').trim() || undefined;
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    return NextResponse.json(
      searchParams.get('summary') === '1'
        ? await getActivitySummary(userId)
        : await listActivityFeedPage(userId, direction, limit, cursor),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[activity/feed]', error);
    return NextResponse.json({ error: 'Could not load activity history.' }, { status: 500 });
  }
}
