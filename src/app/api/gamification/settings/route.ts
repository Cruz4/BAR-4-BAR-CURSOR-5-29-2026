import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { updateGamificationSettings } from '@/lib/server/gamification';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  try {
    const {
      userId,
      publicProfile,
      leaderboardHidden,
      displayName,
      profileSlug,
      profilePhotoMode,
      profilePhotoUrl,
      profileCollageAlbumIds,
      starMarkUseStar,
      starMarkSeed,
      starMarkSlots,
      starMarkPinnedSlotId,
      quotePressSlots,
    } = await req.json();
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
      profileSlug,
      profilePhotoMode,
      profilePhotoUrl,
      profileCollageAlbumIds,
      starMarkUseStar,
      starMarkSeed,
      starMarkSlots,
      starMarkPinnedSlotId,
      quotePressSlots,
    });
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[gamification/settings]', err);
    const message = err instanceof Error ? err.message : '';
    if (/already taken|not allowed|reserved|at least 2|32 characters|lowercase/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (/exceeds the maximum allowed size/i.test(message)) {
      return NextResponse.json(
        {
          error:
            'Profile media is too large to save. Try a smaller hero photo, or remove a room banner.',
        },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
