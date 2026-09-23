import { NextResponse } from 'next/server';
import { getSongGenerationSurfaces } from '@/lib/server/render/feature-flags';
import { getRenderOpsConfig } from '@/lib/server/render/kill-switch';
import { listOnlineDevices } from '@/lib/server/render/device-service';
import { requireBearerUid } from '@/lib/server/render/auth';
import { isDevRenderAutoWorkerEnabled } from '@/lib/server/render/dev-worker';
import { isFalAceConfiguredAsync } from '@/lib/server/render/fal-ace-step';
import { shouldAutoProcessRenderJob } from '@/lib/server/render/managed-worker';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const surfaces = await getSongGenerationSurfaces();
    const ops = await getRenderOpsConfig();
    let devices: unknown[] = [];
    try {
      const uid = await requireBearerUid(request);
      devices = await listOnlineDevices(uid);
    } catch {
      devices = [];
    }
    const studioAutoRender = await shouldAutoProcessRenderJob();
    const aceConfigured = await isFalAceConfiguredAsync();
    return NextResponse.json({
      surfaces,
      cloudSpendPaused: Boolean(ops.cloudSpendPaused),
      devAutoWorker: isDevRenderAutoWorkerEnabled(),
      aceConfigured,
      studioAutoRender,
      onlineDevices: devices.map((d) => ({
        id: (d as { id: string }).id,
        label: (d as { label: string }).label,
        capability: (d as { capability: string }).capability,
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[render/status]', err);
    return NextResponse.json({ error: 'Failed to load render status' }, { status: 500 });
  }
}
