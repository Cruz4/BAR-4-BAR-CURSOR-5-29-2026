import { NextResponse } from 'next/server';
import { getInviteGatePublicStatus } from '@/lib/server/invite-gate';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getInviteGatePublicStatus();
    return NextResponse.json(status);
  } catch (err) {
    console.error('[invite-gate/status]', err);
    return NextResponse.json({ enabled: false, version: 1, copy: {} }, { status: 200 });
  }
}
