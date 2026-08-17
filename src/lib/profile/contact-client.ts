'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { ArtistHomeContact, ContactRequestStatus } from '@/lib/profile/contact';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export type ContactViewerState = {
  contact?: ArtistHomeContact;
  status: ContactRequestStatus | 'owner';
  value?: string;
};

export async function fetchContactForArtist(artistId: string): Promise<ContactViewerState> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  const res = await fetch(`/api/profile/contact?artistId=${encodeURIComponent(artistId)}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Could not load contact');
  return (await res.json()) as ContactViewerState;
}

export async function fetchPendingContactRequesterIds(): Promise<string[]> {
  const res = await fetch('/api/profile/contact?incoming=1', {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { pendingRequesterIds?: string[] };
  return Array.isArray(data.pendingRequesterIds) ? data.pendingRequesterIds : [];
}

export async function requestArtistContact(opts: {
  artistId: string;
  requesterName: string;
  requesterSlug?: string;
}): Promise<ContactRequestStatus> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const res = await fetch('/api/profile/contact', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      action: 'request',
      userId: user.uid,
      artistId: opts.artistId,
      requesterName: opts.requesterName,
      ...(opts.requesterSlug ? { requesterSlug: opts.requesterSlug } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: ContactRequestStatus; error?: string };
  if (!res.ok) throw new Error(data.error || 'Could not send request');
  return data.status || 'pending';
}

export async function respondArtistContact(opts: {
  requesterId: string;
  accept: boolean;
  artistName: string;
  artistSlug?: string;
}): Promise<ContactRequestStatus> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const res = await fetch('/api/profile/contact', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      action: 'respond',
      userId: user.uid,
      requesterId: opts.requesterId,
      accept: opts.accept,
      artistName: opts.artistName,
      ...(opts.artistSlug ? { artistSlug: opts.artistSlug } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: ContactRequestStatus; error?: string };
  if (!res.ok) throw new Error(data.error || 'Could not update request');
  return data.status || (opts.accept ? 'accepted' : 'declined');
}
