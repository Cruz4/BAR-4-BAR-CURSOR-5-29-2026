import 'server-only';

import { getDb } from '@/lib/firebase/server';
import { emitActivityEvent } from '@/lib/server/activity';
import { getArtistHomeConfig } from '@/lib/server/artist-home';
import { profileHref } from '@/lib/profile/profile-slug';
import type { ArtistHomeContact, ContactRequestStatus } from '@/lib/profile/contact';

const REQUESTS = (artistId: string) => `users/${artistId}/contactRequests`;

export type ContactRequestDoc = {
  requesterId: string;
  requesterName: string;
  requesterSlug?: string;
  status: Exclude<ContactRequestStatus, 'none'>;
  createdAt: string;
  respondedAt?: string;
};

function requestRef(artistId: string, requesterId: string) {
  return `${REQUESTS(artistId)}/${requesterId}`;
}

async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const db = await getDb();
  const [ab, ba] = await Promise.all([
    db.doc(`users/${a}/blocks/${b}`).get(),
    db.doc(`users/${b}/blocks/${a}`).get(),
  ]);
  return ab.exists || ba.exists;
}

export async function getContactForViewer(opts: {
  artistId: string;
  viewerId: string | null;
}): Promise<{
  contact: ArtistHomeContact | undefined;
  status: ContactRequestStatus | 'owner';
  value?: string;
}> {
  const config = await getArtistHomeConfig(opts.artistId);
  const contact = config.featured.contact;
  if (!contact) return { contact: undefined, status: 'none' };

  if (opts.viewerId && opts.viewerId === opts.artistId) {
    return { contact, status: 'owner', value: contact.value };
  }

  if (contact.mode === 'public' && contact.value) {
    return { contact, status: 'none', value: contact.value };
  }

  if (contact.mode !== 'request' || !opts.viewerId) {
    return { contact: { mode: 'request' }, status: 'none' };
  }

  const db = await getDb();
  const snap = await db.doc(requestRef(opts.artistId, opts.viewerId)).get();
  const status = (snap.data()?.status as ContactRequestDoc['status'] | undefined) || 'none';
  if (status === 'accepted' && contact.value) {
    return { contact: { mode: 'request' }, status, value: contact.value };
  }
  return { contact: { mode: 'request' }, status: status === 'pending' || status === 'declined' ? status : 'none' };
}

export async function listPendingContactRequesterIds(artistId: string): Promise<string[]> {
  const db = await getDb();
  const snap = await db.collection(REQUESTS(artistId)).where('status', '==', 'pending').get();
  return snap.docs.map((d) => d.id);
}

export async function createContactRequest(opts: {
  artistId: string;
  requesterId: string;
  requesterName: string;
  requesterSlug?: string;
}): Promise<{ status: ContactRequestStatus }> {
  if (opts.artistId === opts.requesterId) {
    throw new Error('That is you.');
  }
  if (await isBlockedEitherWay(opts.artistId, opts.requesterId)) {
    throw new Error('You can’t request contact from this artist.');
  }

  const config = await getArtistHomeConfig(opts.artistId);
  const contact = config.featured.contact;
  if (!contact || contact.mode !== 'request' || !contact.value) {
    throw new Error('This artist is not taking contact requests.');
  }

  const db = await getDb();
  const ref = db.doc(requestRef(opts.artistId, opts.requesterId));
  const existing = await ref.get();
  const current = existing.data()?.status as ContactRequestDoc['status'] | undefined;
  if (current === 'accepted') return { status: 'accepted' };
  if (current === 'pending') return { status: 'pending' };

  const now = new Date().toISOString();
  const payload: ContactRequestDoc = {
    requesterId: opts.requesterId,
    requesterName: opts.requesterName.trim().slice(0, 80) || 'Artist',
    ...(opts.requesterSlug ? { requesterSlug: opts.requesterSlug.trim().slice(0, 80) } : {}),
    status: 'pending',
    createdAt: now,
  };
  await ref.set(payload);

  const userSnap = await db.doc(`users/${opts.artistId}`).get();
  const artistName =
    typeof userSnap.data()?.displayName === 'string' && userSnap.data()!.displayName.trim()
      ? userSnap.data()!.displayName.trim()
      : 'Artist';

  await emitActivityEvent({
    type: 'contact_request',
    actorId: opts.requesterId,
    actorName: payload.requesterName,
    ...(payload.requesterSlug ? { actorSlug: payload.requesterSlug } : {}),
    recipientId: opts.artistId,
    recipientName: artistName,
    href: '/activity?tab=requests',
  });

  return { status: 'pending' };
}

export async function respondContactRequest(opts: {
  artistId: string;
  requesterId: string;
  accept: boolean;
  artistName: string;
  artistSlug?: string;
}): Promise<{ status: Exclude<ContactRequestStatus, 'none'> }> {
  if (opts.artistId === opts.requesterId) {
    throw new Error('That is you.');
  }

  const db = await getDb();
  const ref = db.doc(requestRef(opts.artistId, opts.requesterId));
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Request not found.');
  const data = snap.data() as ContactRequestDoc;
  if (data.status === 'accepted') return { status: 'accepted' };
  if (data.status !== 'pending') throw new Error('This request is no longer pending.');

  const now = new Date().toISOString();
  const nextStatus: 'accepted' | 'declined' = opts.accept ? 'accepted' : 'declined';
  await ref.set({ ...data, status: nextStatus, respondedAt: now }, { merge: true });

  const summarySnap = await db.doc(`users/${opts.artistId}/gamification/summary`).get();
  const artistSlug =
    opts.artistSlug?.trim() ||
    (typeof summarySnap.data()?.profileSlug === 'string' ? summarySnap.data()!.profileSlug : undefined);

  if (opts.accept) {
    await emitActivityEvent({
      type: 'contact_accepted',
      actorId: opts.artistId,
      actorName: opts.artistName.trim().slice(0, 80) || 'Artist',
      ...(artistSlug ? { actorSlug: artistSlug } : {}),
      recipientId: opts.requesterId,
      recipientName: data.requesterName,
      href: profileHref(artistSlug) || '/activity',
    });
  }

  return { status: nextStatus };
}
