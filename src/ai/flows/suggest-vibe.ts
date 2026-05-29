'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting a track's vibe based on its lyrics.
 * Stability Lock (4/20/2026): Deep-dive high-fidelity instrumentation and production tone.
 * Update (5/14/2026): 1000-character safety constraint for model compatibility.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { AI_COSTS } from '@/lib/costs';

export type AiSecuredInput = { idToken: string; userId: string };

const SuggestVibeInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  lyrics: z.string().describe('The lyrics of the track.'),
  negativePrompt: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
});

export type SuggestVibeInput = z.infer<typeof SuggestVibeInputSchema>;

const SuggestVibeOutputSchema = z.object({
    genre: z.string().describe('The suggested genre for the track (e.g., Lofi-Hop, Synthwave).'),
    tempoBPM: z.number().describe('The suggested tempo in BPM for the track.'),
    feeling: z.array(z.string()).describe('An array of 1-3 suggested feelings for the track (e.g., hopeful, melancholic).'),
    instrumentation: z.string().describe('A combined high-fidelity prompt for music AI including instrumentation and deep production tone.'),
    productionNotes: z.string().describe('Deep-dive technical production notes.')
}).describe('The suggested vibe for the track.');

export type SuggestVibeOutput = z.infer<typeof SuggestVibeOutputSchema>;

export async function suggestVibe(input: SuggestVibeInput & AiSecuredInput): Promise<SuggestVibeOutput> {
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'suggestVibe', inkCost: AI_COSTS.suggestVibe },
    () => suggestVibeFlow(flowInput),
    input.userName
  );
}

const prompt = ai.definePrompt({
  name: 'suggestVibePrompt',
  input: {schema: SuggestVibeInputSchema},
  output: {schema: SuggestVibeOutputSchema},
  prompt: `You are an expert music producer and A&R specialized in crafting "Beat Prompts" for AI music generators.
Analyze the provided lyrics for their mood, rhythm, and thematic content. 

Suggest a suitable genre, tempo (BPM), and feelings. 
Crucially, provide a high-fidelity, detailed "Instrumentation" string that includes a deep-dive into both the instruments and the technical PRODUCTION TONE (e.g., "Warm vinyl crackle, saturated 808s with a 45ms attack, airy vocal pads at 2k-5k Hz, and a gritty 12-bit lo-fi texture, 90s boom-bap saturation with parallel compression").

**STRICT CONSTRAINT:**
The "instrumentation" string must be highly evocative but MUST NOT exceed 1000 characters in total length.

{{#if negativePrompt}}
NEGATIVE PROMPT: Absolutely avoid suggesting a vibe related to the following themes or ideas: "{{negativePrompt}}"
{{/if}}
{{#if forbiddenWords.length}}
FORBIDDEN WORDS: Do not use any of the following words in your suggestions: {{#each forbiddenWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}

The output must be a single JSON object.

Lyrics:
"
{{{lyrics}}}
"
  `,
});

const suggestVibeFlow = ai.defineFlow(
  {
    name: 'suggestVibeFlow',
    inputSchema: SuggestVibeInputSchema,
    outputSchema: SuggestVibeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
