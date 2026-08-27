import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';

export const runtime = 'nodejs';

function safeId(value: unknown, max = 200): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= max
    && !value.includes('/');
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdminRequest(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const shareId = typeof body.shareId === 'string' ? body.shareId.trim().toUpperCase() : '';
    const pingId = typeof body.pingId === 'string' ? body.pingId.trim() : '';
    if (!safeId(shareId) || !safeId(pingId, 100) || !/^[a-zA-Z0-9_-]+$/.test(pingId)) {
      return NextResponse.json({ error: 'Invalid House-release ping.' }, { status: 400 });
    }

    const db = await getDb();
    const shareRef = db.doc(`shares/${shareId}`);
    const shareSnap = await shareRef.get();
    const share = shareSnap.data() || {};
    if (
      !shareSnap.exists
      || share.houseRelease !== true
      || share.releaseStatus !== 'live'
      || share.releaseRemovedAt
    ) {
      return NextResponse.json(
        { error: 'Publish this as a live House release before sending the Library ping.' },
        { status: 409 }
      );
    }

    const payload = share.data && typeof share.data === 'object'
      ? share.data as Record<string, unknown>
      : {};
    const title = typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim().slice(0, 120)
      : 'New House release';
    const now = new Date().toISOString();
    const eventId = `house_${pingId}`;
    const href = `/library?release=${encodeURIComponent(shareId)}`;
    const pingRef = db.doc(`houseReleasePings/${eventId}`);
    const existingPing = await pingRef.get();

    if (!existingPing.exists) {
      const noticePatch = {
        houseLibraryNotice: true,
        houseLibraryNoticeAt: now,
        updatedAt: now,
      };
      const batch = db.batch();
      batch.create(pingRef, {
        id: eventId,
        type: 'house_release',
        shareId,
        title,
        href,
        createdAt: now,
        sentBy: admin.uid,
      });
      batch.set(shareRef, noticePatch, { merge: true });

      const ownerId = typeof share.ownerId === 'string' ? share.ownerId : '';
      const projectId = typeof share.projectId === 'string' ? share.projectId : '';
      const albumId = typeof payload.albumId === 'string' ? payload.albumId : '';
      if (ownerId && projectId) {
        const targetPath = share.type === 'album'
          ? `users/${ownerId}/albums/${projectId}`
          : albumId
            ? `users/${ownerId}/albums/${albumId}/tracks/${projectId}`
            : '';
        if (targetPath) batch.set(db.doc(targetPath), noticePatch, { merge: true });
      }
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      duplicate: existingPing.exists,
      shareId,
      title,
      sentAt: typeof existingPing.data()?.createdAt === 'string'
        ? existingPing.data()!.createdAt
        : now,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[admin/house-release-ping]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send the Library ping.' },
      { status: 500 }
    );
  }
}
