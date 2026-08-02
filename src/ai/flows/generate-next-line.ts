'use server';

/**
 * @fileOverview MASTER LOCKDOWN (5/14/2026) - Phonetic Rhyme Engine.
 * 
 * - Logic: Strict Phonetic Matching based on bi-directional context.
 * - Constraint: Zero-Repetition Protocol for DNA terms and prior words.
 * - Update (5/14): Style Fidelity protocol prevents phrase repetition.
 * - Update (5/14): Hardened Intent Weaving to ensure checked motifs drive the topic.
 * - Update (5/14): Restored Guardrail enforcement in the prompt template.
 */

import { ai, z } from '@/ai/genkit';
import { DirectionSchema } from './types';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { AI_COSTS } from '@/lib/costs';
import type { AiSecuredInput } from '@/lib/ai-secured';
import {
  computeLineMetrics,
  enforceBannedWordsOnOptions,
  enforceRepetitionOnOptions,
} from '@/lib/server/lyric-guardrails';
import { lineEndWord } from '@/lib/lyrics-analysis';

const GenerateNextLineInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  priorLines: z.array(z.string()),
  nextLines: z.array(z.string()),
  sectionType: z.string(),
  vibe: z.object({
    enabled: z.boolean().optional(),
    genre: z.string(),
    tempoBPM: z.number(),
    feeling: z.array(z.string()),
    instrumentation: z.string().optional(),
    productionNotes: z.string().optional(),
  }),
  intents: z.array(z.string()),
  styleProfileSummary: z.string(),
  rhymeMode: z.enum(['continue', 'new', 'reverse', 'replace']),
  theme: z.string(),
  endWith: z.string().optional().nullable(),
  mergedDirection: DirectionSchema.optional(),
  /** Prebuilt Album DNA continuity / avoid block (client: buildAlbumAlreadyUsed). */
  albumAlreadyUsed: z.string().optional(),
  /** Sibling lyric lines for album-wide near-duplicate guardrails. */
  albumRepetitionContext: z.array(z.string()).optional(),
  /** End rhymes already used on sibling tracks. */
  albumAvoidEndWords: z.array(z.string()).optional(),
  negativePrompt: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  mustIncludeWords: z.array(z.string()).optional(),
});
export type GenerateNextLineInput = z.infer<typeof GenerateNextLineInputSchema>;

const DEFAULT_VIBE: GenerateNextLineInput['vibe'] = {
  genre: 'General',
  tempoBPM: 90,
  feeling: ['neutral'],
};

function normalizeGenerateNextLineInput(input: GenerateNextLineInput): GenerateNextLineInput {
  const vibe = input.vibe ?? DEFAULT_VIBE;
  return {
    ...input,
    vibe: {
      genre: vibe.genre || DEFAULT_VIBE.genre,
      tempoBPM: typeof vibe.tempoBPM === 'number' ? vibe.tempoBPM : DEFAULT_VIBE.tempoBPM,
      feeling: Array.isArray(vibe.feeling) && vibe.feeling.length > 0 ? vibe.feeling : DEFAULT_VIBE.feeling,
      ...(vibe.enabled !== undefined ? { enabled: vibe.enabled } : {}),
      ...(vibe.instrumentation ? { instrumentation: vibe.instrumentation } : {}),
      ...(vibe.productionNotes ? { productionNotes: vibe.productionNotes } : {}),
    },
    styleProfileSummary: input.styleProfileSummary ?? 'Initial neutral style profile.',
    intents: input.intents ?? [],
    nextLines: input.nextLines ?? [],
  };
}

const GenerateNextLineOutputSchema = z.object({
  line: z.string(),
  rhymeKey: z.string(),
  syllables: z.number(),
  notes: z.string(),
});
export type GenerateNextLineOutput = z.infer<typeof GenerateNextLineOutputSchema>;

const GenerateNextLineFlowOutputSchema = z.array(GenerateNextLineOutputSchema);
export type GenerateNextLineFlowOutput = z.infer<typeof GenerateNextLineFlowOutputSchema>;

export async function generateNextLine(input: GenerateNextLineInput & AiSecuredInput): Promise<GenerateNextLineFlowOutput> {
  try {
    const flowInput = normalizeGenerateNextLineInput(stripAiAuth(input));
    return await runSecuredAiAction(
      { idToken: input.idToken, userId: input.userId, actionName: 'generateNextLine', inkCost: AI_COSTS.generateNextLine, customApiKey: input.customApiKey },
      () => generateNextLineFlow(flowInput),
      input.userName
    );
  } catch (error: any) {
    console.error('--- GENERATE NEXT LINE FAILED ---', error);
    throw new Error(`Creative Sync Error: ${error.message || "Synthesis Interrupted"}`);
  }
}

const nextLinePrompt = ai.definePrompt({
  name: 'nextLinePrompt',
  input: { schema: GenerateNextLineInputSchema },
  output: { schema: GenerateNextLineFlowOutputSchema }, 
  config: { temperature: 0.85 },
  prompt: `You are a Professional Phonetic Rhyme Engine. Your primary goal is to generate TWO single-line options that PERFECTLY fit the provided rhyme scheme, context, and selected motifs.

**STRICT PHONETIC PROTOCOL:**
1. **RHYME TARGET**: If generating a "Next Line", you MUST rhyme with the last word of the LAST line in 'priorLines'. If generating a "Previous Line", rhyme with the FIRST line of 'nextLines'.
2. **SCHEME AWARENESS**: Look at the pattern in 'priorLines'. If it's AABB or ABAB, ensure your suggestion maintains that meter and phonetic consistency.
3. **ZERO REPETITION**: NEVER repeat the last word of any recent bars. NEVER repeat phrases from the DNA questions literally.

**INTENT MOTIFS (TOPIC GUIDANCE):**
You MUST weave the following motifs into your suggestions: {{#each intents}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}. 
Ensure the generated line is primarily about these concepts or imagery while maintaining the required rhyme and rhythm.

**STYLE FIDELITY:**
Mimic the technical patterns found in this profile: {{styleProfileSummary}}. 
**IMPORTANT**: Focus on the flow, vocabulary level, and rhyme complexity. **NEVER** reuse literal phrases or recurring words found in the style profile description. 

**DIRECTION (ATMOSPHERE ONLY):**
- World: {{mergedDirection.setting_world}}
- Emotion: {{mergedDirection.emotion_core}}
- Message: {{mergedDirection.message_truth}}
- Tone: {{mergedDirection.tone_palette}}

{{#if albumAlreadyUsed}}
{{{albumAlreadyUsed}}}
{{/if}}

**CONTEXT:**
- Section: {{sectionType}}
- Prior Bars: {{#each priorLines}}- {{{this}}} {{/each}}
- Next Bars: {{#each nextLines}}- {{{this}}} {{/each}}

{{#if negativePrompt}}
**NEGATIVE PROMPT (AVOID THESE THEMES/IDEAS):**
"{{{negativePrompt}}}"
{{/if}}

{{#if forbiddenWords.length}}
**FORBIDDEN WORDS (DO NOT USE):**
{{#each forbiddenWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}

{{#if mustIncludeWords.length}}
**MUST-INCLUDE WORDS (INTEGRATE NATURALLY):**
You MUST use the following words in your suggestions, integrating them naturally into the lyrics: {{#each mustIncludeWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}

{{#if endWith}}- MANDATORY: The generated line MUST end with the EXACT phrase: "{{endWith}}"{{/if}}

Return JSON array of two objects. Every object must have 'line', 'rhymeKey', 'syllables', and 'notes'.`,
});

const generateNextLineFlow = ai.defineFlow(
  {
    name: 'generateNextLineFlow',
    inputSchema: GenerateNextLineInputSchema,
    outputSchema: GenerateNextLineFlowOutputSchema,
  },
  async input => {
    const response = await nextLinePrompt(input, getGenkitPromptOptions());
    if (!response || !response.output) return [];
    let options = response.output.slice(0, 2);
    const contextLines = [
      ...input.priorLines,
      ...input.nextLines,
      ...(input.albumRepetitionContext ?? []),
    ]
      .map((l) => l.trim())
      .filter(Boolean);

    const applyGuardrails = (pool: typeof options) => {
      let next = pool;
      const forbidden = input.forbiddenWords ?? [];
      if (forbidden.length > 0) {
        const banned = enforceBannedWordsOnOptions(next.map((o) => o.line), forbidden);
        if (banned.hadViolations) {
          next = banned.options
            .map((line) => next.find((o) => o.line === line) ?? { ...next[0], line })
            .slice(0, 2);
        }
      }
      if (contextLines.length > 0) {
        const repetition = enforceRepetitionOnOptions(next.map((o) => o.line), contextLines);
        if (repetition.hadViolations) {
          next = repetition.options
            .map((line) => next.find((o) => o.line === line) ?? { ...next[0], line })
            .slice(0, 2);
        }
      }
      const avoidEnds = new Set(
        (input.albumAvoidEndWords ?? []).map((w) => w.trim().toLowerCase()).filter(Boolean)
      );
      if (avoidEnds.size > 0 && next.length) {
        const filtered = next.filter((o) => {
          const ew = lineEndWord(o.line);
          return !ew || !avoidEnds.has(ew.toLowerCase());
        });
        if (filtered.length > 0) next = filtered;
      }
      return next;
    };

    options = applyGuardrails(options);
    if (options.length < 2 && (input.forbiddenWords?.length || contextLines.length)) {
      const retry = await nextLinePrompt(input, getGenkitPromptOptions());
      const retryOptions = retry?.output?.slice(0, 2) ?? [];
      options = applyGuardrails([...options, ...retryOptions]).slice(0, 2);
    }

    // Deterministic metadata — never trust the model's own numbers.
    return Promise.all(
      options.map(async (opt) => {
        const metrics = await computeLineMetrics(opt.line);
        return { ...opt, syllables: metrics.syllables, rhymeKey: metrics.rhymeKey };
      })
    );
  }
);
