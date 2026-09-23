import { NextResponse } from 'next/server';
import { requireBearerUid } from '@/lib/server/render/auth';
import {
  completePairing,
  createPairingChallenge,
} from '@/lib/server/render/device-service';
import { assertSongGenerationEnabled } from '@/lib/server/render/feature-flags';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await assertSongGenerationEnabled();
    const uid = await requireBearerUid(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : 'create';

    if (action === 'create') {
      const challenge = await createPairingChallenge(uid);
      return NextResponse.json(challenge);
    }

    if (action === 'complete') {
      const code = typeof body.code === 'string' ? body.code : '';
      const label = typeof body.label === 'string' ? body.label : 'Render PC';
      const capability =
        body.capability === 'degraded' || body.capability === 'cloud_only'
          ? body.capability
          : 'compatible';
      const companionVersion =
        typeof body.companionVersion === 'string' ? body.companionVersion : '0.0.0';
      const result = await completePairing(uid, code, label, capability, companionVersion);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[render/devices/pair]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
