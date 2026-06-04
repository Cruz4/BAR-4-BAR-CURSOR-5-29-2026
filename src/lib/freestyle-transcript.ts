/** Shared freestyle STT cleanup — filters model hallucination when audio is weak. */

const PROMPT_LEAK_PATTERNS = [
  /verbatim\s+speech-?to-?text/i,
  /speech-?to-?text\s+engine/i,
  /listen\s+to\s+the\s+attached\s+audio/i,
  /exact\s+words\s+spoken\s+by\s+a\s+human/i,
  /do\s+not\s+invent/i,
  /background\s+noise/i,
  /no\s+discernible\s+speech/i,
  /no\s+audible\s+speech/i,
  /no\s+clear\s+speech/i,
  /silent\s+audio/i,
  /empty\s+audio/i,
];

const FILLER_ONLY = /^(yo[\s,.-]*){1,4}$|^(yeah[\s,.-]*){1,4}$|^(uh[\s,.-]*){1,4}$/i;

const silenceMarkers = [
  '[silence]',
  '(silence)',
  'no speech',
  'no audible speech',
  'no discernible speech',
  'no clear speech',
  'silent audio',
  'empty audio',
  'inaudible',
  'nothing',
  'n/a',
  'none',
];

export function sanitizeFreestyleTranscript(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (silenceMarkers.some((marker) => lower === marker || lower.startsWith(`${marker}.`))) {
    return '';
  }

  if (PROMPT_LEAK_PATTERNS.some((re) => re.test(trimmed))) {
    return '';
  }

  const stripped = trimmed
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^\([\s\S]*\)$/, '')
    .trim();

  if (!stripped || FILLER_ONLY.test(stripped)) {
    return '';
  }

  return stripped;
}

/** Dedupe overlapping words when appending consecutive STT chunks. */
export function mergeFreestyleTranscriptChunk(prev: string, next: string): string {
  if (!prev.trim()) return next.trim();
  if (!next.trim()) return prev.trim();

  const prevWords = prev.trimEnd().split(/\s+/);
  const nextWords = next.trim().split(/\s+/);
  const maxOverlap = Math.min(5, prevWords.length, nextWords.length);

  for (let n = maxOverlap; n >= 1; n -= 1) {
    const tail = prevWords
      .slice(-n)
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s']/g, '');
    const head = nextWords
      .slice(0, n)
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s']/g, '');
    if (tail && tail === head) {
      const rest = nextWords.slice(n).join(' ');
      return rest ? `${prev.trimEnd()} ${rest}`.trim() : prev.trimEnd();
    }
  }

  return `${prev.trimEnd()} ${next.trim()}`.trim();
}
