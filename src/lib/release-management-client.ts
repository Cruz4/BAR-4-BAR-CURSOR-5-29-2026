'use client';

import { auth } from '@/lib/firebase/client/firebase';

export type ManageReleaseInput = {
  kind: 'album' | 'track';
  action: 'save-draft' | 'publish' | 'unpublish';
  albumId: string;
  trackId?: string;
  hideDna?: boolean;
};

export type ManageReleaseResult = {
  ok: true;
  releaseStatus: 'draft' | 'live' | 'unlisted';
  releaseShareId: string | null;
};

export async function manageRelease(input: ManageReleaseInput): Promise<ManageReleaseResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to manage this release.');
  const response = await fetch('/api/releases/manage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ ...input, userId: user.uid }),
  });
  const result = (await response.json().catch(() => ({}))) as ManageReleaseResult & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Release update failed.');
  return result;
}

export async function getPrivateReleaseAudio(albumId: string, trackId: string): Promise<{ url: string; fileName: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to test this recording.');
  const params = new URLSearchParams({ userId: user.uid, albumId, trackId });
  const response = await fetch(`/api/releases/private-audio?${params}`, {
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  const result = (await response.json().catch(() => ({}))) as { url?: string; fileName?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error || 'Could not open private audio.');
  return { url: result.url, fileName: result.fileName || 'Private recording' };
}

export async function attachReleaseToSheet(input: {
  sourceAlbumId: string;
  sourceTrackId: string;
  targetAlbumId: string;
  targetTrackId: string;
}): Promise<{ targetAlbumId: string; targetTrackId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to attach a lyric sheet.');
  const response = await fetch('/api/releases/transfer-sheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ ...input, userId: user.uid }),
  });
  const result = (await response.json().catch(() => ({}))) as { targetAlbumId?: string; targetTrackId?: string; error?: string };
  if (!response.ok) throw new Error(result.error || 'Could not attach lyric sheet.');
  if (!result.targetAlbumId || !result.targetTrackId) throw new Error('The sheet attachment did not finish correctly.');
  return { targetAlbumId: result.targetAlbumId, targetTrackId: result.targetTrackId };
}
