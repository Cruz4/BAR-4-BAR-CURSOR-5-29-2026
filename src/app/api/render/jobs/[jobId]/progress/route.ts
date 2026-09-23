import { NextResponse } from 'next/server';
import { requireCompanionDeviceToken } from '@/lib/server/render/auth';
import { transitionRenderJob } from '@/lib/server/render/job-service';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { uid } = await requireCompanionDeviceToken(request);
    const { jobId } = await context.params;
    const body = (await request.json()) as { progressPct?: number; status?: string };
    const progressPct = typeof body.progressPct === 'number' ? body.progressPct : 0;
    const status = body.status === 'generating' ? 'generating' : 'generating';
    const job = await transitionRenderJob(uid, jobId, status, { progressPct });
    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
