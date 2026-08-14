import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import {
  getWeeklyChallengeAdminConfig,
  saveWeeklyChallengeConfig,
} from '@/lib/server/scene-live';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const config = await getWeeklyChallengeAdminConfig();
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/weekly-challenge GET]', err);
    return NextResponse.json({ error: 'Failed to load weekly challenge' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    const config = await saveWeeklyChallengeConfig({
      enabled: Boolean(body.enabled),
      title: typeof body.title === 'string' ? body.title : '',
      description: typeof body.description === 'string' ? body.description : '',
      targetBars: typeof body.targetBars === 'number' ? body.targetBars : Number(body.targetBars),
      adminEmail: admin.email,
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/weekly-challenge POST]', err);
    const message = err instanceof Error ? err.message : 'Failed to save weekly challenge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
