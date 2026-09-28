import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase/server';
import {
  activeImprintShuffleUses,
  imprintShuffleRemaining,
  randomQuotePressFaders,
} from '@/lib/profile/quote-press';
import { isProUser } from '@/lib/subscription';

export const runtime = 'nodejs';

const EMPTY_MESSAGE = 'No shuffles left. Each one comes back 24 hours after you use it.';

async function requireUid(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length).trim());
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Spend one rolling Imprint shuffle and return the new look. */
export async function POST(req: Request) {
  const uid = await requireUid(req);
  if (!uid) {
    return NextResponse.json({ error: 'Sign in to shuffle an Imprint.' }, { status: 401 });
  }

  const db = await getDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  const isPro = isProUser({ subscriptionStatus: userSnap.data()?.subscriptionStatus });
  const summaryRef = db.doc(`users/${uid}/gamification/summary`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(summaryRef);
      const now = Date.now();
      const meter = imprintShuffleRemaining(snap.data()?.imprintShuffleUses, isPro, now);
      if (meter.remaining <= 0) {
        return {
          ok: false as const,
          remaining: 0,
          cap: meter.cap,
          imprintShuffleUses: meter.uses,
        };
      }
      const stamped = new Date(now).toISOString();
      const imprintShuffleUses = activeImprintShuffleUses([...meter.uses, stamped], now);
      tx.set(summaryRef, { imprintShuffleUses, updatedAt: stamped }, { merge: true });
      return {
        ok: true as const,
        faders: randomQuotePressFaders(),
        remaining: meter.cap - imprintShuffleUses.slice(-meter.cap).length,
        cap: meter.cap,
        imprintShuffleUses,
      };
    });

    if (!result.ok) {
      return NextResponse.json({ error: EMPTY_MESSAGE, ...result }, { status: 429 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('[imprint/shuffle]', error);
    return NextResponse.json({ error: 'Could not shuffle that Imprint.' }, { status: 500 });
  }
}
