import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { prestigeResetForUser } from '@/lib/server/gamification';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const summary = await prestigeResetForUser(userId);
    return NextResponse.json({ summary, prestigeLevel: summary.prestigeLevel || 0 });
  } catch (err) {
    console.error('[gamification/prestige]', err);
    const message = err instanceof Error ? err.message : 'Prestige reset failed';
    if (/Prestige unlocks|not available/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
