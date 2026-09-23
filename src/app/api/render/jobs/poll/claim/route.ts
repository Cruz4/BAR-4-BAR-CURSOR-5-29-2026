import { NextResponse } from 'next/server';
import { requireCompanionDeviceToken } from '@/lib/server/render/auth';
import { claimNextJob } from '@/lib/server/render/job-service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { uid, deviceId } = await requireCompanionDeviceToken(request);
    const job = await claimNextJob(uid, deviceId);
    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
