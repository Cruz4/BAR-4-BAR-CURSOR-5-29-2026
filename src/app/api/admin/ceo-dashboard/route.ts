import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getCeoDashboardSnapshot } from '@/lib/server/analytics-v2';
import { getProductSurfaces } from '@/lib/server/product-surfaces';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const surfaces = await getProductSurfaces();
    if (surfaces.ceoDashboard === 'off') {
      return NextResponse.json({ error: 'CEO dashboard is offline.' }, { status: 404 });
    }
    if (surfaces.ceoDashboard !== 'v2') {
      return NextResponse.json(
        { error: 'CEO dashboard V2 is not enabled. Set product surface ceoDashboard=v2.' },
        { status: 409 }
      );
    }
    const snapshot = await getCeoDashboardSnapshot();
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/ceo-dashboard]', err);
    return NextResponse.json({ error: 'Failed to load CEO dashboard' }, { status: 500 });
  }
}
