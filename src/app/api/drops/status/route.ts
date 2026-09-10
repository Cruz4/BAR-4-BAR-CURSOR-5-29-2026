import { NextResponse } from 'next/server';
import { getFirstDropsPublicStatus } from '@/lib/server/first-drops-feature';
import { getFreeDropsPublicStatus } from '@/lib/server/free-drops-feature';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [status, freeDrops] = await Promise.all([
      getFirstDropsPublicStatus(),
      getFreeDropsPublicStatus(),
    ]);
    return NextResponse.json({ ...status, freeDrops }, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=15',
      },
    });
  } catch (err) {
    console.error('[drops/status]', err);
    return NextResponse.json(
      {
        enabled: true,
        source: 'default_on',
        updatedAt: null,
        freeDrops: { enabled: true, source: 'default_on', updatedAt: null },
      },
      { status: 200 }
    );
  }
}
