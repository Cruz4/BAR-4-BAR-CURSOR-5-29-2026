import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getArtistHomeConfig, saveArtistHomeConfig } from '@/lib/server/artist-home';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';

export const runtime = 'nodejs';

/** Serialized config hard cap — protects the 1MB Firestore doc limit. */
const MAX_CONFIG_BYTES = 500_000;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || '';
    if (!userId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }
    const config = await getArtistHomeConfig(userId);
    return NextResponse.json({ config });
  } catch (err) {
    console.error('[profile/config GET]', err);
    return NextResponse.json({ error: 'Failed to load profile config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    if (!userId || !body?.config) {
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

    const config = normalizeArtistHomeConfig(body.config);
    if (JSON.stringify(config).length > MAX_CONFIG_BYTES) {
      return NextResponse.json(
        { error: 'Profile config too large — trim album covers or bio.' },
        { status: 413 }
      );
    }

    const saved = await saveArtistHomeConfig(userId, config);
    return NextResponse.json({ config: saved });
  } catch (err) {
    console.error('[profile/config POST]', err);
    return NextResponse.json({ error: 'Failed to save profile config' }, { status: 500 });
  }
}
