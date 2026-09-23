import { NextResponse } from 'next/server';
import { requireCompanionDeviceToken } from '@/lib/server/render/auth';
import { completeRenderJob } from '@/lib/server/render/job-service';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { uid } = await requireCompanionDeviceToken(request);
    const { jobId } = await context.params;
    const body = (await request.json()) as { durationSec?: number };
    const durationSec = typeof body.durationSec === 'number' ? body.durationSec : 240;
    const take = await completeRenderJob(uid, jobId, { durationSec });
    return NextResponse.json({ take });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
