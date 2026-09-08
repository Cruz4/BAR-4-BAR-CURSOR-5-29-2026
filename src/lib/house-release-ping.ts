/** Stable activity / Firestore id for a House Library release ping. */
export function houseReleasePingEventId(shareId: string): string {
  return `house_${shareId.trim().toUpperCase()}`;
}

export function houseReleasePingSortAt(data: {
  pingedAt?: unknown;
  createdAt?: unknown;
}): string {
  const pingedAt = typeof data.pingedAt === 'string' ? data.pingedAt : '';
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : '';
  return pingedAt || createdAt;
}

/** Unread when never read, or read before the latest admin ping. */
export function isHouseReleasePingUnread(
  pingedAt: string,
  readAt: string | null | undefined
): boolean {
  if (!pingedAt) return !readAt;
  if (!readAt) return true;
  return readAt < pingedAt;
}

/** readAt only counts when it covers the latest ping. */
export function effectiveHouseReleaseReadAt(
  pingedAt: string,
  readAt: string | null | undefined
): string | null {
  if (!pingedAt || !readAt || readAt < pingedAt) return null;
  return readAt;
}
