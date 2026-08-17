/** Folds — a private lyric sheet passed between two artists. Not a chat thread. */

export const FOLD_BAR_MAX_CHARS = 400;
export const FOLD_PREVIEW_CHARS = 72;

export type FoldStatus = 'pending' | 'open' | 'declined';

export type FoldMember = {
  name: string;
  slug?: string;
};

export type FoldDoc = {
  id: string;
  memberIds: [string, string];
  members: Record<string, FoldMember>;
  status: FoldStatus;
  initiatedBy: string;
  lastBar: string;
  lastAt: string;
  lastSenderId: string;
  lastBarId: string;
  unread: Record<string, number>;
  foldedBack: Record<string, boolean>;
  lastReadAt: Record<string, string>;
  barCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FoldBarReply = {
  barId: string;
  text: string;
  senderId: string;
};

export type FoldBar = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  clientId?: string;
  replyTo?: FoldBarReply;
};

export type FoldPresence = {
  viewing?: boolean;
  typing?: boolean;
  at: string;
};

export function foldIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export function peerIdOf(memberIds: string[], me: string): string {
  return memberIds[0] === me ? memberIds[1] || '' : memberIds[0] || '';
}

export function foldPreview(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= FOLD_PREVIEW_CHARS) return t;
  return `${t.slice(0, FOLD_PREVIEW_CHARS - 1)}…`;
}

export function unreadFor(fold: FoldDoc, uid: string): number {
  if (fold.status === 'declined') return 0;
  const n = Math.max(0, Math.floor(Number(fold.unread?.[uid] || 0)));
  if (fold.foldedBack?.[uid]) return Math.max(1, n);
  if (fold.status === 'pending' && fold.initiatedBy !== uid) return Math.max(1, n);
  return n;
}
