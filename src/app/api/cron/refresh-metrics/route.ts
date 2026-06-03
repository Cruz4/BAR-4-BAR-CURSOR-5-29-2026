import { NextResponse } from 'next/server';
import { refreshAdminMetricsCache } from '@/lib/server/admin-metrics-cache';

export const runtime = 'nodejs';

/** Vercel Cron (or manual): Authorization: Bearer $CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metrics = await refreshAdminMetricsCache();
    return NextResponse.json({
      ok: true,
      computedAt: metrics.cache.computedAt,
      totalSignups: metrics.funnel.totalSignups,
    });
  } catch (err) {
    console.error('[cron/refresh-metrics]', err);
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
