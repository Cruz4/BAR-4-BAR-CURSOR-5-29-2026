import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { getMusicCharts } from '@/lib/server/music-charts';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackLimit = Number(searchParams.get('trackLimit')) || 100;
    const artistLimit = Number(searchParams.get('artistLimit')) || 50;
    const charts = await getMusicCharts(await getDb(), new Date(), { trackLimit, artistLimit });
    return NextResponse.json(charts, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[music charts]', error);
    return NextResponse.json({ error: 'Could not load the music charts.' }, { status: 500 });
  }
}
