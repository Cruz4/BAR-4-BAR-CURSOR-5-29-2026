import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { claimReferralReward, ensureReferralCode } from '@/lib/server/referrals';
import { normalizeReferralCode } from '@/lib/referrals';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId, referralCode: rawCode } = await req.json();
    if (!userId || !rawCode) {
      return NextResponse.json({ error: 'Missing userId or referralCode' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const referralCode = normalizeReferralCode(String(rawCode));
    if (!referralCode) {
      return NextResponse.json({ error: 'Invalid referral code format.' }, { status: 400 });
    }

    const db = await getDb();
    await ensureReferralCode(db, userId);
    const result = await claimReferralReward(db, userId, referralCode);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Referral claim failed';
    console.error('Referral claim error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
