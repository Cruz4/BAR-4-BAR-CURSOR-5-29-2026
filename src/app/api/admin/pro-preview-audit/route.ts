import { NextResponse } from 'next/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import {
  applyProPreviewAudit,
  dryRunProPreviewAudit,
} from '@/lib/server/pro-preview-audit';

export const runtime = 'nodejs';

/**
 * POST { mode: 'dry_run' | 'apply' }
 * Apply requires body.confirm === true (explicit production approval).
 */
export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = (await req.json().catch(() => ({}))) as {
      mode?: unknown;
      confirm?: unknown;
    };

    const mode = body.mode === 'apply' ? 'apply' : body.mode === 'dry_run' ? 'dry_run' : null;
    if (!mode) {
      return NextResponse.json(
        { error: "mode must be 'dry_run' or 'apply'" },
        { status: 400 }
      );
    }

    if (mode === 'dry_run') {
      return NextResponse.json(await dryRunProPreviewAudit());
    }

    if (body.confirm !== true) {
      return NextResponse.json(
        {
          error:
            'apply requires confirm: true — run dry_run first and approve the mismatch list',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await applyProPreviewAudit({
        adminUid: admin.uid,
        adminEmail: admin.email,
      })
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[admin/pro-preview-audit POST]', error);
    const message = error instanceof Error ? error.message : 'Pro preview audit failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
