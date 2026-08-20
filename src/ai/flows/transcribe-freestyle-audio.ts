'use server';

import { ai, z } from '@/ai/genkit';
import { runSecuredAiAction, stripAiAuth, verifyAiToken } from '@/lib/server/ai-gate';
import {
  claimFreestyleChunk,
  releaseFailedFreestyleCharge,
} from '@/lib/server/freestyle-session';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import type { AiSecuredInput } from '@/lib/ai-secured';
import { sanitizeFreestyleTranscript } from '@/lib/freestyle-transcript';
import {
  buildFreestyleTranscribePrompt,
  FREESTYLE_CONTEXT_FIELD_MAX,
  FREESTYLE_PRIOR_TAIL_CHARS,
  FREESTYLE_STYLE_CONTEXT_MAX,
} from '@/lib/freestyle-transcription-context';

const MAX_AUDIO_BASE64_CHARS = 120_000;

const TranscribeFreestyleInputSchema = z.object({
  audioBase64: z.string().max(MAX_AUDIO_BASE64_CHARS),
  mimeType: z.string().max(80),
  priorTranscriptTail: z.string().max(FREESTYLE_PRIOR_TAIL_CHARS).optional(),
  albumTheme: z.string().max(FREESTYLE_CONTEXT_FIELD_MAX).optional(),
  trackVibeSummary: z.string().max(FREESTYLE_CONTEXT_FIELD_MAX).optional(),
  styleProfileSummary: z.string().max(FREESTYLE_STYLE_CONTEXT_MAX).optional(),
});
export type TranscribeFreestyleInput = z.infer<typeof TranscribeFreestyleInputSchema>;

const TranscribeFreestyleOutputSchema = z.object({
  transcript: z.string(),
  /** True only when this server-owned session chunk paid the flat session fee. */
  billedSession: z.boolean().optional(),
});
export type TranscribeFreestyleOutput = z.infer<typeof TranscribeFreestyleOutputSchema>;

const TRANSCRIBE_MODEL = 'googleai/gemini-2.5-flash';

function isRetryableTranscribeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('fetch failed') ||
    message.includes('other side closed') ||
    message.includes('UND_ERR_SOCKET') ||
    message.includes('ECONNRESET') ||
    message.includes('timeout')
  );
}

async function generateTranscript(input: TranscribeFreestyleInput): Promise<string> {
  const mime = input.mimeType.split(';')[0] || 'audio/webm';
  const instruction = buildFreestyleTranscribePrompt({
    priorTranscriptTail: input.priorTranscriptTail,
    albumTheme: input.albumTheme,
    trackVibeSummary: input.trackVibeSummary,
    styleProfileSummary: input.styleProfileSummary,
  });

  const byoOpts = getGenkitPromptOptions();
  const response = await ai.generate({
    model: TRANSCRIBE_MODEL,
    config: { temperature: 0, ...byoOpts.config },
    output: { schema: TranscribeFreestyleOutputSchema },
    prompt: [
      {
        media: {
          url: `data:${mime};base64,${input.audioBase64}`,
          contentType: mime,
        },
      },
      { text: instruction },
    ],
  });
  const parsed = response.output;
  const raw =
    parsed && typeof parsed === 'object' && 'transcript' in parsed
      ? String((parsed as TranscribeFreestyleOutput).transcript)
      : response.text || '';
  return sanitizeFreestyleTranscript(raw);
}

async function generateTranscriptWithRetry(input: TranscribeFreestyleInput): Promise<string> {
  const attempts = 3;
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await generateTranscript(input);
    } catch (error) {
      lastError = error;
      if (!isRetryableTranscribeError(error) || i === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
    }
  }
  throw lastError;
}

const transcribeFreestyleFlow = ai.defineFlow(
  {
    name: 'transcribeFreestyleFlow',
    inputSchema: TranscribeFreestyleInputSchema,
    outputSchema: TranscribeFreestyleOutputSchema,
  },
  async (input) => {
    const transcript = await generateTranscriptWithRetry(input);
    return { transcript };
  }
);

/**
 * Chunk transcription during an active freestyle session.
 * Ink is charged once per server-owned session, on the 5th audible chunk.
 */
export async function transcribeFreestyleAudio(
  input: TranscribeFreestyleInput & AiSecuredInput
): Promise<TranscribeFreestyleOutput> {
  const flowInput = stripAiAuth(input);
  const uid = await verifyAiToken(input.idToken, input.userId);
  const claim = await claimFreestyleChunk(uid);

  try {
    const result = await runSecuredAiAction(
      {
        idToken: input.idToken,
        userId: input.userId,
        actionName: claim.shouldCharge
          ? 'freestyleTranscription'
          : 'freestyleTranscriptionChunk',
        inkCost: 0,
        customApiKey: input.customApiKey,
      },
      () => transcribeFreestyleFlow(flowInput)
    );
    return { ...result, billedSession: claim.shouldCharge };
  } catch (error) {
    if (claim.shouldCharge) {
      await releaseFailedFreestyleCharge(uid, claim.reservationId).catch(() => undefined);
    }
    throw error;
  }
}
