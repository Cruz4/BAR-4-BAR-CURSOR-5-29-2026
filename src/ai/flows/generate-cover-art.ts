'use server';

/**
 * @fileOverview A Genkit flow for generating a descriptive text prompt for album or track cover art.
 * Stability Lock (4/20/2026): Removed unstable server-side logging.
 */

import { ai, z } from '@/ai/genkit';
import { DirectionSchema } from './types';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { AI_COSTS } from '@/lib/costs';

export type AiSecuredInput = { idToken: string; userId: string };

const GenerateCoverArtInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  lyrics: z.string().describe('The full lyrics of the track.'),
  vibe: z.object({
    genre: z.string(),
    tempoBPM: z.number(),
    feeling: z.array(z.string()),
  }),
  mergedDirection: DirectionSchema.describe('The merged creative direction for the track.'),
  title: z.string().describe('The title of the track.'),
  negativePrompt: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  mustIncludeWords: z.array(z.string()).optional(),
});
export type GenerateCoverArtInput = z.infer<typeof GenerateCoverArtInputSchema>;

const GenerateCoverArtOutputSchema = z.object({
  prompt: z.string().describe('The descriptive prompt that can be used to generate the image.'),
});
export type GenerateCoverArtOutput = z.infer<typeof GenerateCoverArtOutputSchema>;


export async function generateCoverArt(input: GenerateCoverArtInput & AiSecuredInput): Promise<GenerateCoverArtOutput> {
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'generateCoverArt', inkCost: AI_COSTS.generateCoverArt },
    () => generateCoverArtFlow(flowInput),
    input.userName
  );
}

const generationPromptTemplate = ai.definePrompt({
    name: 'coverArtPromptGenerator',
    input: { schema: GenerateCoverArtInputSchema },
    output: { schema: GenerateCoverArtOutputSchema },
    prompt: `You are an expert creative director for a record label. Your task is to create a detailed, evocative, and artistic prompt for an AI image generator to produce cover art for a song.

The prompt should be a single, descriptive paragraph. Do not use lists or bullet points.
Focus on visual details, mood, color palette, and composition.
The style should be photographic, cinematic, or like a digital painting. Avoid cartoony or overly abstract styles.
Capture the essence of the song based on the provided context.

SONG CONTEXT:
- Title: "{{title}}"
- Creative Direction (Setting): {{mergedDirection.setting_world}}
- Creative Direction (Emotion): {{mergedDirection.emotion_core}}
- Creative Direction (Message): {{mergedDirection.message_truth}}
- Creative Direction (Tone): {{mergedDirection.tone_palette}}
- Vibe: {{vibe.genre}}, {{vibe.feeling}}
- Lyrics Summary: {{lyrics}}

{{#if negativePrompt}}
NEGATIVE PROMPT: Absolutely avoid generating content with themes or ideas related to: "{{negativePrompt}}"
{{/if}}
{{#if forbiddenWords.length}}
FORBIDDEN WORDS: Do not use any of the following words in the prompt: {{#each forbiddenWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}
{{#if mustIncludeWords.length}}
MUST-INCLUDE WORDS: The prompt should strongly feature or visually represent these concepts: {{#each mustIncludeWords}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}


Based on this context, generate a JSON object with a single key "prompt" containing a single paragraph describing the perfect cover art.`
});


const generateCoverArtFlow = ai.defineFlow(
  {
    name: 'generateCoverArtFlow',
    inputSchema: GenerateCoverArtInputSchema,
    outputSchema: GenerateCoverArtOutputSchema,
  },
  async (input) => {
    // Step 1: Generate a high-quality descriptive prompt for the image model.
    const response = await generationPromptTemplate({
        ...input,
        // Summarize lyrics to fit context window if they are too long
        lyrics: input.lyrics.slice(0, 3000)
    });

    const descriptivePrompt = response.output;

    if (!descriptivePrompt) {
        throw new Error("Failed to generate a descriptive prompt for the cover art.");
    }

    return descriptivePrompt;
  }
);
