'use server';

import { ai, z } from '@/ai/genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';
import { getGenkitPromptOptions } from '@/lib/server/genkit-request';
import type { AiSecuredInput } from '@/lib/ai-secured';

function sanitizeVoiceTranscript(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { transcript?: unknown };
      if (typeof parsed.transcript === 'string') return sanitizeVoiceTranscript(parsed.transcript);
    } catch {
      /* plain text */
    }
  }
  const lower = trimmed.toLowerCase();
  const silence =
    lower === '[silence]' ||
    lower === '(silence)' ||
    lower === 'n/a' ||
    lower === 'none' ||
    lower === 'no speech' ||
    lower === 'no clear speech' ||
    lower === 'no audible speech' ||
    lower === 'no discernible speech';
  if (silence || lower.startsWith('no speech.') || lower.startsWith('no clear speech.')) {
    return '';
  }
  return trimmed.replace(/^["'`]+|["'`]+$/g, '').trim();
}

const MAX_AUDIO_BASE64_CHARS = 200_000;

const TranscribeVoiceNoteInputSchema = z.object({
  audioBase64: z.string().max(MAX_AUDIO_BASE64_CHARS),
  mimeType: z.string().max(80),
});
export type TranscribeVoiceNoteInput = z.infer<typeof TranscribeVoiceNoteInputSchema>;

const TranscribeVoiceNoteOutputSchema = z.object({
  transcript: z.string(),
});
export type TranscribeVoiceNoteOutput = z.infer<typeof TranscribeVoiceNoteOutputSchema>;

const TRANSCRIBE_MODEL = 'googleai/gemini-2.5-flash';
const INSTRUCTION =
  'Transcribe the spoken words in this audio clip. Write only the words that were said. Keep slang, names, and contractions.';

function isRetryableTranscribeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('fetch failed') ||
    message.includes('other side closed') ||
    message.includes('UND_ERR_SOCKET') ||
    message.includes('ECONNRESET') ||
    message.includes('timeout') ||
    message.includes('429') ||
    message.includes('UNAVAILABLE')
  );
}

async function generateVoiceTranscript(input: TranscribeVoiceNoteInput, withSchema: boolean): Promise<string> {
  const mime = input.mimeType.split(';')[0] || 'audio/wav';
  const byoOpts = getGenkitPromptOptions();
  const response = await ai.generate({
    model: TRANSCRIBE_MODEL,
    config: { temperature: 0, ...byoOpts.config },
    ...(withSchema ? { output: { schema: TranscribeVoiceNoteOutputSchema } } : {}),
    prompt: [
      {
        media: {
          url: `data:${mime};base64,${input.audioBase64}`,
          contentType: mime,
        },
      },
      { text: INSTRUCTION },
    ],
  });
  const parsed = response.output;
  const raw =
    parsed && typeof parsed === 'object' && 'transcript' in parsed
      ? String((parsed as TranscribeVoiceNoteOutput).transcript)
      : response.text || '';
  return sanitizeVoiceTranscript(raw);
}

async function generateVoiceTranscriptWithRetry(input: TranscribeVoiceNoteInput): Promise<string> {
  let lastError: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await generateVoiceTranscript(input, i === 0);
    } catch (error) {
      lastError = error;
      if (!isRetryableTranscribeError(error) && i > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
    }
  }
  throw lastError;
}

const transcribeVoiceNoteFlow = ai.defineFlow(
  {
    name: 'transcribeVoiceNoteFlow',
    inputSchema: TranscribeVoiceNoteInputSchema,
    outputSchema: TranscribeVoiceNoteOutputSchema,
  },
  async (input) => ({ transcript: await generateVoiceTranscriptWithRetry(input) })
);

export async function transcribeVoiceNote(
  input: TranscribeVoiceNoteInput & AiSecuredInput
): Promise<TranscribeVoiceNoteOutput> {
  return runSecuredAiAction(
    {
      idToken: input.idToken,
      userId: input.userId,
      actionName: 'transcribeVoiceNote',
      inkCost: 0,
      customApiKey: input.customApiKey,
    },
    () => transcribeVoiceNoteFlow(stripAiAuth(input))
  );
}
