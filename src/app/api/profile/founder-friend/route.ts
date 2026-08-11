import { NextResponse } from 'next/server';
import { getAuth, getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { NEOMAIYA_SOL } from '@/lib/profile/neomaiya-sol';
import { ensureDefaultFounderWelcome } from '@/lib/server/default-founder-friend';

export const runtime = 'nodejs';

function friendshipIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/**
 * Neomaiya Sol only — seed (or refresh) an accepted founder friendship with a
 * legacy artist who never got the signup auto-add.
 *
 * Does not recreate edges after an intentional unfriend (dismissal / seed flag).
 */
export async function POST(request: Request) {
  try {
    if (!hasAdminFirestoreCredentials()) {
      return NextResponse.json({ error: 'Server unavailable' }, { status: 503 });
    }

    const header = request.headers.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length));
    const caller = await auth.getUser(decoded.uid);
    const callerEmail = (caller.email || decoded.email || '').trim().toLowerCase();
    if (callerEmail !== NEOMAIYA_SOL.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as {
      targetUserId?: string;
      targetName?: string;
      targetSlug?: string;
    } | null;

    const targetUserId = typeof body?.targetUserId === 'string' ? body.targetUserId.trim() : '';
    if (!targetUserId || targetUserId === caller.uid) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    const targetName =
      (typeof body?.targetName === 'string' && body.targetName.trim()) || 'Artist';
    const targetSlug =
      typeof body?.targetSlug === 'string' && body.targetSlug.trim()
        ? body.targetSlug.trim()
        : undefined;

    const db = await getDb();
    const pairId = friendshipIdFor(caller.uid, targetUserId);

    let dismissed = false;
    try {
      dismissed = (await db.doc(`founderFriendDismissals/${pairId}`).get()).exists;
    } catch {
      /* ignore */
    }

    const targetUserSnap = await db.doc(`users/${targetUserId}`).get();
    const alreadySeeded = Boolean(
      (targetUserSnap.data() as { founderWelcome?: { friendshipSeededAt?: string } } | undefined)
        ?.founderWelcome?.friendshipSeededAt
    );

    const before = await db.doc(`friendships/${pairId}`).get();
    if (!before.exists && (dismissed || alreadySeeded)) {
      return NextResponse.json({
        ok: true,
        seeded: false,
        reason: 'dismissed',
        friendshipId: pairId,
      });
    }

    await ensureDefaultFounderWelcome(db, auth, targetUserId, {
      name: targetName,
      ...(targetSlug ? { slug: targetSlug } : {}),
    });

    const after = await db.doc(`friendships/${pairId}`).get();
    if (!after.exists) {
      return NextResponse.json({
        ok: true,
        seeded: false,
        reason: 'skipped',
        friendshipId: pairId,
      });
    }

    const data = after.data() || {};
    // Always clear stale Accept UI if we're now friends (or Neo's pending was upgraded).
    if (data.status === 'accepted') {
      try {
        const { clearFriendRequestActivityFromActor } = await import('@/lib/server/activity');
        await clearFriendRequestActivityFromActor(targetUserId, caller.uid);
      } catch {
        /* optional */
      }
    }

    return NextResponse.json({
      ok: true,
      seeded: true,
      friendship: {
        id: after.id,
        uids: data.uids,
        requestedBy: data.requestedBy,
        status: data.status,
        profiles: data.profiles || {},
        createdAt: data.createdAt || '',
        respondedAt: data.respondedAt,
      },
    });
  } catch (err) {
    console.warn('[profile/founder-friend]', err);
    return NextResponse.json({ error: 'Could not seed friendship' }, { status: 500 });
  }
}
