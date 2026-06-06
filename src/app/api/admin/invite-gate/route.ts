import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { getInviteGateAdminConfig, saveInviteGateConfig } from '@/lib/server/invite-gate';
import { DEFAULT_INVITE_GATE_COPY } from '@/lib/invite-gate';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const config = await getInviteGateAdminConfig();
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/invite-gate GET]', err);
    return NextResponse.json({ error: 'Failed to load invite gate' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = await req.json().catch(() => ({}));

    const enabled = Boolean(body.enabled);
    const code = typeof body.code === 'string' ? body.code : undefined;
    const copy = {
      headline:
        typeof body.headline === 'string' && body.headline.trim()
          ? body.headline.trim()
          : DEFAULT_INVITE_GATE_COPY.headline,
      subheadline:
        typeof body.subheadline === 'string' && body.subheadline.trim()
          ? body.subheadline.trim()
          : DEFAULT_INVITE_GATE_COPY.subheadline,
      ctaLabel:
        typeof body.ctaLabel === 'string' && body.ctaLabel.trim()
          ? body.ctaLabel.trim()
          : DEFAULT_INVITE_GATE_COPY.ctaLabel,
      successHeadline:
        typeof body.successHeadline === 'string' && body.successHeadline.trim()
          ? body.successHeadline.trim()
          : DEFAULT_INVITE_GATE_COPY.successHeadline,
      successSubheadline:
        typeof body.successSubheadline === 'string' && body.successSubheadline.trim()
          ? body.successSubheadline.trim()
          : DEFAULT_INVITE_GATE_COPY.successSubheadline,
      loginBanner:
        typeof body.loginBanner === 'string' && body.loginBanner.trim()
          ? body.loginBanner.trim()
          : DEFAULT_INVITE_GATE_COPY.loginBanner,
    };

    if (enabled && !code?.trim()) {
      const existing = await getInviteGateAdminConfig();
      if (!existing.hasCode) {
        return NextResponse.json(
          { error: 'Set an access code before enabling the gate.' },
          { status: 400 }
        );
      }
    }

    const config = await saveInviteGateConfig({
      enabled,
      code,
      copy,
      adminEmail: admin.email,
    });
    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('[admin/invite-gate POST]', err);
    return NextResponse.json({ error: 'Failed to save invite gate' }, { status: 500 });
  }
}
