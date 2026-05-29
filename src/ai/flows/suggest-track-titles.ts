'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting track titles based on the track's lyrics and vibe.
 * Stability Lock (4/20/2026): Removed unstable server-side logging.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { DirectionSchema } from './types';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { AI_COSTS } from '@/lib/costs';

export type AiSecuredInput = { idToken: string; userId: string };

const SuggestTrackTitlesInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  lyrics: z.string().describe('The lyrics of the track.'),
  vibe: z
    .object({
      genre: z.string().describe('The genre of the track.'),
      tempoBPM: z.number().describe('The tempo of the track in BPM.'),
      feeling: z.array(z.string()).describe('The feelings associated with the track.'),
    })
    .describe('The vibe of the track.'),
  albumTheme: z.string().describe('The overall theme of the album.'),
  mergedDirection: DirectionSchema.optional().describe('The merged creative direction for the track.'),
  negativePrompt: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  mustIncludeWords: z.array(z.string()).optional(),
});

export type SuggestTrackTitlesInput = z.infer<typeof SuggestTrackTitlesInputSchema>;

const SuggestTrackTitlesOutputSchema = z.array(z.string()).describe('An array of suggested track titles.');

export type SuggestTrackTitlesOutput = z.infer<typeof SuggestTrackTitlesOutputSchema>;

export async function suggestTrackTitles(input: SuggestTrackTitlesInput & AiSecuredInput): Promise<SuggestTrackTitlesOutput> {
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'suggestTrackTitles', inkCost: AI_COSTS.suggestTrackTitles },
    () => suggestTrackTitlesFlow(flowInput),
    input.userName
  );
}

const prompt = ai.definePrompt({
  name: 'suggestTrackTitlesPrompt',
  input: {schema: SuggestTrackTitlesInputSchema},
  output: {schema: SuggestTrackTitlesOutputSchema},
  prompt: `You are a creative track titler, skilled at naming songs based on their lyrics and vibe.

  Summarize the track's lyrics and vibe into 5 punchy titles.

  Album Theme: {{{albumTheme}}}
  {{#if mergedDirection}}
  Creative Direction:
    - World: {{mergedDirection.setting_world}}
    - Emotion: {{mergedDirection.emotion_core}}
    - Message: {{mergedDirection.message_truth}}
  {{/if}}
  Lyrics: {{{lyrics}}}
  Vibe: Genre - {{{vibe.genre}}}, Tempo - {{{vibe.tempoBPM}}} BPM, Feelings - {{{vibe.feeling}}}
  
  {{#if negativePrompt}}
  NEGATIVE PROMPT: Absolutely avoid generating titles related to the following themes or ideas: "{{negativePrompt}}"
  {{/if}}
  {{#if forbiddenWords.length}}
  FORBIDDEN WORDS: Do not use any of the following words in your titles: {{#each forbiddenWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
  {{/if}}
  {{#if mustIncludeWords.length}}
  MUST-INCLUDE WORDS: The titles should ideally reference or be inspired by these words: {{#each mustIncludeWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
  {{/if}}

  Output a JSON array of strings.
  `,
});

const suggestTrackTitlesFlow = ai.defineFlow(
  {
    name: 'suggestTrackTitlesFlow',
    inputSchema: SuggestTrackTitlesInputSchema,
    outputSchema: SuggestTrackTitlesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
