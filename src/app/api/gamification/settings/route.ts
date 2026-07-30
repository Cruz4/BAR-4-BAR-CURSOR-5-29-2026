import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { updateGamificationSettings } from '@/lib/server/gamification';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  try {
    const { userId, publicProfile, leaderboardHidden, displayName, profilePhotoMode, profilePhotoUrl } =
      await req.json();
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

    const summary = await updateGamificationSettings(userId, {
      publicProfile,
      leaderboardHidden,
      displayName,
      profilePhotoMode,
      profilePhotoUrl,
    });
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[gamification/settings]', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
