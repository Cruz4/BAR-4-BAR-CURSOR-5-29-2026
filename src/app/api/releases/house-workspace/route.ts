import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { loadHouseWorkspace, saveHouseWorkspace } from '@/lib/server/house-release-manage';
import type { Album } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = (url.searchParams.get('userId') || '').trim();
    const shareId = (url.searchParams.get('shareId') || '').trim();
    if (!userId || !shareId) {
      return NextResponse.json({ error: 'Missing release.' }, { status: 400 });
    }
    await verifyCheckoutUser(req, userId);
    const db = await getDb();
    const workspace = await loadHouseWorkspace(db, shareId, userId);
    if (!workspace) {
      return NextResponse.json({ error: 'You cannot manage this House release.' }, { status: 404 });
    }
    return NextResponse.json(workspace);
  } catch (error) {
    if (error instanceof CheckoutAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[releases/house-workspace GET]', error);
    return NextResponse.json({ error: 'Could not open this House release.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim() : '';
    const album = body.album && typeof body.album === 'object' ? (body.album as Album) : null;
    const deletedTrackIds = Array.isArray(body.deletedTrackIds)
      ? body.deletedTrackIds.filter((id): id is string => typeof id === 'string')
      : [];
    if (!userId || !shareId || !album?.id) {
      return NextResponse.json({ error: 'Invalid House release update.' }, { status: 400 });
    }
    await verifyCheckoutUser(req, userId);
    const db = await getDb();
    const workspace = await saveHouseWorkspace(db, shareId, userId, album, deletedTrackIds);
    if (!workspace) {
      return NextResponse.json({ error: 'You cannot update this House release.' }, { status: 403 });
    }
    return NextResponse.json({ ok: true, ...workspace });
  } catch (error) {
    if (error instanceof CheckoutAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('[releases/house-workspace PUT]', error);
    return NextResponse.json({ error: 'Could not save this House release.' }, { status: 500 });
  }
}
