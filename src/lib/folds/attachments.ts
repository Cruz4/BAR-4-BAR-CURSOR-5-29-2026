/** Private 1:1 fold attachments — never stored on the public wall. */

import { parsePostPoll, type PostPoll } from '@/lib/profile/post-polls';
import { parseVoiceNote, type VoiceNote } from '@/lib/profile/voice-notes';
import { normalizeQuotePressConfig, type QuotePressConfig } from '@/lib/profile/quote-press';
import {
  foldPreview,
  FOLD_PREVIEW_CHARS,
  type FoldBarImage,
} from '@/lib/folds/types';

export type { FoldBarImage };

export const FOLD_REACTION_KINDS = ['heart', 'mic', 'handwriting', 'hundred', 'laugh'] as const;
export type FoldReactionKind = (typeof FOLD_REACTION_KINDS)[number];

export const FOLD_REACTION_EMOJI: Record<FoldReactionKind, string> = {
  heart: '❤️',
  mic: '🎤',
  handwriting: '✍️',
  hundred: '💯',
  laugh: '😂',
};

export type FoldPoll = PostPoll & {
  votes: Record<string, string>;
};

export function isFoldReactionKind(value: unknown): value is FoldReactionKind {
  return typeof value === 'string' && (FOLD_REACTION_KINDS as readonly string[]).includes(value);
}

export function parseFoldReactions(raw: unknown): Record<string, FoldReactionKind> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, FoldReactionKind> = {};
  for (const [uid, kind] of Object.entries(raw as Record<string, unknown>)) {
    if (!uid || !isFoldReactionKind(kind)) continue;
    out[uid.slice(0, 80)] = kind;
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseFoldBarImage(raw: unknown): FoldBarImage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  const storagePath = typeof data.storagePath === 'string' ? data.storagePath.trim() : '';
  if (!url || !storagePath.startsWith('folds/') || storagePath.length > 400 || url.length > 2000) {
    return undefined;
  }
  return { url, storagePath };
}

export function parseFoldPoll(raw: unknown): FoldPoll | undefined {
  const poll = parsePostPoll(raw);
  if (!poll) return undefined;
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const votesRaw = data.votes && typeof data.votes === 'object' && !Array.isArray(data.votes)
    ? (data.votes as Record<string, unknown>)
    : {};
  const optionIds = new Set(poll.options.map((option) => option.id));
  const votes: Record<string, string> = {};
  for (const [uid, optionId] of Object.entries(votesRaw)) {
    if (!uid || typeof optionId !== 'string' || !optionIds.has(optionId)) continue;
    votes[uid.slice(0, 80)] = optionId;
  }
  return { ...poll, votes };
}

export function foldImageStoragePath(foldId: string, mediaId: string): string {
  return `folds/${foldId}/${mediaId}.jpg`;
}

export function foldVoiceStoragePath(foldId: string, mediaId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'webm';
  return `folds/${foldId}/${mediaId}.${safeExt}`;
}

export function assertFoldMediaPath(foldId: string, storagePath: string): void {
  const prefix = `folds/${foldId}/`;
  if (!storagePath.startsWith(prefix) || storagePath.includes('..') || storagePath.length > 400) {
    throw new Error('Invalid attachment.');
  }
}

export function uidIsFoldStorageMember(foldId: string, uid: string): boolean {
  if (!foldId || !uid) return false;
  return foldId.startsWith(`${uid}_`) || foldId.endsWith(`_${uid}`);
}

export function foldBarPreviewText(opts: {
  text?: string;
  image?: FoldBarImage;
  voice?: VoiceNote;
  poll?: FoldPoll;
  quotePress?: QuotePressConfig;
}): string {
  const text = (opts.text || '').trim().replace(/\s+/g, ' ');
  if (text) {
    return text.length <= FOLD_PREVIEW_CHARS ? text : `${text.slice(0, FOLD_PREVIEW_CHARS - 1)}…`;
  }
  if (opts.image) return 'Photo';
  if (opts.voice) return 'Voice note';
  if (opts.poll) return 'Poll';
  if (opts.quotePress) return 'Imprint';
  return '';
}

export function foldReplyPreview(bar: {
  text?: string;
  image?: FoldBarImage;
  voice?: VoiceNote;
  poll?: FoldPoll;
  quotePress?: QuotePressConfig;
}): string {
  return foldBarPreviewText(bar) || foldPreview(bar.text || '');
}

export { parseVoiceNote, normalizeQuotePressConfig };

export function foldBarAttachmentsFromData(data: Record<string, unknown>): Pick<
  import('@/lib/folds/types').FoldBar,
  'image' | 'voice' | 'poll' | 'quotePress' | 'reactions'
> {
  const image = parseFoldBarImage(data.image);
  const voice = parseVoiceNote(data.voice);
  const poll = parseFoldPoll(data.poll);
  const quotePress = normalizeQuotePressConfig(data.quotePress);
  const reactions = parseFoldReactions(data.reactions);
  return {
    ...(image ? { image } : {}),
    ...(voice ? { voice } : {}),
    ...(poll ? { poll } : {}),
    ...(quotePress ? { quotePress } : {}),
    ...(reactions ? { reactions } : {}),
  };
}
