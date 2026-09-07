import { NextResponse } from 'next/server';
import { claimTonightsFormSlot } from '@/lib/server/tonights-form';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const slot = Number(body.slot);
    const barText = typeof body.barText === 'string' ? body.barText : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName : 'Artist';
    const profileSlug = typeof body.profileSlug === 'string' ? body.profileSlug : undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Sign in to claim a seat.' }, { status: 401 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    const form = await claimTonightsFormSlot({
      userId,
      displayName,
      profileSlug,
      slot,
      barText,
    });
    return NextResponse.json({ ok: true, form });
  } catch (error) {
    console.error('[tonights-form/claim POST]', error);
    const message = error instanceof Error ? error.message : 'Could not claim seat.';
    const status = message.includes('Sign in') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
