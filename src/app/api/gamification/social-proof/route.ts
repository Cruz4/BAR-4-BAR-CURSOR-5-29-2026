import { NextResponse } from 'next/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { processGamificationEvent } from '@/lib/server/gamification';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userId?: string; postId?: string };
    const userId = String(body.userId || '').trim();
    const postId = String(body.postId || '').trim();
    if (!userId || !postId || postId.length > 180) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let uid: string;
    try {
      uid = await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    const { allowed } = await checkRateLimit(`gamification-social:${uid}`, 20, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many events. Please slow down.' }, { status: 429 });
    }

    const result = await processGamificationEvent(uid, 'quote_reverb_created', { postId });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[gamification/social-proof]', error);
    return NextResponse.json({ error: 'Failed to verify social activity' }, { status: 500 });
  }
}
