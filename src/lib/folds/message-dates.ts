import { format, isSameDay, isToday, isYesterday } from 'date-fns';

export function parseMessageDate(iso: string): Date | null {
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function isSameMessageDay(aIso: string, bIso: string): boolean {
  const a = parseMessageDate(aIso);
  const b = parseMessageDate(bIso);
  if (!a || !b) return false;
  return isSameDay(a, b);
}

/** Time only — e.g. 2:14 PM */
export function formatFoldMessageTime(iso: string): string {
  const d = parseMessageDate(iso);
  if (!d) return '';
  return format(d, 'h:mm a');
}

/** Date + time on first message of a day — e.g. 9/9/2026 · 2:14 PM */
export function formatFoldMessageDateTime(iso: string): string {
  const d = parseMessageDate(iso);
  if (!d) return '';
  return `${format(d, 'M/d/yyyy')} · ${format(d, 'h:mm a')}`;
}

export function formatFoldDaySeparator(iso: string): string {
  const d = parseMessageDate(iso);
  if (!d) return '';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'M/d/yyyy');
}

export function foldMessageTimestamp(iso: string, firstOfDay: boolean): string {
  return firstOfDay ? formatFoldMessageDateTime(iso) : formatFoldMessageTime(iso);
}
