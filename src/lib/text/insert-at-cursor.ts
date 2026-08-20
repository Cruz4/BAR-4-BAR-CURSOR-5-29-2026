export function insertAtCursor(
  value: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number
): { next: string; cursor: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const next = value.slice(0, start) + insertion + value.slice(end);
  return { next, cursor: start + insertion.length };
}
