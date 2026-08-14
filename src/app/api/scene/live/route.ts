import { NextResponse } from 'next/server';
import { getSceneLivePublic } from '@/lib/server/scene-live';
import { DEFAULT_HOUSE_BAR, DEFAULT_WEEKLY_CHALLENGE } from '@/lib/scene/live-events';

export const runtime = 'nodejs';

/** Public Scene pins — house bar of the day + weekly challenge. */
export async function GET() {
  try {
    const data = await getSceneLivePublic();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[scene/live]', err);
    return NextResponse.json(
      { houseBar: DEFAULT_HOUSE_BAR, weeklyChallenge: DEFAULT_WEEKLY_CHALLENGE },
      { status: 200 }
    );
  }
}
