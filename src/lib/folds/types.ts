/** Folds internals — private 1:1 messages between two artists. */

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
  /** Per-user inbox soft delete flag (hides thread from that user's inbox). */
  deletedFor: Record<string, boolean>;
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

export function asUnreadCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return 0;
}

export function asUnreadMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key) continue;
    out[key] = asUnreadCount(value);
  }
  return out;
}

export function unreadFor(fold: FoldDoc, uid: string): number {
  if (fold.status === 'declined') return 0;
  let n = asUnreadCount(fold.unread?.[uid]);
  const lastRead = Date.parse(fold.lastReadAt?.[uid] || '');
  const lastAt = Date.parse(fold.lastAt || '');
  if (
    n === 0 &&
    fold.lastSenderId &&
    fold.lastSenderId !== uid &&
    fold.lastBarId &&
    Number.isFinite(lastRead) &&
    lastRead > 0 &&
    Number.isFinite(lastAt) &&
    lastAt > lastRead
  ) {
    n = 1;
  }
  if (fold.foldedBack?.[uid]) return Math.max(1, n);
  if (fold.status === 'pending' && fold.initiatedBy !== uid) return Math.max(1, n);
  return n;
}
