import { NextResponse } from 'next/server';
import { requireCompanionDeviceToken } from '@/lib/server/render/auth';
import { heartbeatDevice } from '@/lib/server/render/device-service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { uid, deviceId } = await requireCompanionDeviceToken(request);
    const token = request.headers.get('x-render-device-token')!.trim();
    const body = (await request.json()) as Record<string, unknown>;
    await heartbeatDevice(uid, deviceId, token, {
      capability:
        body.capability === 'degraded' || body.capability === 'cloud_only'
          ? body.capability
          : 'compatible',
      companionVersion:
        typeof body.companionVersion === 'string' ? body.companionVersion : undefined,
      modelRevisions:
        body.modelRevisions && typeof body.modelRevisions === 'object'
          ? (body.modelRevisions as Record<string, string>)
          : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[render/devices/heartbeat]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
