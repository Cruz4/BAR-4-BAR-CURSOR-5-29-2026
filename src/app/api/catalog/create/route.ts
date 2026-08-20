import { NextResponse } from 'next/server';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import {
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  hasUnlimitedCatalog,
} from '@/lib/subscription';

export const runtime = 'nodejs';

const UNASSIGNED_ALBUM_ID = 'unassigned';
const MAX_DOCUMENT_JSON_BYTES = 900_000;

class CatalogCreateError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function isSafeDocumentId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('/');
}

function asDocument(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CatalogCreateError('Invalid catalog document');
  }
  const document = value as Record<string, unknown>;
  if (Buffer.byteLength(JSON.stringify(document), 'utf8') > MAX_DOCUMENT_JSON_BYTES) {
    throw new CatalogCreateError('Catalog document is too large', 413);
  }
  return document;
}

async function readTrackIds(
  tx: Transaction,
  db: Firestore,
  userId: string,
  albumIds: string[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const albumId of albumIds) {
    const tracks = await tx.get(db.collection(`users/${userId}/albums/${albumId}/tracks`));
    tracks.docs.forEach((doc) => ids.push(doc.id));
  }
  return ids;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const kind = body.kind === 'album' || body.kind === 'track' ? body.kind : null;
    const albumId = body.albumId;
    const trackId = body.trackId;
    const document = asDocument(body.document);

    if (!userId || !kind || !isSafeDocumentId(albumId)) {
      return NextResponse.json({ error: 'Invalid catalog payload' }, { status: 400 });
    }
    if (kind === 'track' && !isSafeDocumentId(trackId)) {
      return NextResponse.json({ error: 'Invalid track reference' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (error) {
      if (error instanceof CheckoutAuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      throw error;
    }

    const db = await getDb();
    const userRef = db.doc(`users/${userId}`);
    const albumRef = db.doc(`users/${userId}/albums/${albumId}`);
    const trackRef =
      kind === 'track'
        ? db.doc(`users/${userId}/albums/${albumId}/tracks/${trackId}`)
        : null;

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new CatalogCreateError('Account profile not found', 404);

      const targetSnap = await tx.get(kind === 'album' ? albumRef : trackRef!);
      if (targetSnap.exists) return;

      const albumsSnap = await tx.get(db.collection(`users/${userId}/albums`));
      const albumIds = albumsSnap.docs.map((doc) => doc.id);
      const unlimited = hasUnlimitedCatalog(userSnap.data());

      if (kind === 'album') {
        const realAlbumIds = albumIds.filter((id) => id !== UNASSIGNED_ALBUM_ID);
        if (!unlimited && albumId !== UNASSIGNED_ALBUM_ID && realAlbumIds.length >= FREE_ALBUM_LIMIT) {
          throw new CatalogCreateError('Visitor album limit reached', 403);
        }

        if (!unlimited && albumId !== UNASSIGNED_ALBUM_ID) {
          tx.set(userRef, { freeAlbumId: albumId }, { merge: true });
        }
        const { tracks: _tracks, ...albumData } = document;
        tx.create(albumRef, { ...albumData, id: albumId, ownerId: userId });
        return;
      }

      if (albumId !== UNASSIGNED_ALBUM_ID && !albumIds.includes(albumId)) {
        throw new CatalogCreateError('Album not found', 404);
      }

      const trackAlbumIds = Array.from(new Set([...albumIds, UNASSIGNED_ALBUM_ID]));
      const existingTrackIds = await readTrackIds(tx, db, userId, trackAlbumIds);
      if (!unlimited && existingTrackIds.length >= FREE_TRACK_LIMIT) {
        throw new CatalogCreateError('Visitor track limit reached', 403);
      }

      if (!unlimited) {
        tx.set(
          userRef,
          { freeEditableTrackIds: [...existingTrackIds, trackId].slice(0, FREE_TRACK_LIMIT) },
          { merge: true }
        );
      }

      if (albumId === UNASSIGNED_ALBUM_ID && !albumIds.includes(UNASSIGNED_ALBUM_ID)) {
        tx.create(albumRef, {
          id: UNASSIGNED_ALBUM_ID,
          ownerId: userId,
          title: 'Loose Tracks',
          theme: 'Unassigned tracks.',
          createdAt: new Date().toISOString(),
        });
      }

      tx.create(trackRef!, {
        ...document,
        id: trackId,
        albumId,
        ownerId: userId,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CatalogCreateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[catalog/create]', error);
    return NextResponse.json({ error: 'Catalog creation failed' }, { status: 500 });
  }
}
