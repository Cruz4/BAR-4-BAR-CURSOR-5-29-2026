import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import {
  getSupportDashboard,
  getSupportRelationshipState,
  setSupportRelationship,
} from '@/lib/server/relationships';
import { emitActivityEvent } from '@/lib/server/activity';
import type { SupportAnalyticsWindow } from '@/lib/relationships';

export const runtime = 'nodejs';

async function requireUser(req: Request, userId: string): Promise<NextResponse | null> {
  try {
    await verifyCheckoutUser(req, userId);
    return null;
  } catch (error) {
    if (error instanceof CheckoutAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    const targetUserId = (searchParams.get('targetUserId') || '').trim();
    const view = searchParams.get('view');
    const requestedDays = Number(searchParams.get('days'));
    const days: SupportAnalyticsWindow =
      requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;
    if (!userId) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const authError = await requireUser(req, userId);
    if (authError) return authError;
    const db = await getDb();
    if (view === 'dashboard') {
      return NextResponse.json(await getSupportDashboard(db, userId, days), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    if (!targetUserId) return NextResponse.json({ error: 'Missing profile.' }, { status: 400 });
    return NextResponse.json(
      await getSupportRelationshipState(db, userId, targetUserId),
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[relationships GET]', error);
    return NextResponse.json({ error: 'Could not load support relationships.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    const action = body.action;
    if (
      !userId ||
      !targetUserId ||
      !['follow', 'unfollow', 'inner_circle_on', 'inner_circle_off'].includes(action)
    ) {
      return NextResponse.json({ error: 'Invalid relationship request.' }, { status: 400 });
    }
    const authError = await requireUser(req, userId);
    if (authError) return authError;
    const db = await getDb();
    const result = await setSupportRelationship(db, {
      actorId: userId,
      targetId: targetUserId,
      action,
    });
    if (result.newlyInnerCircle) {
      await emitActivityEvent({
        type: 'inner_circle_joined',
        actorId: result.actor.userId,
        actorName: result.actor.displayName,
        actorSlug: result.actor.profileSlug,
        recipientId: result.target.userId,
        recipientName: result.target.displayName,
        href: result.actor.profileSlug ? `/profile/${result.actor.profileSlug}` : '/supporters',
      }).catch((error) => console.warn('[relationships activity]', error));
    } else if (result.newlyFollowed) {
      await emitActivityEvent({
        type: 'profile_followed',
        actorId: result.actor.userId,
        actorName: result.actor.displayName,
        actorSlug: result.actor.profileSlug,
        recipientId: result.target.userId,
        recipientName: result.target.displayName,
        href: result.actor.profileSlug ? `/profile/${result.actor.profileSlug}` : '/supporters',
      }).catch((error) => console.warn('[relationships activity]', error));
    }
    return NextResponse.json(result.state);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update relationship.';
    const expected = /another profile|offline|unavailable|not found/i.test(message);
    console.error('[relationships POST]', error);
    return NextResponse.json({ error: expected ? message : 'Could not update relationship.' }, { status: expected ? 400 : 500 });
  }
}
