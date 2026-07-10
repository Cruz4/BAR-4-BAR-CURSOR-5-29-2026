import 'server-only';

/**
 * Hard guardrail enforcement for AI flow output.
 *
 * Guardrails used to be prompt-only requests; the model could (and did)
 * ignore them. Every lyric-producing flow now runs its output through these
 * helpers so forbidden words are guaranteed gone, and line metadata
 * (syllables / rhyme key) is computed deterministically instead of trusting
 * the model's self-reported numbers.
 */

import {
  findBannedWords,
  passesBannedWords,
  loadPhoneticDictionary,
  countLineSyllables,
  lineEndWord,
  rhymeKey,
  wordsRepeatedFrom,
  repeatsEndWord,
  isDuplicateOfEarlierBar,
} from '@/lib/lyrics-analysis';

/** Censor a token: keep the first letter, star the rest ("gun" -> "g**"). */
function censorToken(token: string): string {
  const letters = token.replace(/[^a-zA-Z0-9']/g, '');
  if (letters.length <= 1) return '*';
  return `${letters[0]}${'*'.repeat(Math.max(1, letters.length - 1))}`;
}

/**
 * Remove banned words from a line by censoring the offending tokens.
 * Returns the sanitized text and whether anything was censored.
 */
export function sanitizeLineBannedWords(
  line: string,
  bannedWords: string[]
): { text: string; violated: boolean } {
  if (!bannedWords.length || !line.trim()) return { text: line, violated: false };
  if (passesBannedWords(line, bannedWords)) return { text: line, violated: false };

  const sanitized = line
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      return findBannedWords(part, bannedWords).length > 0 ? censorToken(part) : part;
    })
    .join('');

  // Multi-word phrases may survive token-level censoring; censor word-by-word
  // against the phrase words as a final pass.
  const phraseWords = bannedWords
    .filter((b) => b.trim().includes(' '))
    .flatMap((b) => b.trim().split(/\s+/));
  let text = sanitized;
  if (phraseWords.length && findBannedWords(text, bannedWords).length > 0) {
    text = text
      .split(/(\s+)/)
      .map((part) => {
        if (!part.trim()) return part;
        return findBannedWords(part, phraseWords).length > 0 ? censorToken(part) : part;
      })
      .join('');
  }
  return { text, violated: true };
}

/** Sanitize an array of lines in place-order; reports if any line violated. */
export function sanitizeLinesBannedWords(
  lines: string[],
  bannedWords: string[]
): { lines: string[]; violated: boolean } {
  let violated = false;
  const out = lines.map((l) => {
    const res = sanitizeLineBannedWords(l, bannedWords);
    if (res.violated) violated = true;
    return res.text;
  });
  return { lines: out, violated };
}

/**
 * For option-style outputs (Generate Next Line, creative effects):
 * keep clean options, drop violating ones — unless that would leave nothing,
 * in which case censor the violating options instead of returning nothing.
 */
export function enforceBannedWordsOnOptions(
  options: string[],
  bannedWords: string[]
): { options: string[]; hadViolations: boolean } {
  if (!bannedWords.length) return { options, hadViolations: false };
  const clean = options.filter((o) => passesBannedWords(o, bannedWords));
  if (clean.length === options.length) return { options, hadViolations: false };
  if (clean.length > 0) return { options: clean, hadViolations: true };
  return {
    options: options.map((o) => sanitizeLineBannedWords(o, bannedWords).text),
    hadViolations: true,
  };
}

/**
 * Deterministic line metrics — replaces the model's self-reported syllable
 * counts and rhyme keys. Loads the CMU dictionary on first use.
 */
export async function computeLineMetrics(line: string): Promise<{ syllables: number; rhymeKey: string }> {
  await loadPhoneticDictionary();
  const endWord = lineEndWord(line);
  return {
    syllables: countLineSyllables(line),
    rhymeKey: endWord ? rhymeKey(endWord) : '?',
  };
}

export type RepetitionViolationReason =
  | 'end_word_repeat'
  | 'duplicate_line'
  | 'words_from_previous_line';

export type RepetitionGuardrailResult = {
  violated: boolean;
  reasons: RepetitionViolationReason[];
  /** Content words shared with the immediate prior context line. */
  repeatedFromPrevious: string[];
};

function contextLines(lines: string[]): string[] {
  return lines.map((l) => l.trim()).filter(Boolean);
}

/** True when a hook/chorus section may intentionally repeat lines verbatim. */
export function isHookOrChorusSection(sectionName: string): boolean {
  return /\b(hook|chorus|refrain|pre[- ]?chorus)\b/i.test(sectionName);
}

/**
 * Detect repetition violations against lines already on the sheet.
 * Blocks: same end word, near-duplicate line, content words from the line directly above.
 */
export function findRepetitionViolations(
  line: string,
  earlierLines: string[]
): RepetitionGuardrailResult {
  const ctx = contextLines(earlierLines);
  const reasons: RepetitionViolationReason[] = [];
  const trimmed = line.trim();
  if (!trimmed || !ctx.length) {
    return { violated: false, reasons, repeatedFromPrevious: [] };
  }

  if (repeatsEndWord(trimmed, ctx)) reasons.push('end_word_repeat');
  if (isDuplicateOfEarlierBar(trimmed, ctx)) reasons.push('duplicate_line');

  const lastLine = ctx[ctx.length - 1];
  const repeatedFromPrevious = wordsRepeatedFrom(trimmed, [lastLine]);
  if (repeatedFromPrevious.length > 0) reasons.push('words_from_previous_line');

  return {
    violated: reasons.length > 0,
    reasons,
    repeatedFromPrevious,
  };
}

export function passesRepetitionGuardrails(line: string, earlierLines: string[]): boolean {
  return !findRepetitionViolations(line, earlierLines).violated;
}

/**
 * For option-style outputs (next line, creative effects):
 * keep clean options; drop ones that repeat end words, duplicate a bar, or recycle
 * content words from the line directly above.
 */
export function enforceRepetitionOnOptions(
  options: string[],
  earlierLines: string[]
): { options: string[]; hadViolations: boolean } {
  const ctx = contextLines(earlierLines);
  if (!ctx.length) return { options, hadViolations: false };

  const clean = options.filter((o) => passesRepetitionGuardrails(o, ctx));
  if (clean.length === options.length) return { options, hadViolations: false };
  if (clean.length > 0) return { options: clean, hadViolations: true };
  return { options: [], hadViolations: true };
}

/**
 * Sequential pass for multi-line draft output. Each line is checked against all
 * prior lines accumulated so far in the section (and optional seed context).
 * Hook/chorus sections skip enforcement so intentional mantras are preserved.
 */
export function sanitizeSectionLinesRepetition(
  lines: string[],
  options: { sectionName?: string; seedContext?: string[] } = {}
): { lines: string[]; hadViolations: boolean } {
  if (options.sectionName && isHookOrChorusSection(options.sectionName)) {
    return { lines, hadViolations: false };
  }

  const accumulated = contextLines(options.seedContext ?? []);
  let hadViolations = false;
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      out.push(raw);
      continue;
    }
    if (accumulated.length && !passesRepetitionGuardrails(line, accumulated)) {
      hadViolations = true;
      continue;
    }
    out.push(raw);
    accumulated.push(line);
  }

  return { lines: out, hadViolations };
}
