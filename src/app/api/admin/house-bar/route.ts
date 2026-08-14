import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getHouseBarAdminConfig, saveHouseBarConfig } from '@/lib/server/scene-live';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const config = await getHouseBarAdminConfig();
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/house-bar GET]', err);
    return NextResponse.json({ error: 'Failed to load house bar' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    const config = await saveHouseBarConfig({
      enabled: Boolean(body.enabled),
      seedBar: typeof body.seedBar === 'string' ? body.seedBar : '',
      title: typeof body.title === 'string' ? body.title : undefined,
      adminEmail: admin.email,
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/house-bar POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to save house bar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
