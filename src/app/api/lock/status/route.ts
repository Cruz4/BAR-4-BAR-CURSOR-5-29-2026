import { NextResponse } from 'next/server';
import { getLockFeaturePublicStatus } from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

/** Public LOCK system on/off — used by client hooks (admin-toggleable). */
export async function GET() {
  try {
    const status = await getLockFeaturePublicStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=15',
      },
    });
  } catch (err) {
    console.error('[lock/status]', err);
    return NextResponse.json(
      { enabled: false, source: 'default_off', updatedAt: null },
      { status: 200 }
    );
  }
}
