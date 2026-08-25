import { NextResponse } from 'next/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import {
  getSceneLayoutAdminConfig,
  saveSceneLayoutConfig,
} from '@/lib/server/scene-layout';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    return NextResponse.json(await getSceneLayoutAdminConfig());
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[admin/scene-layout GET]', error);
    return NextResponse.json({ error: 'Failed to load Scene layout' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    if (typeof body.portalHubEnabled !== 'boolean') {
      return NextResponse.json({ error: 'portalHubEnabled must be a boolean' }, { status: 400 });
    }

    return NextResponse.json(
      await saveSceneLayoutConfig({
        portalHubEnabled: body.portalHubEnabled,
        adminEmail: admin.email,
      })
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[admin/scene-layout POST]', error);
    const message = error instanceof Error ? error.message : 'Failed to save Scene layout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
