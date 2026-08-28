import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getProductSurfaces } from '@/lib/server/product-surfaces';
import { getArtistIntelligenceSummary } from '@/lib/server/support-crm';
import type { SupportAnalyticsWindow } from '@/lib/relationships';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    const requestedDays = Number(searchParams.get('days'));
    const days: SupportAnalyticsWindow =
      requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;

    if (!userId) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    const surfaces = await getProductSurfaces();
    if (surfaces.supportCircle === 'off') {
      return NextResponse.json({ error: 'Artist Intelligence is offline.' }, { status: 404 });
    }
    if (surfaces.supportCircle !== 'crm') {
      return NextResponse.json(
        { error: 'Artist Intelligence CRM is not enabled.' },
        { status: 409 }
      );
    }

    const db = await getDb();
    const summary = await getArtistIntelligenceSummary(db, userId, days);
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[intelligence GET]', error);
    return NextResponse.json({ error: 'Could not load Artist Intelligence.' }, { status: 500 });
  }
}
