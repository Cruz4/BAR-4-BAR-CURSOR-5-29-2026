import { NextResponse } from 'next/server';
import { verifyCheckoutUser, CheckoutAuthError } from '@/lib/stripe-server';
import { getDb } from '@/lib/firebase/server';
import { FREE_TRACK_LIMIT } from '@/lib/subscription';

export const runtime = 'nodejs';

function sanitizeTrackIds(trackIds: unknown): string[] {
  if (!Array.isArray(trackIds)) return [];
  return Array.from(
    new Set(
      trackIds.filter(
        (id): id is string =>
          typeof id === 'string' && id.trim().length > 0 && id.length <= 200 && !id.includes('/')
      )
    )
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const trackIds = sanitizeTrackIds(body.trackIds);
    const setSelectionTimestamp = body.setSelectionTimestamp === true;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    try {
      await verifyCheckoutUser(req, userId);
    } catch (e) {
      if (e instanceof CheckoutAuthError) {
        return NextResponse.json({ error: e.message }, { status: 401 });
      }
      throw e;
    }

    const trimmed = trackIds.slice(0, FREE_TRACK_LIMIT);
    if (setSelectionTimestamp && trimmed.length !== FREE_TRACK_LIMIT) {
      return NextResponse.json(
        { error: `Select exactly ${FREE_TRACK_LIMIT} tracks` },
        { status: 400 }
      );
    }
    if (!setSelectionTimestamp && trimmed.length === 0) {
      return NextResponse.json({ error: 'No tracks provided' }, { status: 400 });
    }

    const db = await getDb();
    const albums = await db.collection(`users/${userId}/albums`).get();
    const existingTrackIds = new Set<string>();
    for (const album of albums.docs) {
      const tracks = await album.ref.collection('tracks').get();
      tracks.docs.forEach((track) => existingTrackIds.add(track.id));
    }
    // Loose tracks can exist below an unassigned path before its shell document exists.
    const looseTracks = await db.collection(`users/${userId}/albums/unassigned/tracks`).get();
    looseTracks.docs.forEach((track) => existingTrackIds.add(track.id));
    if (trimmed.some((trackId) => !existingTrackIds.has(trackId))) {
      return NextResponse.json({ error: 'Track selection contains an unknown track' }, { status: 400 });
    }

    const patch: Record<string, string | string[]> = {
      freeEditableTrackIds: trimmed,
    };
    if (setSelectionTimestamp) {
      patch.freeEditableSelectionAt = new Date().toISOString();
    }

    await db.collection('users').doc(userId).set(patch, { merge: true });

    return NextResponse.json(patch);
  } catch (err) {
    console.error('[account/free-editable-tracks]', err);
    return NextResponse.json({ error: 'Failed to save track selection' }, { status: 500 });
  }
}
