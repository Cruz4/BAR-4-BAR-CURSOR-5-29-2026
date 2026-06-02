'use server';

import { ai, z } from '@/ai/genkit';
import { runSecuredAiAction, stripAiAuth } from '@/lib/server/ai-gate';

export type AiSecuredInput = { idToken: string; userId: string };

const MAX_AUDIO_BASE64_CHARS = 120_000;

const TranscribeFreestyleInputSchema = z.object({
  audioBase64: z.string().max(MAX_AUDIO_BASE64_CHARS),
  mimeType: z.string().max(80),
});
export type TranscribeFreestyleInput = z.infer<typeof TranscribeFreestyleInputSchema>;

const TranscribeFreestyleOutputSchema = z.object({
  transcript: z.string(),
});
export type TranscribeFreestyleOutput = z.infer<typeof TranscribeFreestyleOutputSchema>;

const TRANSCRIBE_MODEL = 'googleai/gemini-2.5-flash';

const TRANSCRIBE_PROMPT = `You are a verbatim speech-to-text engine.

Listen to the attached audio clip and write ONLY the exact words spoken by a human voice.

Rules (strict):
- If the clip is silent, empty, muffled, or only background noise: output nothing (zero characters).
- Do NOT invent, complete, or improvise lyrics, freestyle bars, rap lines, or filler speech.
- Do NOT describe the audio, the setting, DJs, booths, or what someone "might" be saying.
- Do NOT use placeholders or examples. No commentary, labels, or quotes around the text.
- When unsure whether speech is present, output nothing.`;

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

function sanitizeTranscript(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const silenceMarkers = [
    '[silence]',
    '(silence)',
    'no speech',
    'no audible speech',
    'no discernible speech',
    'no clear speech',
    'silent audio',
    'empty audio',
    'inaudible',
  ];
  if (silenceMarkers.some((marker) => lower === marker || lower.startsWith(`${marker}.`))) {
    return '';
  }

  return trimmed
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^\(.*\)$/s, '')
    .trim();
}

async function generateTranscript(mime: string, audioBase64: string): Promise<string> {
  const { text } = await ai.generate({
    model: TRANSCRIBE_MODEL,
    config: { temperature: 0 },
    prompt: [
      {
        media: {
          url: `data:${mime};base64,${audioBase64}`,
          contentType: mime,
        },
      },
      { text: TRANSCRIBE_PROMPT },
    ],
  });
  return sanitizeTranscript(text || '');
}

async function generateTranscriptWithRetry(mime: string, audioBase64: string): Promise<string> {
  const attempts = 3;
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await generateTranscript(mime, audioBase64);
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
    const mime = input.mimeType.split(';')[0] || 'audio/webm';
    const transcript = await generateTranscriptWithRetry(mime, input.audioBase64);
    return { transcript };
  }
);

/** Chunk transcription during an active freestyle session (ink charged once on the client). */
export async function transcribeFreestyleAudio(
  input: TranscribeFreestyleInput & AiSecuredInput
): Promise<TranscribeFreestyleOutput> {
  const flowInput = stripAiAuth(input);
  return runSecuredAiAction(
    {
      idToken: input.idToken,
      userId: input.userId,
      actionName: 'freestyleTranscriptionChunk',
      inkCost: 0,
    },
    () => transcribeFreestyleFlow(flowInput)
  );
}
