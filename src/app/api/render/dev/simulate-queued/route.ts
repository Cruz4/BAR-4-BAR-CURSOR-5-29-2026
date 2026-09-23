import { NextResponse } from 'next/server';
import { requireBearerUid } from '@/lib/server/render/auth';
import { getRenderJob } from '@/lib/server/render/job-service';
import { simulateLocalRenderJob } from '@/lib/server/render/dev-worker';

export const runtime = 'nodejs';

/** Dev: finish a stuck queued local job (same as RENDER_DEV_AUTO_WORKER). */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  try {
    const uid = await requireBearerUid(request);
    const body = (await request.json()) as { jobId?: string };
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

    const job = await getRenderJob(uid, jobId);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (job.route !== 'local') {
      return NextResponse.json({ error: 'Only local jobs can be simulated in dev.' }, { status: 400 });
    }

    await simulateLocalRenderJob(uid, jobId, { skipEnvGate: true });
    const updated = await getRenderJob(uid, jobId);
    return NextResponse.json({ ok: true, job: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Simulate failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
