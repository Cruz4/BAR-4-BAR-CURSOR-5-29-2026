'use server';

/**
 * @fileOverview An AI agent that learns a user's style based on accepted lyrics.
 * Hardened (5/14/2026): AURA-ONLY PROTOCOL. 
 * Logic: Analyzes technical flow and vocabulary without extracting literal phrases.
 * Update (5/14): High-Fidelity structured metrics for Technical DNA display.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { AI_COSTS } from '@/lib/costs';
import type { AiSecuredInput } from '@/lib/ai-secured';

const ImproveMyStyleInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  lyrics: z.string().describe('A string containing all the lyrics from a section, separated by newlines.'),
});
export type ImproveMyStyleInput = z.infer<typeof ImproveMyStyleInputSchema>;

const ImproveMyStyleOutputSchema = z.object({
  analysis: z.string().describe('A concise summary of the lyrical style analysis.'),
  metrics: z.object({
    vocabularyScore: z.number().describe('0-100 score of word variety.'),
    rhymeComplexity: z.number().describe('0-100 score of rhyme depth.'),
    cadenceMap: z.string().describe('A short descriptive name for the flow/meter found.'),
  }),
});
export type ImproveMyStyleOutput = z.infer<typeof ImproveMyStyleOutputSchema>;

export async function improveMyStyle(input: ImproveMyStyleInput & AiSecuredInput): Promise<ImproveMyStyleOutput> {
  if (!input.lyrics || input.lyrics.trim().length < 10) throw new Error("Insufficient context.");
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'improveMyStyle', inkCost: AI_COSTS.improveMyStyle, customApiKey: input.customApiKey },
    () => improveMyStyleFlow(flowInput),
    input.userName
  );
}

const styleLearningPrompt = ai.definePrompt({
  name: 'styleLearningPrompt',
  input: {schema: ImproveMyStyleInputSchema},
  output: {schema: ImproveMyStyleOutputSchema},
  prompt: `You are an AI lyrical analysis assistant. Analyze these lyrics:
"
{{{lyrics}}}
"

Identify the unique "Artist DNA". Provide a summary and structured metrics.

**CRITICAL CONSTRAINT (AURA-ONLY PROTOCOL):**
Your analysis summary must focus ONLY on technical attributes: flow pattern (e.g. staccato, fluid, laid-back), vocabulary complexity (e.g. street-level, dense metaphors, academic), rhyme architecture (e.g. multi-syllabic internal chains, simple end-couplets), and narrative POV. 

**STRICTLY FORBIDDEN:**
- DO NOT include literal phrases or specific recurring words from the input (e.g. if they say "Oh shit" a lot, note the "exclamatory staccato style", NOT the words "Oh shit").
- DO NOT mention specific slang words even if they repeat.
- DO NOT repeat literal sentences.
The goal is to capture the "Technique", not the "Content". We want to know HOW the user writes, not WHAT they wrote.

1. Analysis: A single-sentence summary focusing exclusively on technical flow, technical slang level, and imagery technique.
2. Vocabulary Score: 0-100 (variety).
3. Rhyme Complexity: 0-100 (internal chains vs simple end-rhymes).
4. Cadence Map: A 2-3 word name for the rhythm pattern (e.g. "Staccato Triplets", "Lazy Couplets").

Return ONLY a JSON object.`,
});

const improveMyStyleFlow = ai.defineFlow(
  {
    name: 'improveMyStyleFlow',
    inputSchema: ImproveMyStyleInputSchema,
    outputSchema: ImproveMyStyleOutputSchema,
  },
  async input => {
    const {output} = await styleLearningPrompt(input, getGenkitPromptOptions());
    if (!output) throw new Error("Analysis failed.");
    return output;
  }
);