import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { ensureReferralCode } from '@/lib/server/referrals';
import { MAX_REFERRAL_REWARDS, REFERRAL_INK_REWARD, buildReferralLink } from '@/lib/referrals';
import { getTrustedAppOrigin } from '@/lib/server/trusted-origin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const db = await getDb();
    const referralCode = await ensureReferralCode(db, userId);
    const userSnap = await db.collection('users').doc(userId).get();
    const data = userSnap.data() || {};
    const referralCount = (data.referralCount as number) || 0;
    const origin = getTrustedAppOrigin(req);

    return NextResponse.json({
      referralCode,
      referralLink: buildReferralLink(origin, referralCode),
      referralCount,
      maxReferrals: MAX_REFERRAL_REWARDS,
      inkPerReferral: REFERRAL_INK_REWARD,
      remaining: Math.max(0, MAX_REFERRAL_REWARDS - referralCount),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not load referral info';
    console.error('Referral me error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
