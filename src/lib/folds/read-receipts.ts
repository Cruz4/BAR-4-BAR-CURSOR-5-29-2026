import { formatDistanceToNow } from 'date-fns';
import { formatFoldMessageTime } from '@/lib/folds/message-dates';
import { peerIdOf, type FoldBar, type FoldDoc } from '@/lib/folds/types';

export { formatFoldMessageTime, formatFoldMessageDateTime, foldMessageTimestamp } from '@/lib/folds/message-dates';

export function formatReadReceiptTime(readAt: string): string {
  try {
    const read = new Date(readAt);
    const now = new Date();
    const diffMs = now.getTime() - read.getTime();
    if (diffMs < 60_000) return 'Just now';
    if (diffMs < 86_400_000 && read.toDateString() === now.toDateString()) {
      return formatFoldMessageTime(readAt);
    }
    return formatDistanceToNow(read, { addSuffix: true });
  } catch {
    return '';
  }
}

export function isLastBarFromSender(bars: FoldBar[], bar: FoldBar, senderId: string): boolean {
  for (let i = bars.length - 1; i >= 0; i--) {
    if (bars[i].senderId === senderId) return bars[i].id === bar.id;
  }
  return false;
}

/** When the peer has read through this bar (used on your outgoing bubbles). */
export function outgoingReadReceiptAt(
  fold: FoldDoc | null | undefined,
  peerId: string,
  bars: FoldBar[],
  bar: FoldBar,
  myId: string
): string | null {
  if (!fold || !peerId || bar.senderId !== myId) return null;
  if (!isLastBarFromSender(bars, bar, myId)) return null;
  const peerReadAt = fold.lastReadAt?.[peerId];
  if (!peerReadAt) return null;
  if (Date.parse(peerReadAt) < Date.parse(bar.createdAt)) return null;
  return peerReadAt;
}

/** True when your last message in the thread was read by the peer. */
export function peerReadLastOutgoing(fold: FoldDoc, me: string): boolean {
  if (fold.lastSenderId !== me || !fold.lastAt) return false;
  const peerId = peerIdOf(fold.memberIds, me);
  if (!peerId) return false;
  const peerReadAt = fold.lastReadAt?.[peerId];
  if (!peerReadAt) return false;
  return Date.parse(peerReadAt) >= Date.parse(fold.lastAt);
}
