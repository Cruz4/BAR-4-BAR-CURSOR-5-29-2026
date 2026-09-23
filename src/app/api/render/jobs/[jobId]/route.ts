import { NextResponse } from 'next/server';
import { requireBearerUid } from '@/lib/server/render/auth';
import { getRenderJob } from '@/lib/server/render/job-service';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const uid = await requireBearerUid(request);
    const { jobId } = await context.params;
    const job = await getRenderJob(uid, jobId);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
