import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  getInviteGatePublicStatus,
  inviteUnlockCookieOptions,
  verifyInviteCodeAttempt,
} from '@/lib/server/invite-gate';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const status = await getInviteGatePublicStatus();
    if (!status.enabled) {
      return NextResponse.json({ ok: true, alreadyOpen: true, version: status.version });
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code : '';
    if (!code.trim()) {
      return NextResponse.json({ ok: false, error: 'Enter your access code.' }, { status: 400 });
    }

    const result = await verifyInviteCodeAttempt(code);
    if (!result.ok || !result.token) {
      return NextResponse.json({ ok: false, error: 'Invalid access code. Try again.' }, { status: 401 });
    }

    const cookieOpts = inviteUnlockCookieOptions(result.version);
    const cookieStore = await cookies();
    cookieStore.set(cookieOpts);

    return NextResponse.json({
      ok: true,
      version: result.version,
      copy: status.copy,
    });
  } catch (err) {
    console.error('[invite-gate/verify]', err);
    return NextResponse.json({ ok: false, error: 'Could not verify code.' }, { status: 500 });
  }
}
