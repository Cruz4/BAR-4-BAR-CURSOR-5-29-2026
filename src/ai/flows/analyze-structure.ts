'use server';

/**
 * @fileOverview A Genkit flow for deconstructing raw lyrics into structured song sections.
 * Stability Lock (4/20/2026): SMART STRUCTURE PASTE.
 */

import { ai, z } from '@/ai/genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { AI_COSTS } from '@/lib/costs';
import type { AiSecuredInput } from '@/lib/ai-secured';

const AnalyzeStructureInputSchema = z.object({
  text: z.string().describe('The raw lyrical text to structure.'),
  userId: z.string().optional(),
});

const StructuredSectionSchema = z.object({
  type: z.enum(['verse', 'hook', 'bridge', 'intro', 'outro', 'pre', 'chorus']),
  lines: z.array(z.string()),
});

const AnalyzeStructureOutputSchema = z.object({
  sections: z.array(StructuredSectionSchema),
});

export type AnalyzeStructureOutput = z.infer<typeof AnalyzeStructureOutputSchema>;

export async function analyzeStructure(input: { text: string } & AiSecuredInput) {
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'analyzeStructure', inkCost: AI_COSTS.analyzeStructure, customApiKey: input.customApiKey },
    () => analyzeStructureFlow(flowInput)
  );
}

const structurePrompt = ai.definePrompt({
  name: 'analyzeStructurePrompt',
  input: { schema: AnalyzeStructureInputSchema },
  output: { schema: AnalyzeStructureOutputSchema },
  prompt: `You are a professional music editor. Analyze the following raw lyrics and group them into song sections.

**CONSTRAINTS:**
1. **NO ALTERATIONS**: Do not change the wording of the lyrics.
2. **SECTION IDENTIFICATION**: Group adjacent lines into logical blocks: [Intro], [Verse], [Hook/Chorus], [Pre], [Bridge], [Outro]. If the user already labeled sections with bracket headers (e.g. [Verse 1] on its own line), treat each label as the start of that section type.
3. **OUTPUT**: Return a JSON array of sections.

Raw Lyrics:
"
{{{text}}}
"`,
});

const analyzeStructureFlow = ai.defineFlow(
  {
    name: 'analyzeStructureFlow',
    inputSchema: AnalyzeStructureInputSchema,
    outputSchema: AnalyzeStructureOutputSchema,
  },
  async input => {
    const { output } = await structurePrompt(input, getGenkitPromptOptions());
    if (!output) throw new Error("Structural analysis failed.");
    return output;
  }
);
