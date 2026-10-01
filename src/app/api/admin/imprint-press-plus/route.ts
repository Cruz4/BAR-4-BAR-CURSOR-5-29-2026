import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import {
  getImprintPressPlusAdminConfig,
  saveImprintPressPlusConfig,
} from '@/lib/server/imprint-press-plus-feature';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const config = await getImprintPressPlusAdminConfig();
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/imprint-press-plus GET]', err);
    return NextResponse.json({ error: 'Failed to load Imprint plus' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body.enabled);
    const config = await saveImprintPressPlusConfig({
      enabled,
      adminEmail: admin.email,
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/imprint-press-plus POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to save Imprint plus';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
