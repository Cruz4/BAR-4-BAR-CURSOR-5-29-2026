import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import {
  getCollabSheetAdminConfig,
  saveCollabSheetFeatureConfig,
} from '@/lib/server/collab-sheet-feature';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const config = await getCollabSheetAdminConfig();
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/collab-sheet GET]', err);
    return NextResponse.json({ error: 'Failed to load Collab Sheet config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body.enabled);

    const config = await saveCollabSheetFeatureConfig({
      enabled,
      adminEmail: admin.email,
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/collab-sheet POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to save Collab Sheet config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
