import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import { isHouseReleaseDocument, shareDocumentVisibility } from '@/lib/release-management';
import type { HouseReleaseAdminRow } from '@/lib/admin-house-releases';

export const runtime = 'nodejs';

function safeId(value: unknown, max = 200): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= max
    && !value.includes('/');
}

function ownerTargetPath(share: Record<string, unknown>, payload: Record<string, unknown>): string {
  const ownerId = typeof share.ownerId === 'string' ? share.ownerId : '';
  const projectId = typeof share.projectId === 'string' ? share.projectId : '';
  const albumId = typeof payload.albumId === 'string' ? payload.albumId : '';
  if (!ownerId || !projectId) return '';
  if (share.type === 'album') return `users/${ownerId}/albums/${projectId}`;
  if (albumId) return `users/${ownerId}/albums/${albumId}/tracks/${projectId}`;
  return '';
}

function rowFromShare(
  shareId: string,
  share: Record<string, unknown>
): HouseReleaseAdminRow | null {
  if (!isHouseReleaseDocument(share)) return null;
  const payload = share.data && typeof share.data === 'object'
    ? (share.data as Record<string, unknown>)
    : {};
  const ownerId = typeof share.ownerId === 'string' ? share.ownerId : '';
  const projectId = typeof share.projectId === 'string' ? share.projectId : '';
  if (!ownerId || !projectId) return null;
  const scope = share.type === 'album' ? 'album' : 'track';
  const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
  const albumId = typeof payload.albumId === 'string' ? payload.albumId : undefined;
  return {
    shareId,
    title:
      typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : scope === 'album'
          ? 'Untitled album'
          : 'Untitled track',
    scope,
    ownerId,
    ownerName:
      typeof share.ownerName === 'string' && share.ownerName.trim()
        ? share.ownerName.trim()
        : 'Artist',
    albumId: scope === 'album' ? projectId : albumId,
    trackId: scope === 'track' ? projectId : undefined,
    trackCount: scope === 'album' ? tracks.length : 1,
    live: shareDocumentVisibility(share).releaseLive,
    houseLibraryNotice: share.houseLibraryNotice === true,
  };
}

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const db = await getDb();
    const snap = await db.collection('shares').where('houseRelease', '==', true).get();
    const items = snap.docs
      .map((doc) => rowFromShare(doc.id, (doc.data() || {}) as Record<string, unknown>))
      .filter((row): row is HouseReleaseAdminRow => Boolean(row))
      .sort((a, b) => a.title.localeCompare(b.title));
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[admin/house-releases GET]', error);
    return NextResponse.json({ error: 'Could not load House releases.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim().toUpperCase() : '';
    const action = body.action === 'remove' ? 'remove' : body.action === 'revoke' ? 'revoke' : '';
    if (!safeId(shareId) || !action) {
      return NextResponse.json({ error: 'Invalid House-release action.' }, { status: 400 });
    }

    const db = await getDb();
    const shareRef = db.doc(`shares/${shareId}`);
    const shareSnap = await shareRef.get();
    if (!shareSnap.exists) {
      return NextResponse.json({ error: 'House release not found.' }, { status: 404 });
    }
    const share = (shareSnap.data() || {}) as Record<string, unknown>;
    if (share.houseRelease !== true) {
      return NextResponse.json({ error: 'This share is not a House release.' }, { status: 409 });
    }

    const payload = share.data && typeof share.data === 'object'
      ? (share.data as Record<string, unknown>)
      : {};
    const now = new Date().toISOString();
    const ownerId = typeof share.ownerId === 'string' ? share.ownerId : '';
    const targetPath = ownerTargetPath(share, payload);
    const batch = db.batch();
    const houseOff = {
      houseRelease: false,
      houseLibraryNotice: false,
      updatedAt: now,
      'data.houseRelease': false,
    };

    if (action === 'revoke') {
      batch.set(shareRef, houseOff, { merge: true });
      if (targetPath) {
        batch.set(db.doc(targetPath), {
          houseRelease: false,
          houseLibraryNotice: false,
          updatedAt: now,
        }, { merge: true });
      }
      await batch.commit();
      return NextResponse.json({ ok: true, action, shareId, houseRelease: false });
    }

    batch.set(shareRef, {
      ...houseOff,
      releaseStatus: 'unlisted',
      releaseRemovedAt: now,
      unpressedAt: now,
      'data.releaseStatus': 'unlisted',
    }, { merge: true });
    if (targetPath) {
      batch.set(db.doc(targetPath), {
        releaseStatus: 'draft',
        releaseShareId: FieldValue.delete(),
        houseRelease: false,
        houseLibraryNotice: false,
        updatedAt: now,
      }, { merge: true });
    }
    if (ownerId) {
      const [artistHomeSnap, publicProfilesSnap] = await Promise.all([
        db.doc(`users/${ownerId}/gamification/artistHome`).get(),
        db.collection('publicProfiles').where('userId', '==', ownerId).get(),
      ]);
      if (artistHomeSnap.data()?.featured?.featuredTrack?.shareId === shareId) {
        batch.update(artistHomeSnap.ref, { 'featured.featuredTrack': FieldValue.delete(), updatedAt: now });
      }
      for (const profile of publicProfilesSnap.docs) {
        if (profile.data()?.artistHome?.featured?.featuredTrack?.shareId === shareId) {
          batch.update(profile.ref, { 'artistHome.featured.featuredTrack': FieldValue.delete(), updatedAt: now });
        }
      }
    }
    await batch.commit();
    return NextResponse.json({ ok: true, action, shareId, removed: true, houseRelease: false });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[admin/house-releases POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update House release.' },
      { status: 500 }
    );
  }
}
