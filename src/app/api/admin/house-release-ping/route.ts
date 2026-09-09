import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { houseReleasePingEventId } from '@/lib/house-release-ping';
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
    if (!safeId(shareId)) {
      return NextResponse.json({ error: 'Invalid House-release ping.' }, { status: 400 });
    }

    const db = await getDb();
    const shareRef = db.doc(`shares/${shareId}`);
    const shareSnap = await shareRef.get();
    const share = shareSnap.data() || {};
    if (!shareSnap.exists || share.houseRelease !== true || share.releaseRemovedAt) {
      return NextResponse.json(
        { error: 'This House release is not in member Libraries anymore. Re-publish as House or pick another share.' },
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
    const eventId = houseReleasePingEventId(shareId);
    const href = `/library?release=${encodeURIComponent(shareId)}`;
    const pingRef = db.doc(`houseReleasePings/${eventId}`);
    const existingPing = await pingRef.get();
    const firstCreatedAt = typeof existingPing.data()?.createdAt === 'string'
      ? existingPing.data()!.createdAt
      : now;

    const noticePatch = {
      houseLibraryNotice: true,
      houseLibraryNoticeAt: now,
      updatedAt: now,
    };
    const batch = db.batch();
    batch.set(pingRef, {
      id: eventId,
      type: 'house_release',
      shareId,
      title,
      href,
      createdAt: firstCreatedAt,
      pingedAt: now,
      sentBy: admin.uid,
    }, { merge: true });
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

    return NextResponse.json({
      ok: true,
      refreshed: existingPing.exists,
      shareId,
      title,
      pingedAt: now,
      sentAt: firstCreatedAt,
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
