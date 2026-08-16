import { NextResponse } from 'next/server';
import { getFirstDropsPublicStatus } from '@/lib/server/first-drops-feature';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getFirstDropsPublicStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=15',
      },
    });
  } catch (err) {
    console.error('[drops/status]', err);
    return NextResponse.json(
      { enabled: true, source: 'default_on', updatedAt: null },
      { status: 200 }
    );
  }
}
