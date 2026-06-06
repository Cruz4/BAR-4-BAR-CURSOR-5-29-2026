import { NextResponse } from 'next/server';
import { hasValidInviteUnlockCookie, getInviteGatePublicStatus } from '@/lib/server/invite-gate';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getInviteGatePublicStatus();
    if (!status.enabled) {
      return NextResponse.json({ unlocked: true, gateEnabled: false });
    }
    const unlocked = await hasValidInviteUnlockCookie();
    return NextResponse.json({ unlocked, gateEnabled: true, version: status.version });
  } catch (err) {
    console.error('[invite-gate/session]', err);
    return NextResponse.json({ unlocked: true, gateEnabled: false });
  }
}
