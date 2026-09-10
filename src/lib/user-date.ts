import { format } from 'date-fns';

/** Parse Firestore ISO strings, epoch ms, or `{ seconds }` timestamps. */
export function parseUserDate(value: unknown): Date | null {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof record.toDate === 'function') {
      try {
        const d = record.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    }
    const seconds = record.seconds ?? record._seconds;
    if (typeof seconds === 'number') {
      const d = new Date(seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  return null;
}

export function formatUserJoinDate(value: unknown): { date: string; time?: string } {
  const d = parseUserDate(value);
  if (!d) return { date: '—' };
  return {
    date: format(d, 'MM/dd/yy'),
    time: format(d, 'h:mm a'),
  };
}

/** Full calendar date + clock time for public post pages and detail views. */
export function formatUserDateTime(value: unknown): string {
  const d = parseUserDate(value);
  if (!d) return '';
  return format(d, 'MMM d, yyyy · h:mm a');
}

export function userDateSortValue(value: unknown): number {
  return parseUserDate(value)?.getTime() ?? 0;
}
