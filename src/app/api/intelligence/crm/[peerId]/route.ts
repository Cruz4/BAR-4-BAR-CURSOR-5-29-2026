import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getProductSurfaces } from '@/lib/server/product-surfaces';
import { patchSupportCrmOverlay } from '@/lib/server/support-crm';
import type { SupportCrmOverlayPatch } from '@/lib/support-crm';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ peerId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { peerId: rawPeerId } = await context.params;
    const peerId = (rawPeerId || '').trim();
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

    if (!userId || !peerId) {
      return NextResponse.json({ error: 'Missing user or peer.' }, { status: 400 });
    }
    if (userId === peerId) {
      return NextResponse.json({ error: 'Cannot CRM yourself.' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    const surfaces = await getProductSurfaces();
    if (surfaces.supportCircle !== 'crm') {
      return NextResponse.json(
        { error: 'Artist Intelligence CRM is not enabled.' },
        { status: 409 }
      );
    }

    const patch: SupportCrmOverlayPatch = {};
    if ('notes' in body) {
      if (typeof body.notes !== 'string') {
        return NextResponse.json({ error: 'notes must be a string.' }, { status: 400 });
      }
      patch.notes = body.notes;
    }
    if ('tags' in body) {
      if (!Array.isArray(body.tags) || body.tags.some((t: unknown) => typeof t !== 'string')) {
        return NextResponse.json({ error: 'tags must be a string array.' }, { status: 400 });
      }
      patch.tags = body.tags;
    }
    if ('snoozedUntil' in body) {
      if (body.snoozedUntil !== null && typeof body.snoozedUntil !== 'string') {
        return NextResponse.json({ error: 'snoozedUntil must be ISO string or null.' }, { status: 400 });
      }
      patch.snoozedUntil = body.snoozedUntil;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No overlay fields to update.' }, { status: 400 });
    }

    const db = await getDb();
    const overlay = await patchSupportCrmOverlay(db, userId, peerId, patch);
    return NextResponse.json({ overlay }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[intelligence/crm PATCH]', error);
    return NextResponse.json({ error: 'Could not update CRM overlay.' }, { status: 500 });
  }
}
