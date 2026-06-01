import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getGamificationSummaryForUser } from '@/lib/server/gamification';

export const runtime = 'nodejs';

/** Authenticated user reads their gamification summary (Admin SDK — avoids client rules issues). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId')?.trim() || '';

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    await verifyCheckoutUser(req, userId);
  } catch (e) {
    if (e instanceof CheckoutAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  try {
    const summary = await getGamificationSummaryForUser(userId);
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[gamification/summary]', err);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }
}
