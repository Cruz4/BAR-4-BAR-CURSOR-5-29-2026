import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { markUserActivatedIfNeeded } from '@/lib/server/milestones';

export const runtime = 'nodejs';

const ALLOWED = new Set(['studio_draft_complete']);

export async function POST(req: Request) {
  try {
    const { userId, milestone, userName } = await req.json();
    if (!userId || !milestone || !ALLOWED.has(milestone)) {
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

    const db = await getDb();
    let activated = false;

    if (milestone === 'studio_draft_complete') {
      activated = await markUserActivatedIfNeeded(db, userId, userName);
    }

    return NextResponse.json({ ok: true, activated });
  } catch (err) {
    console.error('[milestones]', err);
    return NextResponse.json({ error: 'Milestone processing failed' }, { status: 500 });
  }
}
