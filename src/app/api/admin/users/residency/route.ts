import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { isAdminResidencyMode } from '@/lib/admin-residency';
import { applyAdminResidency } from '@/lib/server/admin-residency';

export const runtime = 'nodejs';

/** Admin: set LOCAL, admin-held Pro, or Stripe-backed Pro after a live Stripe lookup. */
export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  try {
    const { hasAdminFirestoreCredentials } = await import('@/lib/firebase/admin-sdk-credentials');
    const { getDb } = await import('@/lib/firebase/server');
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Admin credentials required' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : '';

    if (!targetUserId || !isAdminResidencyMode(mode)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();
    const result = await applyAdminResidency(db, targetUserId, mode);
    return NextResponse.json({
      ok: true,
      ...result,
      user: {
        subscriptionStatus: result.subscriptionStatus,
        subscriptionTier: result.subscriptionTier,
        proSource: result.proSource ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Residency update failed';
    const clientError =
      /no active stripe|they have an active stripe|artist not found|stripe is not configured/i.test(
        message
      );
    console.warn('[admin/users/residency]', err);
    return NextResponse.json({ error: message }, { status: clientError ? 400 : 500 });
  }
}
