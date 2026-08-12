import { NextResponse } from 'next/server';
import { verifyAdminRequest, AdminAuthError } from '@/lib/server/admin-auth';
import { hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { updateGamificationSettings } from '@/lib/server/gamification';

export const runtime = 'nodejs';

/**
 * Admin: moderate public visibility.
 * - `publicProfile: false` takes Artist Home offline and prunes publicProfiles.
 * - `publicProfile: true` flips live (requires / allocates a profile slug via settings).
 * - `hidden` still toggles leaderboardHidden.
 */
export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  if (!hasAdminFirestoreCredentials()) {
    return NextResponse.json({ error: 'Admin credentials required' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId =
    typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
  const hasPublic =
    typeof body.publicProfile === 'boolean' ? (body.publicProfile as boolean) : undefined;
  const hasHidden = typeof body.hidden === 'boolean' ? (body.hidden as boolean) : undefined;

  if (!targetUserId || (hasPublic === undefined && hasHidden === undefined)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const summary = await updateGamificationSettings(targetUserId, {
      ...(hasPublic !== undefined ? { publicProfile: hasPublic } : {}),
      ...(hasHidden !== undefined ? { leaderboardHidden: hasHidden } : {}),
    });

    return NextResponse.json({
      ok: true,
      publicProfile: Boolean(summary.publicProfile),
      leaderboardHidden: Boolean(summary.leaderboardHidden),
      profileSlug: summary.profileSlug || null,
    });
  } catch (err) {
    console.error('[admin/gamification/moderate]', err);
    const message = err instanceof Error ? err.message : 'Moderate failed';
    if (/already taken|not allowed|reserved|at least 2|32 characters|lowercase/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
