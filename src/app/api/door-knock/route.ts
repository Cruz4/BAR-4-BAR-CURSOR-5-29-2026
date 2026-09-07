import { NextResponse } from 'next/server';
import {
  deliverPendingDoorKnocks,
  dismissDoorKnockLive,
  getDoorKnockQuota,
  knockArtistHomeDoor,
  writeDoorPresence,
} from '@/lib/server/door-knock';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    const targetUserId = (searchParams.get('targetUserId') || '').trim();
    if (!userId || !targetUserId) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 400 });
    }
    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }
    const quota = await getDoorKnockQuota(userId, targetUserId);
    return NextResponse.json({ quota });
  } catch (error) {
    console.error('[door-knock GET]', error);
    return NextResponse.json({ error: 'Could not load knock quota.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'knock';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

    if (!userId) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    if (action === 'presence') {
      await writeDoorPresence(userId);
      return NextResponse.json({ ok: true });
    }

    if (action === 'deliver') {
      const delivered = await deliverPendingDoorKnocks(userId);
      return NextResponse.json({ ok: true, ...delivered });
    }

    if (action === 'dismiss-live') {
      const knockId = typeof body.knockId === 'string' ? body.knockId.trim() : '';
      if (!knockId) return NextResponse.json({ error: 'Missing knock id.' }, { status: 400 });
      await dismissDoorKnockLive(userId, knockId);
      return NextResponse.json({ ok: true });
    }

    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing target artist.' }, { status: 400 });
    }

    const result = await knockArtistHomeDoor({
      knockerId: userId,
      knockerName: typeof body.knockerName === 'string' ? body.knockerName : 'Artist',
      knockerSlug: typeof body.knockerSlug === 'string' ? body.knockerSlug : undefined,
      targetUserId,
      targetName: typeof body.targetName === 'string' ? body.targetName : 'Artist',
      targetSlug: typeof body.targetSlug === 'string' ? body.targetSlug : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 429 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('[door-knock POST]', error);
    return NextResponse.json({ error: 'Knock failed.' }, { status: 500 });
  }
}
