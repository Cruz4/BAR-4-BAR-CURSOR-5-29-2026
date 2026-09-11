'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { adminApiFetch } from '@/lib/admin-client';

export const RELEASE_VISIBILITY_CHANGED_EVENT = 'b4b:release-visibility-changed';

export type ManageReleaseInput = {
  kind: 'album' | 'track';
  action: 'save-draft' | 'publish' | 'unpublish' | 'remove';
  albumId: string;
  trackId?: string;
  hideDna?: boolean;
  houseRelease?: boolean;
  houseLibraryNotice?: boolean;
};

export type ManageReleaseResult = {
  ok: true;
  releaseStatus: 'draft' | 'live' | 'unlisted';
  releaseShareId: string | null;
  houseRelease?: boolean;
  houseLibraryNotice?: boolean;
  releaseSnapshotCompacted?: boolean;
  releaseCoverOmitted?: boolean;
  removed?: boolean;
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
  window.dispatchEvent(new CustomEvent(RELEASE_VISIBILITY_CHANGED_EVENT, {
    detail: { action: input.action, releaseShareId: result.releaseShareId },
  }));
  return result;
}

export async function pingHouseRelease(shareId: string): Promise<{
  ok: true;
  sentAt: string;
  refreshed: boolean;
  pingedAt: string;
}> {
  const user = auth.currentUser;
  if (!user) throw new Error('Admin sign-in required.');
  const response = await adminApiFetch('/api/admin/house-release-ping', {
    method: 'POST',
    body: JSON.stringify({ shareId }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    ok?: true;
    sentAt?: string;
    pingedAt?: string;
    refreshed?: boolean;
    error?: string;
  };
  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'Could not send the Library ping.');
  }
  const pingedAt = result.pingedAt || new Date().toISOString();
  return {
    ok: true,
    sentAt: result.sentAt || pingedAt,
    refreshed: Boolean(result.refreshed),
    pingedAt,
  };
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
