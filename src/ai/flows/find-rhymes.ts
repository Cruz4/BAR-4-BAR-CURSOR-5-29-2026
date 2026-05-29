'use server';

/**
 * @fileOverview This file defines a Genkit flow for finding rhyming words in a given text.
 * Optimized for professional rap phonetics and multi-syllabic schemes.
 * Update (5/14/2026): Phonetic Object Protocol to support Firestore.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { AI_COSTS } from '@/lib/costs';

export type AiSecuredInput = { idToken: string; userId: string };

const FindRhymesInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  text: z.string().describe('The full lyrical text to analyze for rhymes.'),
  newLine: z.string().optional().describe('The specific new or edited line to focus on finding rhymes for.'),
});
export type FindRhymesInput = z.infer<typeof FindRhymesInputSchema>;

const FindRhymesOutputSchema = z.object({
  rhymeGroups: z.array(z.object({
    words: z.array(z.string()).describe('An array of single words that rhyme.')
  })).describe('An array of rhyme group objects.'),
});
export type FindRhymesOutput = z.infer<typeof FindRhymesOutputSchema>;


export async function findRhymes(input: FindRhymesInput & AiSecuredInput): Promise<FindRhymesOutput> {
  const textToAnalyze = input.text.slice(0, 8000);
  if (textToAnalyze.trim().split(/\s+/).length < 2) {
    return { rhymeGroups: [] };
  }
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    { idToken: input.idToken, userId: input.userId, actionName: 'findRhymes', inkCost: AI_COSTS.findRhymes },
    () => findRhymesFlow({ ...flowInput, text: textToAnalyze }),
    input.userName
  );
}


const findRhymesPrompt = ai.definePrompt({
  name: 'findRhymesPrompt',
  input: {schema: FindRhymesInputSchema},
  output: {schema: FindRhymesOutputSchema},
  prompt: `You are a linguistic analysis expert specializing in rap phonetics and rhyme detection.
Analyze the provided song lyrics and identify all groups of rhyming words. 

**STRICT PHONETIC PROTOCOL:**
1. **FULL WORDS ONLY**: You must return the ENTIRE word as it appears in the text. NEVER return partial syllables or word fragments (e.g., if "mean" rhymes with "scene", return ["mean", "scene"], NOT ["an", "een"]).
2. **PHONETIC CLUSTERING**: Identify major rhyme clusters. Prioritize the LAST WORDS (end-rhymes) of each bar, but also identify matching internal rhymes within sentences.
3. **SCHEME RECOGNITION**: A group should only contain words that phonetically rhyme. If a new scheme starts, it should be a separate group with a different rhyme sound.
4. **STRICTLY EXCLUDE** filler words: of, a, it, the, and, in, to, for, with, is, as. Never highlight these.
5. Only return SINGLE WORDS in the groups. Do not return phrases or parts of words.
6. Case-insensitive analysis. Only include words actually present in the text.

Return your response in STRICT JSON format with the 'rhymeGroups' key. Each group must be an object with a 'words' array.

Lyrics to Analyze:
"
{{{text}}}
"
`,
});

const findRhymesFlow = ai.defineFlow(
  {
    name: 'findRhymesFlow',
    inputSchema: FindRhymesInputSchema,
    outputSchema: FindRhymesOutputSchema,
  },
  async input => {
    const {output} = await findRhymesPrompt(input);
    return output!;
  }
);