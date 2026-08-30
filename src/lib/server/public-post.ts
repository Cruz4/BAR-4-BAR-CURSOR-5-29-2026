import 'server-only';

import { cache } from 'react';
import { getDb } from '@/lib/firebase/server';
import { parseLyricClip } from '@/lib/profile/lyric-clip';
import { needsVanitySlugUpgrade } from '@/lib/profile/profile-slug';
import type { ProfilePost } from '@/lib/profile/social-client';
import type { VoiceNote } from '@/lib/profile/voice-notes';
import type { WallClip } from '@/lib/profile/wall-clips';
import { parsePostPoll } from '@/lib/profile/post-polls';

export type PublicPostPageData = {
  post: ProfilePost;
  ownerSlug: string;
  ownerName: string;
};

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const next = value.trim();
  return next ? next.slice(0, max) : undefined;
}

function publicWallClip(raw: unknown): WallClip | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const url = clean(data.url, 2000);
  const storagePath = clean(data.storagePath, 400);
  const contentType = clean(data.contentType, 80);
  const durationSec = Number(data.durationSec);
  const byteSize = Number(data.byteSize);
  if (!url || !storagePath || !contentType?.startsWith('video/')) return undefined;
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 45) return undefined; // wall clip stored max
  if (!Number.isFinite(byteSize) || byteSize <= 0) return undefined;
  return { url, storagePath, contentType, durationSec, byteSize };
}

function publicVoice(raw: unknown): VoiceNote | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const url = clean(data.url, 2000);
  const storagePath = clean(data.storagePath, 500);
  const contentType = clean(data.contentType, 100);
  const durationSec = Number(data.durationSec);
  const byteSize = Number(data.byteSize);
  if (!url || !storagePath || !contentType || !Number.isFinite(durationSec) || durationSec <= 0) {
    return undefined;
  }
  return {
    url,
    storagePath,
    contentType,
    durationSec,
    byteSize: Number.isFinite(byteSize) && byteSize >= 0 ? byteSize : 0,
    ...(clean(data.transcript, 4000) ? { transcript: clean(data.transcript, 4000) } : {}),
  };
}

export function postFromServerDoc(id: string, data: Record<string, unknown>): ProfilePost {
  const voice = publicVoice(data.voice);
  const reverbVoice = publicVoice(data.reverbVoice);
  const video = publicWallClip(data.video);
  const reverbVideo = publicWallClip(data.reverbVideo);
  const lyricClip = parseLyricClip(data.lyricClip);
  const reverbLyricClip = parseLyricClip(data.reverbLyricClip);
  const poll = parsePostPoll(data.poll);
  const reverbPoll = parsePostPoll(data.reverbPoll);
  return {
    id,
    ownerId: clean(data.ownerId, 128) || '',
    ownerName: clean(data.ownerName, 120) || 'Music maker',
    ...(clean(data.ownerSlug, 80) ? { ownerSlug: clean(data.ownerSlug, 80) } : {}),
    text: clean(data.text, 1000) || '',
    ...(clean(data.embedUrl, 500) ? { embedUrl: clean(data.embedUrl, 500) } : {}),
    ...(typeof data.embedProvider === 'string'
      ? { embedProvider: data.embedProvider as ProfilePost['embedProvider'] }
      : {}),
    ...(clean(data.imageUrl, 900_000) ? { imageUrl: clean(data.imageUrl, 900_000) } : {}),
    ...(clean(data.imageStoragePath, 500) ? { imageStoragePath: clean(data.imageStoragePath, 500) } : {}),
    ...(video ? { video } : {}),
    ...(reverbVideo ? { reverbVideo } : {}),
    createdAt: clean(data.createdAt, 40) || '',
    ...(typeof data.viewCount === 'number' && data.viewCount > 0
      ? { viewCount: Math.floor(data.viewCount) }
      : {}),
    ...(data.isReverb === true ? { isReverb: true } : {}),
    ...(data.sourceKind === 'post' || data.sourceKind === 'song' || data.sourceKind === 'dna'
      ? { sourceKind: data.sourceKind }
      : {}),
    ...(clean(data.reverbPostId, 80) ? { reverbPostId: clean(data.reverbPostId, 80) } : {}),
    ...(clean(data.reverbOwnerId, 128) ? { reverbOwnerId: clean(data.reverbOwnerId, 128) } : {}),
    ...(clean(data.reverbOwnerName, 120) ? { reverbOwnerName: clean(data.reverbOwnerName, 120) } : {}),
    ...(clean(data.reverbOwnerSlug, 80) ? { reverbOwnerSlug: clean(data.reverbOwnerSlug, 80) } : {}),
    ...(clean(data.reverbText, 1000) ? { reverbText: clean(data.reverbText, 1000) } : {}),
    ...(clean(data.reverbEmbedUrl, 500) ? { reverbEmbedUrl: clean(data.reverbEmbedUrl, 500) } : {}),
    ...(clean(data.reverbImageUrl, 900_000) ? { reverbImageUrl: clean(data.reverbImageUrl, 900_000) } : {}),
    ...(voice ? { voice } : {}),
    ...(reverbVoice ? { reverbVoice } : {}),
    ...(lyricClip ? { lyricClip } : {}),
    ...(reverbLyricClip ? { reverbLyricClip } : {}),
    ...(poll ? { poll } : {}),
    ...(reverbPoll ? { reverbPoll } : {}),
  };
}

export function publicPostText(post: ProfilePost): string {
  return [
    post.text,
    post.lyricClip?.lines.join(' '),
    post.voice?.transcript,
    post.poll?.options.map((option) => option.label).join(' '),
    post.isReverb ? post.reverbText : '',
    post.isReverb ? post.reverbLyricClip?.lines.join(' ') : '',
    post.isReverb ? post.reverbVoice?.transcript : '',
    post.isReverb ? post.reverbPoll?.options.map((option) => option.label).join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export const getPublicPostPageData = cache(async (rawPostId: string): Promise<PublicPostPageData | null> => {
  const postId = rawPostId.trim();
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(postId)) return null;
  const db = await getDb();
  const postSnap = await db.doc(`posts/${postId}`).get();
  if (!postSnap.exists) return null;
  const post = postFromServerDoc(postSnap.id, postSnap.data() as Record<string, unknown>);
  if (!post.ownerId) return null;
  const profileSnap = await db
    .collection('publicProfiles')
    .where('userId', '==', post.ownerId)
    .limit(8)
    .get();
  const live = profileSnap.docs
    .filter((doc) => !needsVanitySlugUpgrade(doc.id, post.ownerId))
    .sort((a, b) => String(b.data().updatedAt || '').localeCompare(String(a.data().updatedAt || '')))[0];
  if (!live) return null;
  const profile = live.data() as Record<string, unknown>;
  const ownerName = clean(profile.displayName, 120) || post.ownerName;
  return {
    post: { ...post, ownerName, ownerSlug: live.id },
    ownerSlug: live.id,
    ownerName,
  };
});
