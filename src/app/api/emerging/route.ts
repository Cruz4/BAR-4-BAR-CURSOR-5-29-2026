import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { getEmergingRanking } from '@/lib/server/emerging-ranking';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getEmergingRanking(await getDb());
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('[emerging ranking]', error);
    return NextResponse.json({ error: 'Could not load emerging rankings.' }, { status: 500 });
  }
}
