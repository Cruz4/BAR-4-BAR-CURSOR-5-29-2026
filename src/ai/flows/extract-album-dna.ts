'use server';

/**
 * Album DNA extraction — synthesize World Building / Emotional Core / Message Truth
 * from an ordered multi-track lyric corpus (Pro).
 */

import { ai, z } from '@/ai/genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import { AI_COSTS } from '@/lib/costs';
import type { AiSecuredInput } from '@/lib/ai-secured';

const ExtractAlbumDnaInputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  albumTitle: z.string().describe('Album title.'),
  albumTheme: z.string().optional().describe('Optional album theme / one-liner.'),
  tracksCorpus: z
    .string()
    .describe('Ordered TRACK n/N blocks with titles and lyrics.'),
});

export type ExtractAlbumDnaInput = z.infer<typeof ExtractAlbumDnaInputSchema>;

const ExtractAlbumDnaOutputSchema = z.object({
  setting_world: z
    .string()
    .describe('World Building — where/when this album lives as a whole (1–3 sentences).'),
  emotion_core: z
    .string()
    .describe('Emotional Core — the dominant feeling arc across the album (1–3 sentences).'),
  message_truth: z
    .string()
    .describe('Message Truth — what the album is really about underneath (1–3 sentences).'),
});

export type ExtractAlbumDnaOutput = z.infer<typeof ExtractAlbumDnaOutputSchema>;

export async function extractAlbumDna(
  input: ExtractAlbumDnaInput & AiSecuredInput
): Promise<ExtractAlbumDnaOutput> {
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    {
      idToken: input.idToken,
      userId: input.userId,
      actionName: 'extractAlbumDna',
      inkCost: AI_COSTS.extractAlbumDna,
      customApiKey: input.customApiKey,
    },
    () => extractAlbumDnaFlow(flowInput),
    input.userName
  );
}

const prompt = ai.definePrompt({
  name: 'extractAlbumDnaPrompt',
  input: { schema: ExtractAlbumDnaInputSchema },
  output: { schema: ExtractAlbumDnaOutputSchema },
  prompt: `You are a creative director synthesizing ALBUM-LEVEL Creative DNA for a concept album.

Album title: {{{albumTitle}}}
{{#if albumTheme}}Album theme note: {{{albumTheme}}}{{/if}}

Tracks appear IN ORDER (TRACK 1, TRACK 2, …). Use that sequence — how writing style, subject, feel, development, and flow evolve from openers through closers. Do NOT treat lyrics as a bag of themes; conclude a coherent album thesis.

Tracks corpus:
{{{tracksCorpus}}}

Fill exactly these three fields as clean prose (no labels like "[Themes]", no bullet lists unless essential):
1. setting_world — World Building: the shared place / era / circumstance the album inhabits.
2. emotion_core — Emotional Core: the primary feeling and how it shifts across the run.
3. message_truth — Message Truth: the deep through-line — what the album is really saying.

Keep each field to 1–3 sentences. Album-level only (not a summary of one track).`,
});

const extractAlbumDnaFlow = ai.defineFlow(
  {
    name: 'extractAlbumDnaFlow',
    inputSchema: ExtractAlbumDnaInputSchema,
    outputSchema: ExtractAlbumDnaOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, getGenkitPromptOptions());
    if (!output) {
      throw new Error('Album DNA extraction returned no output.');
    }
    return {
      setting_world: (output.setting_world || '').trim(),
      emotion_core: (output.emotion_core || '').trim(),
      message_truth: (output.message_truth || '').trim(),
    };
  }
);
