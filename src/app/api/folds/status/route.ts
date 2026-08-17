import { NextResponse } from 'next/server';
import { getFoldsPublicStatus } from '@/lib/server/folds-feature';

export const runtime = 'nodejs';

/** Public Folds on/off — used by client hooks (admin-toggleable). */
export async function GET() {
  try {
    const status = await getFoldsPublicStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=15',
      },
    });
  } catch (err) {
    console.error('[folds/status]', err);
    return NextResponse.json(
      { enabled: true, source: 'default_on', updatedAt: null },
      { status: 200 }
    );
  }
}
