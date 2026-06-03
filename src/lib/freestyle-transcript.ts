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
