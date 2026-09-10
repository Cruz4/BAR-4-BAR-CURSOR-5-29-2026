import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase/server';
import { buildAlbumDropPayload, buildTrackDropPayload } from '@/lib/dna-drop';
import {
  isCommerceLive,
  isDropFree,
  normalizeDropAudio,
  normalizeDropPrice,
  shareDocCommerceFlags,
} from '@/lib/drop-commerce';
import { stripForFirestore } from '@/lib/utils';
import { CheckoutAuthError, verifyCheckoutUser } from '@/lib/stripe-server';
import type { Album, StyleProfile, Track } from '@/lib/types';
import { isFirstDropsEnabled } from '@/lib/server/first-drops-feature';
import { isFreeDropsEnabled } from '@/lib/server/free-drops-feature';
import { AdminAuthError, verifyAdminRequest } from '@/lib/server/admin-auth';
import {
  fitAlbumReleasePayload,
  RELEASE_SHARE_PAYLOAD_BUDGET_BYTES,
} from '@/lib/release-management';
import { orderAlbumTracks, trackOrderFromTracks } from '@/lib/album-track-order';

export const runtime = 'nodejs';

type ManageAction = 'save-draft' | 'publish' | 'unpublish' | 'remove';

function safeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('/');
}

async function unusedShareId(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomBytes(6).toString('base64url').toUpperCase();
    if (!(await db.doc(`shares/${id}`).get()).exists) return id;
  }
  throw new Error('Could not reserve a release link. Try again.');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const kind = body.kind === 'album' || body.kind === 'track' ? body.kind : null;
    const action: ManageAction | null =
      body.action === 'save-draft' || body.action === 'publish' || body.action === 'unpublish' || body.action === 'remove'
        ? body.action
        : null;
    const albumId = body.albumId;
    const trackId = body.trackId;
    const hideDna = body.hideDna === true;
    const houseReleaseRequest = typeof body.houseRelease === 'boolean' ? body.houseRelease : undefined;
    const houseLibraryNoticeRequest = typeof body.houseLibraryNotice === 'boolean'
      ? body.houseLibraryNotice
      : undefined;
    if (!userId || !kind || !action || !safeId(albumId) || (kind === 'track' && !safeId(trackId))) {
      return NextResponse.json({ error: 'Invalid release request.' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }
    if (houseReleaseRequest !== undefined || houseLibraryNoticeRequest !== undefined) {
      try {
        await verifyAdminRequest(req);
      } catch (error) {
        if (error instanceof AdminAuthError) {
          return NextResponse.json({ error: error.message }, { status: 403 });
        }
        throw error;
      }
    }

    const db = await getDb();
    const userRef = db.doc(`users/${userId}`);
    const albumRef = db.doc(`users/${userId}/albums/${albumId}`);
    const trackRef = kind === 'track'
      ? db.doc(`users/${userId}/albums/${albumId}/tracks/${trackId}`)
      : null;
    const [userSnap, albumSnap, styleSnap, tracksSnap] = await Promise.all([
      userRef.get(),
      albumRef.get(),
      db.doc(`users/${userId}/styleProfile/main`).get(),
      albumRef.collection('tracks').get(),
    ]);
    if (!userSnap.exists || !albumSnap.exists) {
      return NextResponse.json({ error: 'Release was not found in your Vault.' }, { status: 404 });
    }
    if (action === 'publish') {
      if (!(await isFirstDropsEnabled())) {
        return NextResponse.json({ error: 'Music Releases is currently unavailable.' }, { status: 403 });
      }
    }

    const albumData = albumSnap.data() as Omit<Album, 'tracks'> & { tracks?: unknown };
    const orderedTracks = orderAlbumTracks(
      tracksSnap.docs.map((doc) => ({ ...(doc.data() as Track), id: doc.id, albumId })),
      albumData,
    );
    const album = {
      ...albumData,
      id: albumId,
      ownerId: userId,
      tracks: orderedTracks,
      trackOrder: trackOrderFromTracks(orderedTracks),
    } as Album;
    const track = kind === 'track' ? album.tracks.find((item) => item.id === trackId) : undefined;
    if (kind === 'track' && (!track || !trackRef)) {
      return NextResponse.json({ error: 'Song was not found in your Vault.' }, { status: 404 });
    }
    const target = (kind === 'album' ? album : track!) as Album | Track;
    // Never trust the owner-writable Vault document for a universal entitlement.
    // Only an explicit flag on this admin-authorized request may set the public share flag.
    // House Library notices are activated only by `/api/admin/house-release-ping`.
    const houseRelease = houseReleaseRequest === true;
    const style = styleSnap.exists ? (styleSnap.data() as StyleProfile) : undefined;
    const existingReleaseId = target.releaseShareId?.trim();
    let releaseShareId = existingReleaseId;

    // Old releases used shareId for both the lyric page and the paid release.
    if (!releaseShareId && target.shareId) {
      const legacy = await db.doc(`shares/${target.shareId}`).get();
      const payload = (legacy.data()?.data || {}) as Record<string, unknown>;
      const legacyHasAudio = kind === 'track'
        ? Boolean(normalizeDropAudio(payload.dropAudio))
        : Array.isArray(payload.tracks) && payload.tracks.some((row) => normalizeDropAudio((row as Record<string, unknown>).dropAudio));
      if (legacyHasAudio && !legacy.data()?.releaseRemovedAt) releaseShareId = target.shareId;
    }

    const existingSharePreview = releaseShareId
      ? await db.doc(`shares/${releaseShareId}`).get()
      : null;
    const existingNoticeLive =
      houseRelease &&
      existingSharePreview?.exists &&
      existingSharePreview.data()?.houseRelease === true &&
      existingSharePreview.data()?.houseLibraryNotice === true &&
      !existingSharePreview.data()?.releaseRemovedAt;
    const houseLibraryNotice = Boolean(existingNoticeLive);

    const now = new Date().toISOString();
    const targetRef = kind === 'album' ? albumRef : trackRef!;
    if (action === 'save-draft') {
      await targetRef.set({
        releaseStatus: 'draft',
        ...(
          houseReleaseRequest !== undefined
            ? { houseRelease, houseLibraryNotice: houseRelease ? houseLibraryNotice : false }
            : {}
        ),
        updatedAt: now,
      }, { merge: true });
      return NextResponse.json({ ok: true, releaseStatus: 'draft', releaseShareId: releaseShareId || null, houseRelease, houseLibraryNotice });
    }

    if (action === 'unpublish') {
      const [artistHomeSnap, publicProfilesSnap] = await Promise.all([
        db.doc(`users/${userId}/gamification/artistHome`).get(),
        db.collection('publicProfiles').where('userId', '==', userId).get(),
      ]);
      const batch = db.batch();
      batch.set(targetRef, {
        releaseStatus: 'unlisted',
        houseLibraryNotice: false,
        houseLibraryNoticeAt: FieldValue.delete(),
        ...(releaseShareId ? { releaseShareId } : {}),
        ...(hideDna && target.shareId ? { dnaStatus: 'unlisted' } : {}),
        updatedAt: now,
      }, { merge: true });
      if (releaseShareId) {
        const sameAsDna = hideDna && target.shareId === releaseShareId;
        batch.update(db.doc(`shares/${releaseShareId}`), {
          releaseStatus: 'unlisted',
          unpressedAt: now,
          updatedAt: now,
          'data.releaseStatus': 'unlisted',
          houseLibraryNotice: false,
          houseLibraryNoticeAt: FieldValue.delete(),
          ...(sameAsDna ? { dnaStatus: 'unlisted', 'data.dnaStatus': 'unlisted' } : {}),
        });
      }
      if (hideDna && target.shareId && target.shareId !== releaseShareId) {
        batch.update(db.doc(`shares/${target.shareId}`), {
          dnaStatus: 'unlisted',
          updatedAt: now,
          'data.dnaStatus': 'unlisted',
        });
      }
      if (releaseShareId && artistHomeSnap.data()?.featured?.featuredTrack?.shareId === releaseShareId) {
        batch.update(artistHomeSnap.ref, { 'featured.featuredTrack': FieldValue.delete(), updatedAt: now });
        for (const profile of publicProfilesSnap.docs) {
          if (profile.data()?.artistHome?.featured?.featuredTrack?.shareId === releaseShareId) {
            batch.update(profile.ref, { 'artistHome.featured.featuredTrack': FieldValue.delete(), updatedAt: now });
          }
        }
      }
      await batch.commit();
      return NextResponse.json({ ok: true, releaseStatus: 'unlisted', releaseShareId: releaseShareId || null, houseRelease, houseLibraryNotice });
    }

    if (action === 'remove') {
      const [artistHomeSnap, publicProfilesSnap] = await Promise.all([
        db.doc(`users/${userId}/gamification/artistHome`).get(),
        db.collection('publicProfiles').where('userId', '==', userId).get(),
      ]);
      const batch = db.batch();
      batch.set(targetRef, {
        releaseStatus: 'draft',
        releaseShareId: FieldValue.delete(),
        releaseSnapshotAt: FieldValue.delete(),
        houseRelease: false,
        houseLibraryNotice: false,
        ...(hideDna && target.shareId ? { dnaStatus: 'unlisted' } : {}),
        updatedAt: now,
      }, { merge: true });
      if (releaseShareId) {
        const sameAsDna = hideDna && target.shareId === releaseShareId;
        batch.set(db.doc(`shares/${releaseShareId}`), {
          releaseStatus: 'unlisted',
          releaseRemovedAt: now,
          unpressedAt: now,
          houseRelease: false,
          houseLibraryNotice: false,
          updatedAt: now,
          'data.releaseStatus': 'unlisted',
          'data.houseRelease': false,
          ...(sameAsDna ? { dnaStatus: 'unlisted', 'data.dnaStatus': 'unlisted' } : {}),
        }, { merge: true });
      }
      if (hideDna && target.shareId && target.shareId !== releaseShareId) {
        batch.set(db.doc(`shares/${target.shareId}`), {
          dnaStatus: 'unlisted',
          updatedAt: now,
          'data.dnaStatus': 'unlisted',
        }, { merge: true });
      }
      if (releaseShareId && artistHomeSnap.data()?.featured?.featuredTrack?.shareId === releaseShareId) {
        batch.update(artistHomeSnap.ref, { 'featured.featuredTrack': FieldValue.delete(), updatedAt: now });
        for (const profile of publicProfilesSnap.docs) {
          if (profile.data()?.artistHome?.featured?.featuredTrack?.shareId === releaseShareId) {
            batch.update(profile.ref, { 'artistHome.featured.featuredTrack': FieldValue.delete(), updatedAt: now });
          }
        }
      }
      await batch.commit();
      return NextResponse.json({
        ok: true,
        removed: true,
        releaseStatus: 'draft',
        releaseShareId: null,
        houseRelease: false,
        houseLibraryNotice: false,
      });
    }

    const audioTracks = kind === 'album'
      ? album.tracks.filter((item) => normalizeDropAudio(item.dropAudio))
      : [];
    if (kind === 'track' && !normalizeDropAudio(track!.dropAudio)) {
      return NextResponse.json({ error: 'Upload the recording before pressing it live.' }, { status: 400 });
    }
    if (kind === 'album' && audioTracks.length === 0) {
      return NextResponse.json({ error: 'Upload at least one album recording before pressing it live.' }, { status: 400 });
    }
    if (kind === 'track' && !track!.dropRightsAttestedAt) {
      return NextResponse.json({ error: 'Confirm that you have the rights to sell this recording.' }, { status: 400 });
    }
    if (kind === 'album' && audioTracks.some((item) => !item.dropRightsAttestedAt)) {
      return NextResponse.json({ error: 'Confirm rights for every recording included in this album.' }, { status: 400 });
    }
    const releasePrice = normalizeDropPrice(target.dropPrice);
    if (!houseRelease && !isCommerceLive(releasePrice)) {
      return NextResponse.json({ error: 'Set a valid sale price before pressing it live.' }, { status: 400 });
    }
    if (!houseRelease && isDropFree(releasePrice)) {
      const freeAllowed = await isFreeDropsEnabled();
      let wasAlreadyFree = false;
      if (releaseShareId) {
        const existingShare = await db.doc(`shares/${releaseShareId}`).get();
        const payload = (existingShare.data()?.data as Record<string, unknown> | undefined) ?? {};
        wasAlreadyFree = isDropFree(normalizeDropPrice(payload.dropPrice));
      }
      if (!freeAllowed && !wasAlreadyFree) {
        return NextResponse.json(
          { error: 'Free releases are not available right now. Set a paid price or pay-what-you-want.' },
          { status: 400 }
        );
      }
    }
    releaseShareId ||= await unusedShareId(db);
    const privatePatch = {
      releaseShareId,
      releaseStatus: 'live' as const,
      releaseSnapshotAt: now,
      houseRelease,
      houseLibraryNotice,
      updatedAt: now,
    };
    const snapTarget = { ...target, ...privatePatch };
    let payload = stripForFirestore(
      kind === 'album'
        ? buildAlbumDropPayload({ ...album, ...privatePatch }, style)
        : buildTrackDropPayload(snapTarget as Track, album, style)
    ) as unknown as Record<string, unknown>;
    let releaseSnapshotCompacted = false;
    let releaseCoverOmitted = false;
    if (kind === 'album') {
      const fitted = fitAlbumReleasePayload(payload);
      payload = fitted.payload;
      releaseSnapshotCompacted = fitted.compacted;
      releaseCoverOmitted = fitted.coverOmitted;
      if (fitted.byteSize > RELEASE_SHARE_PAYLOAD_BUDGET_BYTES) {
        return NextResponse.json({
          error: 'This album release is still too large to publish. Shorten unusually large track metadata and try again.',
        }, { status: 413 });
      }
    }
    payload.releaseShareId = releaseShareId;
    payload.releaseStatus = 'live';
    payload.releaseSnapshotAt = now;
    payload.houseRelease = houseRelease;
    const shareRef = db.doc(`shares/${releaseShareId}`);
    const existingShare = await shareRef.get();
    if (existingShare.exists && existingShare.data()?.ownerId !== userId) {
      return NextResponse.json({ error: 'That release link belongs to another account.' }, { status: 409 });
    }
    const existingNoticeAt = typeof existingShare.data()?.houseLibraryNoticeAt === 'string'
      ? existingShare.data()!.houseLibraryNoticeAt
      : '';
    const houseLibraryNoticeAt = houseLibraryNotice
      ? existingShare.data()?.houseLibraryNotice === true && existingNoticeAt
        ? existingNoticeAt
        : now
      : null;
    const batch = db.batch();
    batch.set(targetRef, privatePatch, { merge: true });
    const existingHouseArtistId =
      typeof existingShare.data()?.houseArtistId === 'string'
        ? existingShare.data()!.houseArtistId.trim()
        : '';
    batch.set(shareRef, {
      id: releaseShareId,
      type: kind,
      projectId: kind === 'track' ? trackId : albumId,
      ownerId: userId,
      ownerName: typeof userSnap.data()?.displayName === 'string' ? userSnap.data()!.displayName : 'Artist',
      data: payload,
      releaseStatus: 'live',
      releaseRemovedAt: FieldValue.delete(),
      houseRelease,
      ...(houseRelease
        ? { houseArtistId: existingHouseArtistId || userId }
        : { houseArtistId: FieldValue.delete() }),
      houseLibraryNotice,
      houseLibraryNoticeAt: houseLibraryNoticeAt || FieldValue.delete(),
      releaseSnapshotAt: now,
      createdAt: existingShare.exists ? existingShare.data()?.createdAt || now : now,
      updatedAt: now,
      views: existingShare.exists ? existingShare.data()?.views || 0 : 0,
      imports: existingShare.exists ? existingShare.data()?.imports || 0 : 0,
      ...shareDocCommerceFlags(kind, payload),
    }, { merge: true });
    await batch.commit();
    return NextResponse.json({
      ok: true,
      releaseStatus: 'live',
      releaseShareId,
      houseRelease,
      houseLibraryNotice,
      releaseSnapshotCompacted,
      releaseCoverOmitted,
    });
  } catch (error) {
    console.error('[releases/manage]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Release update failed.' }, { status: 500 });
  }
}
