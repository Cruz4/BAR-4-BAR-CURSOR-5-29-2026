import { NextResponse } from 'next/server';
import { initializeUserUsage } from '@/lib/server/usage-init';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { userId?: string };
    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    if (!hasAdminFirestoreCredentials()) {
      console.error('[usage/init] Admin Firestore credentials missing — welcome Ink cannot be granted');
      return NextResponse.json({ error: 'Ink bootstrap unavailable' }, { status: 503 });
    }

    const header = req.headers.get('authorization');
    const idToken = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    await initializeUserUsage(idToken, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[usage/init]', err);
    return NextResponse.json({ error: 'Usage init failed' }, { status: 500 });
  }
}
