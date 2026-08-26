import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import {
  getFirstDropsAdminConfig,
  saveFirstDropsConfig,
} from '@/lib/server/first-drops-feature';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const config = await getFirstDropsAdminConfig();
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/first-drops GET]', err);
    return NextResponse.json({ error: 'Failed to load Music Releases' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body.enabled);

    const config = await saveFirstDropsConfig({
      enabled,
      adminEmail: admin.email,
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/first-drops POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to save Music Releases';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
