import { NextResponse } from 'next/server';
import { requireBearerUid } from '@/lib/server/render/auth';
import { cancelRenderJob } from '@/lib/server/render/job-service';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const uid = await requireBearerUid(request);
    const { jobId } = await context.params;
    await cancelRenderJob(uid, jobId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
