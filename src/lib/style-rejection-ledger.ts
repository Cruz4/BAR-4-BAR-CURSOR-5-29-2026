/** Persist lines the artist dismissed so co-writer prompts can avoid repeating them. */

export const REJECTED_LINES_MAX = 48;
const PROMPT_LINE_MAX_CHARS = 140;
const PROMPT_LINES_MAX = 14;

function normalizeKey(line: string): string {
  return line.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function mergeRejectedLines(
  existing: string[] | null | undefined,
  incoming: string[]
): string[] {
  const base = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(base.map(normalizeKey).filter(Boolean));
  for (const raw of incoming) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const key = normalizeKey(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    base.push(line);
  }
  return base.slice(-REJECTED_LINES_MAX);
}

/** Compact block for generate-next-line prompts (Style DNA rail optional). */
export function formatRejectedLinesForPrompt(lines: string[] | null | undefined): string {
  if (!lines?.length) return '';
  const tail = lines.slice(-PROMPT_LINES_MAX);
  return tail
    .map((line) => {
      const trimmed = line.replace(/\s+/g, ' ').trim();
      if (trimmed.length <= PROMPT_LINE_MAX_CHARS) return `- ${trimmed}`;
      return `- ${trimmed.slice(0, PROMPT_LINE_MAX_CHARS - 1)}…`;
    })
    .join('\n');
}

/** One bar from freestyle — keep the full take, not period-split verse chunks. */
export function normalizeSingleBarTranscript(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}
