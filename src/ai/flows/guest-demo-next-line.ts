'use server';

/**
 * Anonymous guest demo next-line flow.
 * No auth / no Ink — only callable from /api/ai/demo after rate-limit gates.
 * Mirrors studio constraints: checked Intents (motifs) + optional Precision Lock (`endWith`).
 */

import { ai, z } from '@/ai/genkit';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { computeLineMetrics } from '@/lib/server/lyric-guardrails';

const GuestDemoInputSchema = z.object({
  lines: z.array(z.string()).min(1).max(6),
  endWith: z.string().max(48).optional(),
  intents: z.array(z.string().max(48)).max(6).optional(),
});

const GuestDemoOptionSchema = z.object({
  line: z.string(),
  syllables: z.number().optional(),
  rhymeKey: z.string().optional(),
});

/** Object wrapper — more reliable for Gemini structured output than a root array. */
const GuestDemoOutputSchema = z.object({
  options: z.array(GuestDemoOptionSchema).min(1).max(2),
});

export type GuestDemoOption = {
  line: string;
  syllables: number;
  rhymeKey: string;
};

const guestDemoPrompt = ai.definePrompt({
  name: 'guestDemoNextLinePrompt',
  input: { schema: GuestDemoInputSchema },
  output: { schema: GuestDemoOutputSchema },
  config: { temperature: 0.85 },
  prompt: `You are a Professional Phonetic Rhyme Engine demoing for a new artist. Generate TWO single-line rap/lyric options that continue their verse.

RULES:
1. You MUST rhyme with the last word of the LAST line below (phonetic end-rhyme).
2. Match their tone, vocabulary level, and syllable count closely.
3. NEVER repeat their exact end-words from recent bars (except when Precision Lock requires that exact ending).
4. Keep each option to one line, no profanity or slurs.

{{#if intents}}
**ACTIVE MOTIFS (weave in naturally — do not force awkwardly):**
{{#each intents}}- {{{this}}}
{{/each}}
{{/if}}

{{#if endWith}}
**PRECISION LOCK / END WITH (MANDATORY):**
Both lines MUST end with this EXACT phrase, character-for-character (punctuation optional after it): "{{endWith}}"
Build the bar so that locked phrase is the natural landing / punchline of the line.
{{/if}}

THEIR BARS:
{{#each lines}}- {{{this}}}
{{/each}}

Return JSON with an "options" array of exactly two objects, each with a "line" field.`,
});

const guestDemoFlow = ai.defineFlow(
  {
    name: 'guestDemoNextLineFlow',
    inputSchema: GuestDemoInputSchema,
    outputSchema: GuestDemoOutputSchema,
  },
  async (input) => {
    const { output } = await guestDemoPrompt(input, getGenkitPromptOptions());
    if (!output?.options?.length) {
      return { options: [] };
    }
    return { options: output.options.slice(0, 2) };
  }
);

function ensureEndsWith(line: string, endWith: string | undefined): string {
  if (!endWith?.trim()) return line;
  const target = endWith.trim();
  const trimmed = line.trim();
  if (trimmed.toLowerCase().endsWith(target.toLowerCase())) return trimmed;
  // Soft repair if the model drifted — keep their setup, force the lock.
  return `${trimmed.replace(/[.,!?;:]+$/, '')} ${target}`.replace(/\s+/g, ' ').trim();
}

export async function generateGuestDemoNextLine(
  lines: string[],
  endWith?: string | null,
  intents?: string[] | null
): Promise<GuestDemoOption[]> {
  const lock = endWith?.trim() || undefined;
  const motifs = (intents ?? []).map((i) => i.trim()).filter(Boolean).slice(0, 6);
  const result = await guestDemoFlow({
    lines,
    ...(lock ? { endWith: lock } : {}),
    ...(motifs.length ? { intents: motifs } : {}),
  });
  const options = (result?.options ?? []).slice(0, 2);
  return Promise.all(
    options.map(async (opt) => {
      const line = ensureEndsWith(opt.line, lock);
      const metrics = await computeLineMetrics(line);
      return { line, syllables: metrics.syllables, rhymeKey: metrics.rhymeKey };
    })
  );
}
