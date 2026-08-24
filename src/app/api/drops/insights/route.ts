import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getDb } from '@/lib/firebase/server';
import { getDropInsights } from '@/lib/server/drop-insights';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    const days = Number(searchParams.get('days') || 30);
    if (!userId) return NextResponse.json({ error: 'Missing user.' }, { status: 400 });
    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }
    const db = await getDb();
    const insights = await getDropInsights(db, userId, days);
    return NextResponse.json(insights, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[drops/insights]', error);
    return NextResponse.json({ error: 'Could not load listener insights.' }, { status: 500 });
  }
}

