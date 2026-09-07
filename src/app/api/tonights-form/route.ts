import { NextResponse } from 'next/server';
import { getTonightsFormPublic } from '@/lib/server/tonights-form';

export const runtime = 'nodejs';

/** Public Tonight's Form state for The Scene. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim() || undefined;
    const data = await getTonightsFormPublic(userId);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=8, s-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('[tonights-form GET]', error);
    return NextResponse.json({ error: 'Could not load Tonight\'s Form.' }, { status: 500 });
  }
}
