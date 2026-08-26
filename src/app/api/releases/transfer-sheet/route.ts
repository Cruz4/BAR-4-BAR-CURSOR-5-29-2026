import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { stripForFirestore } from '@/lib/utils';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import type { Track } from '@/lib/types';
import { hasLyrics, releaseShareIdOf, releaseStatusOf } from '@/lib/release-management';

export const runtime = 'nodejs';

function safeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('/');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const sourceAlbumId = body.sourceAlbumId;
    const sourceTrackId = body.sourceTrackId;
    const targetAlbumId = body.targetAlbumId;
    const targetTrackId = body.targetTrackId;
    if (!userId || !safeId(sourceAlbumId) || !safeId(sourceTrackId) || !safeId(targetAlbumId) || !safeId(targetTrackId)) {
      return NextResponse.json({ error: 'Invalid sheet attachment request.' }, { status: 400 });
    }
    if (sourceAlbumId === targetAlbumId && sourceTrackId === targetTrackId) {
      return NextResponse.json({ error: 'Choose a different lyric sheet.' }, { status: 400 });
    }
    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) return NextResponse.json({ error: error.message }, { status: 401 });
      throw error;
    }
    const db = await getDb();
    const sourceRef = db.doc(`users/${userId}/albums/${sourceAlbumId}/tracks/${sourceTrackId}`);
    const targetRef = db.doc(`users/${userId}/albums/${targetAlbumId}/tracks/${targetTrackId}`);
    const sourceAlbumRef = db.doc(`users/${userId}/albums/${sourceAlbumId}`);
    const destinationRef = db.doc(`users/${userId}/albums/${sourceAlbumId}/tracks/${targetTrackId}`);
    const [sourceSnap, targetSnap, sourceAlbumSnap, destinationSnap] = await Promise.all([
      sourceRef.get(),
      targetRef.get(),
      sourceAlbumRef.get(),
      sourceAlbumId === targetAlbumId ? Promise.resolve(null) : destinationRef.get(),
    ]);
    if (!sourceSnap.exists || !targetSnap.exists || !sourceAlbumSnap.exists) {
      return NextResponse.json({ error: 'The release or lyric sheet no longer exists.' }, { status: 404 });
    }
    const source = { ...(sourceSnap.data() as Track), id: sourceTrackId, albumId: sourceAlbumId };
    const target = { ...(targetSnap.data() as Track), id: targetTrackId, albumId: targetAlbumId };
    if (!normalizeDropAudio(source.dropAudio)) {
      return NextResponse.json({ error: 'The source release has no recording to attach.' }, { status: 400 });
    }
    if (hasLyrics(source)) {
      return NextResponse.json({ error: 'Only an empty audio-only placeholder can be replaced by a lyric sheet.' }, { status: 409 });
    }
    if (!hasLyrics(target)) {
      return NextResponse.json({ error: 'Choose a track that already has lyrics.' }, { status: 400 });
    }
    if (normalizeDropAudio(target.dropAudio) || releaseShareIdOf(target)) {
      return NextResponse.json({ error: 'That lyric sheet already has a release attached.' }, { status: 409 });
    }
    if (destinationSnap?.exists) {
      return NextResponse.json({ error: 'A track with that sheet identity already exists in the release album.' }, { status: 409 });
    }
    const now = new Date().toISOString();
    const sourceReleaseId = releaseShareIdOf(source);
    const sourceReleaseStatus = releaseStatusOf(source);
    const moved: Partial<Track> = {
      title: source.title,
      coverArtUrl: source.coverArtUrl,
      dropAudio: source.dropAudio,
      dropPrice: source.dropPrice,
      dropRightsAttestedAt: source.dropRightsAttestedAt,
      releaseShareId: sourceReleaseId,
      releaseStatus: sourceReleaseStatus,
      releaseSnapshotAt: source.releaseSnapshotAt,
      updatedAt: now,
    };
    const nextTarget = { ...target, ...moved, id: targetTrackId, albumId: sourceAlbumId } as Track;
    const batch = db.batch();
    batch.set(destinationRef, stripForFirestore(nextTarget), { merge: true });
    batch.delete(sourceRef);
    if (targetRef.path !== destinationRef.path) batch.delete(targetRef);
    if (target.collabSheetId && sourceAlbumId !== targetAlbumId) {
      batch.set(db.doc(`collabSheets/${target.collabSheetId}`), {
        albumId: sourceAlbumId,
        albumTitle: typeof sourceAlbumSnap.data()?.title === 'string' ? sourceAlbumSnap.data()!.title : 'Album',
        updatedAt: now,
      }, { merge: true });
    }
    if (sourceReleaseId && sourceReleaseStatus === 'live') {
      batch.update(db.doc(`shares/${sourceReleaseId}`), {
        projectId: targetTrackId,
        'data.id': targetTrackId,
        'data.albumId': sourceAlbumId,
        'data.title': source.title,
        'data.coverArtUrl': source.coverArtUrl || FieldValue.delete(),
        updatedAt: now,
      });
    }
    await batch.commit();
    return NextResponse.json({ ok: true, targetAlbumId: sourceAlbumId, targetTrackId });
  } catch (error) {
    console.error('[releases/transfer-sheet]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not attach lyric sheet.' }, { status: 500 });
  }
}
