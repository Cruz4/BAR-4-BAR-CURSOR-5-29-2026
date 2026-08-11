'use server';

/**
 * Anonymous guest demo next-line / starter flow.
 * No auth / no Ink — only callable from /api/ai/demo after rate-limit gates.
 * Mirrors studio rails that are on: Intents, Precision Lock, Vibe, DNA, Guardrails, Instructions.
 */

import { ai, z } from '@/ai/genkit';
import { DirectionSchema } from './types';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { computeLineMetrics } from '@/lib/server/lyric-guardrails';

const GuestDemoVibeSchema = z.object({
  genre: z.string().max(64).optional(),
  tempoBPM: z.number().min(40).max(220).optional(),
  feeling: z.array(z.string().max(48)).max(6).optional(),
  instrumentation: z.string().max(120).optional(),
  productionNotes: z.string().max(160).optional(),
});

const GuestDemoInputSchema = z.object({
  mode: z.enum(['next', 'starter']).default('next'),
  isStarter: z.boolean().default(false),
  lines: z.array(z.string()).max(6),
  endWith: z.string().max(48).optional(),
  intents: z.array(z.string().max(48)).max(6).optional(),
  vibe: GuestDemoVibeSchema.optional(),
  direction: DirectionSchema.optional(),
  negativePrompt: z.string().max(240).optional(),
  forbiddenWords: z.array(z.string().max(40)).max(12).optional(),
  mustIncludeWords: z.array(z.string().max(40)).max(8).optional(),
  customInstructions: z.string().max(280).optional(),
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

export type GuestDemoRails = {
  endWith?: string | null;
  intents?: string[] | null;
  vibe?: z.infer<typeof GuestDemoVibeSchema> | null;
  direction?: z.infer<typeof DirectionSchema> | null;
  negativePrompt?: string | null;
  forbiddenWords?: string[] | null;
  mustIncludeWords?: string[] | null;
  customInstructions?: string | null;
};

const guestDemoPrompt = ai.definePrompt({
  name: 'guestDemoNextLinePrompt',
  input: { schema: GuestDemoInputSchema },
  output: { schema: GuestDemoOutputSchema },
  config: { temperature: 0.85 },
  prompt: `You are a Professional Phonetic Rhyme Engine demoing for a new artist.

{{#if isStarter}}
Generate TWO unfinished OPENING bars (Lyrical Architect style) — mid-thought / invitation lines the artist will finish under on the next bar. Prefer trailing ellipsis (…) or a hanging setup. Do NOT write a closed punchline. No prior bars exist, so do not require an end-rhyme partner.
{{else}}
Generate TWO single-line rap/lyric options that continue their verse.
RULES:
1. You MUST rhyme with the last word of the LAST line below (phonetic end-rhyme).
2. Match their tone, vocabulary level, and syllable count closely.
3. NEVER repeat their exact end-words from recent bars (except when Precision Lock requires that exact ending).
{{/if}}

4. Keep each option to one line, no profanity or slurs.

{{#if intents}}
**ACTIVE MOTIFS (weave in naturally — do not force awkwardly):**
{{#each intents}}- {{{this}}}
{{/each}}
{{/if}}

{{#if vibe}}
**VIBE:**
- Genre: {{vibe.genre}}
- Tempo: {{vibe.tempoBPM}} BPM
- Feeling: {{#each vibe.feeling}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if direction}}
**CREATIVE DNA (ATMOSPHERE):**
- World: {{direction.setting_world}}
- Emotion: {{direction.emotion_core}}
- Message: {{direction.message_truth}}
- Tone: {{direction.tone_palette}}
{{/if}}

{{#if customInstructions}}
**SPECIAL INSTRUCTIONS (HIGHEST PRIORITY):**
"{{{customInstructions}}}"
{{/if}}

{{#if negativePrompt}}
**AVOID:**
"{{{negativePrompt}}}"
{{/if}}

{{#if forbiddenWords}}
**FORBIDDEN WORDS:** {{#each forbiddenWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if mustIncludeWords}}
**MUST INCLUDE:** {{#each mustIncludeWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if endWith}}
**PRECISION LOCK / END WITH (MANDATORY):**
Both lines MUST end with this EXACT phrase, character-for-character (punctuation optional after it): "{{endWith}}"
Build the bar so that locked phrase is the natural landing / punchline of the line.
{{/if}}

{{#if lines.length}}
THEIR BARS:
{{#each lines}}- {{{this}}}
{{/each}}
{{else}}
THEIR BARS: (empty sheet — opening starter)
{{/if}}

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

function cleanStrings(values: string[] | null | undefined, max: number, maxLen: number): string[] {
  return (values ?? [])
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, max);
}

export async function generateGuestDemoNextLine(
  lines: string[],
  rails: GuestDemoRails = {},
  mode: 'next' | 'starter' = 'next'
): Promise<GuestDemoOption[]> {
  const lock = rails.endWith?.trim() || undefined;
  const motifs = cleanStrings(rails.intents ?? [], 6, 48);
  const forbiddenWords = cleanStrings(rails.forbiddenWords ?? [], 12, 40);
  const mustIncludeWords = cleanStrings(rails.mustIncludeWords ?? [], 8, 40);
  const direction = rails.direction
    ? {
        setting_world: rails.direction.setting_world?.trim().slice(0, 120) || undefined,
        emotion_core: rails.direction.emotion_core?.trim().slice(0, 120) || undefined,
        trigger_moment: rails.direction.trigger_moment?.trim().slice(0, 120) || undefined,
        message_truth: rails.direction.message_truth?.trim().slice(0, 120) || undefined,
        tone_palette: rails.direction.tone_palette?.trim().slice(0, 120) || undefined,
      }
    : undefined;
  const hasDirection =
    direction &&
    Object.values(direction).some((v) => typeof v === 'string' && v.trim().length > 0);
  const vibe = rails.vibe
    ? {
        genre: rails.vibe.genre?.trim().slice(0, 64) || undefined,
        tempoBPM:
          typeof rails.vibe.tempoBPM === 'number' && Number.isFinite(rails.vibe.tempoBPM)
            ? rails.vibe.tempoBPM
            : undefined,
        feeling: cleanStrings(rails.vibe.feeling ?? [], 6, 48),
        instrumentation: rails.vibe.instrumentation?.trim().slice(0, 120) || undefined,
        productionNotes: rails.vibe.productionNotes?.trim().slice(0, 160) || undefined,
      }
    : undefined;
  const hasVibe =
    vibe &&
    !!(
      vibe.genre ||
      vibe.tempoBPM ||
      (vibe.feeling && vibe.feeling.length) ||
      vibe.instrumentation ||
      vibe.productionNotes
    );

  const result = await guestDemoFlow({
    mode,
    isStarter: mode === 'starter',
    lines: mode === 'starter' ? [] : lines,
    ...(lock ? { endWith: lock } : {}),
    ...(motifs.length ? { intents: motifs } : {}),
    ...(hasVibe ? { vibe } : {}),
    ...(hasDirection ? { direction } : {}),
    ...(rails.negativePrompt?.trim()
      ? { negativePrompt: rails.negativePrompt.trim().slice(0, 240) }
      : {}),
    ...(forbiddenWords.length ? { forbiddenWords } : {}),
    ...(mustIncludeWords.length ? { mustIncludeWords } : {}),
    ...(rails.customInstructions?.trim()
      ? { customInstructions: rails.customInstructions.trim().slice(0, 280) }
      : {}),
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
