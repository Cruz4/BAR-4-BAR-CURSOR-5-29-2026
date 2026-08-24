'use client';

import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { auth, getClientStorage } from '@/lib/firebase/client/firebase';
import { buildPreviewWav } from '@/lib/drop-audio-upload';
import { completeUploadTicket, requestUploadTicket } from '@/lib/upload-ticket-client';

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'track';
}

export async function buildFeaturedTrackPreview(input: {
  userId: string;
  shareId: string;
  trackId?: string;
  excerptStartSec: number;
}): Promise<{ previewPath: string; durationSec: number }> {
  const user = auth.currentUser;
  if (!user || user.uid !== input.userId) throw new Error('Sign in again to build the preview.');
  const token = await user.getIdToken();
  const query = new URLSearchParams({ shareId: input.shareId });
  if (input.trackId) query.set('trackId', input.trackId);
  const response = await fetch(`/api/drops/audio?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const stream = await response.json().catch(() => ({}));
  if (!response.ok || !stream.full || typeof stream.url !== 'string') {
    throw new Error(stream.error || 'This track is not available in your Library.');
  }
  const audioResponse = await fetch(stream.url);
  if (!audioResponse.ok) throw new Error('Could not load the track to build its preview.');
  const sourceBlob = await audioResponse.blob();
  const sourceFile = new File([sourceBlob], 'featured-track-audio', {
    type: String(stream.contentType || sourceBlob.type || 'audio/mpeg'),
  });
  const excerpt = await buildPreviewWav(sourceFile, 30, input.excerptStartSec);
  const startKey = Math.round(Math.max(0, input.excerptStartSec) * 10);
  const itemKey = `${safeSegment(input.shareId)}_${safeSegment(input.trackId || 'single')}`;
  const previewPath = `profile-previews/${input.userId}/${itemKey}/excerpt-${startKey}.wav`;
  const ticket = await requestUploadTicket({
    kind: 'profile_preview',
    storagePath: previewPath,
    byteSize: excerpt.blob.size,
    contentType: 'audio/wav',
  });
  await uploadBytes(ref(getClientStorage(), previewPath), excerpt.blob, {
    contentType: 'audio/wav',
    customMetadata: { uploadTicket: ticket.ticketId },
  });
  await completeUploadTicket(ticket.ticketId);
  return { previewPath, durationSec: excerpt.durationSec };
}

export async function deleteFeaturedTrackPreview(path?: string): Promise<void> {
  const user = auth.currentUser;
  const safePath = path?.trim() || '';
  if (!user || !safePath.startsWith(`profile-previews/${user.uid}/`)) return;
  try {
    await deleteObject(ref(getClientStorage(), safePath));
  } catch {
    // Missing or already replaced is harmless.
  }
}
