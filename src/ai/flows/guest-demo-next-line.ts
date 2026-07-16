'use server';

/**
 * Anonymous guest demo next-line flow.
 * No auth / no Ink — only callable from /api/ai/demo after rate-limit gates.
 */

import { ai, z } from '@/ai/genkit';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { computeLineMetrics } from '@/lib/server/lyric-guardrails';

const GuestDemoInputSchema = z.object({
  lines: z.array(z.string()).min(1).max(6),
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
1. You MUST rhyme with the last word of the LAST line below.
2. Match their tone, vocabulary level, and syllable count closely.
3. NEVER repeat their exact words or end-words.
4. Keep each option to one line, no profanity or slurs.

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

export async function generateGuestDemoNextLine(lines: string[]): Promise<GuestDemoOption[]> {
  const result = await guestDemoFlow({ lines });
  const options = (result?.options ?? []).slice(0, 2);
  return Promise.all(
    options.map(async (opt) => {
      const metrics = await computeLineMetrics(opt.line);
      return { line: opt.line, syllables: metrics.syllables, rhymeKey: metrics.rhymeKey };
    })
  );
}
