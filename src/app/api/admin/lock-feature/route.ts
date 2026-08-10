import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import {
  getLockFeatureAdminConfig,
  saveLockFeatureConfig,
} from '@/lib/server/lock-feature';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const config = await getLockFeatureAdminConfig();
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/lock-feature GET]', err);
    return NextResponse.json({ error: 'Failed to load LOCK feature' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body.enabled);

    const config = await saveLockFeatureConfig({
      enabled,
      adminEmail: admin.email,
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/lock-feature POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to save LOCK feature';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
