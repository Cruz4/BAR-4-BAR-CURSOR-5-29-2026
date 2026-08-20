import { NextResponse } from 'next/server';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import { isCollabSheetFeatureEnabled } from '@/lib/server/collab-sheet-feature';
import {
  closeCollabSheet,
  inviteToCollabSheet,
  listCollabSheetsForUser,
  openCollabSheet,
  refreshCollabMemberProfiles,
  revokeCollabAccess,
  sendCollabMessage,
  syncCollabSections,
} from '@/lib/server/collab-sheet';
import type { TrackSection } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    if (!(await isCollabSheetFeatureEnabled())) {
      return NextResponse.json({ error: 'Collab Sheet is off' }, { status: 404 });
    }
    const url = new URL(req.url);
    const userId = (url.searchParams.get('userId') || '').trim();
    if (!userId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }
    const sheets = await listCollabSheetsForUser(userId);
    return NextResponse.json({ sheets });
  } catch (err) {
    console.error('[collab-sheet GET]', err);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isCollabSheetFeatureEnabled())) {
      return NextResponse.json({ error: 'Collab Sheet is off' }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const action = typeof body.action === 'string' ? body.action : '';
    if (!userId || !action) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    if (action === 'open') {
      const trackId = typeof body.trackId === 'string' ? body.trackId.trim() : '';
      const albumId = typeof body.albumId === 'string' ? body.albumId.trim() : '';
      const title = typeof body.title === 'string' ? body.title : 'Untitled';
      const albumTitle = typeof body.albumTitle === 'string' ? body.albumTitle : undefined;
      const sections = Array.isArray(body.sections) ? (body.sections as TrackSection[]) : [];
      const ownerName = typeof body.ownerName === 'string' ? body.ownerName : 'Artist';
      const ownerSlug = typeof body.ownerSlug === 'string' ? body.ownerSlug : undefined;
      if (!trackId || !albumId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      const sheet = await openCollabSheet({
        ownerId: userId,
        ownerName,
        ownerSlug,
        trackId,
        albumId,
        title,
        albumTitle,
        sections,
      });
      return NextResponse.json({ sheet });
    }

    const collabId = typeof body.collabId === 'string' ? body.collabId.trim() : '';
    if (!collabId && action !== 'open') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (action === 'refresh-members') {
      const sheet = await refreshCollabMemberProfiles(collabId, userId);
      return NextResponse.json({ sheet });
    }

    if (action === 'invite') {
      const peerId = typeof body.peerId === 'string' ? body.peerId.trim() : '';
      const ownerName = typeof body.ownerName === 'string' ? body.ownerName : 'Artist';
      const peerName = typeof body.peerName === 'string' ? body.peerName : undefined;
      if (!peerId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      const sheet = await inviteToCollabSheet({
        collabId,
        ownerId: userId,
        peerId,
        ownerName,
        peerName,
      });
      return NextResponse.json({ sheet });
    }

    if (action === 'revoke') {
      const peerId = typeof body.peerId === 'string' ? body.peerId.trim() : '';
      if (!peerId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      const sheet = await revokeCollabAccess({ collabId, ownerId: userId, peerId });
      return NextResponse.json({ sheet });
    }

    if (action === 'sync') {
      const sections = Array.isArray(body.sections) ? (body.sections as TrackSection[]) : [];
      const revision = typeof body.revision === 'number' ? body.revision : 0;
      const userName = typeof body.userName === 'string' ? body.userName : 'Artist';
      const summary = typeof body.summary === 'string' ? body.summary : undefined;
      const result = await syncCollabSections({
        collabId,
        userId,
        userName,
        sections,
        revision,
        summary,
      });
      return NextResponse.json(result);
    }

    if (action === 'message') {
      const text = typeof body.text === 'string' ? body.text : '';
      const userName = typeof body.userName === 'string' ? body.userName : 'Artist';
      const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : undefined;
      const clientId = typeof body.clientId === 'string' ? body.clientId : undefined;
      const message = await sendCollabMessage({
        collabId,
        userId,
        userName,
        text,
        targetUserId,
        clientId,
      });
      return NextResponse.json({ message });
    }

    if (action === 'close') {
      await closeCollabSheet({ collabId, ownerId: userId });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (
      message.includes('Pro') ||
      message.includes('friends') ||
      message.includes('owner') ||
      message.includes('access') ||
      message.includes('message') ||
      message === 'That is you.'
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('[collab-sheet POST]', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
