'use client';

import { applyAppCheckHeader } from '@/lib/firebase/client/app-check';

type AiFlowInput = Record<string, unknown>;

async function runAiFlow<T>(action: string, input: AiFlowInput): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  await applyAppCheckHeader(headers);
  const res = await fetch('/api/ai/run', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, input }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === 'string' ? body.error : `AI ${action} failed (${res.status})`
    );
  }
  return body as T;
}

export async function lazyFindRhymes(input: AiFlowInput) {
  return runAiFlow<Awaited<ReturnType<(typeof import('@/ai/flows/find-rhymes'))['findRhymes']>>>(
    'findRhymes',
    input
  );
}

export async function lazySuggestVibe(input: AiFlowInput) {
  return runAiFlow<Awaited<ReturnType<(typeof import('@/ai/flows/suggest-vibe'))['suggestVibe']>>>(
    'suggestVibe',
    input
  );
}

export async function lazyGenerateNextLine(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/generate-next-line'))['generateNextLine']>>
  >('generateNextLine', input);
}

export async function lazyImproveMyStyle(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/improve-my-style'))['improveMyStyle']>>
  >('improveMyStyle', input);
}

export async function lazyAnalyzeStructure(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/analyze-structure'))['analyzeStructure']>>
  >('analyzeStructure', input);
}

export async function lazyGenerateCoverArt(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/generate-cover-art'))['generateCoverArt']>>
  >('generateCoverArt', input);
}

export async function lazyRunCreativeEffect(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/creative-effects'))['runCreativeEffect']>>
  >('runCreativeEffect', input);
}

export async function lazyTranscribeFreestyleAudio(input: AiFlowInput) {
  return runAiFlow<
    Awaited<
      ReturnType<(typeof import('@/ai/flows/transcribe-freestyle-audio'))['transcribeFreestyleAudio']>
    >
  >('transcribeFreestyleAudio', input);
}

export async function lazyTranscribeVoiceNote(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/transcribe-voice-note'))['transcribeVoiceNote']>>
  >('transcribeVoiceNote', input);
}

export async function lazySuggestRelayDirections(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/writers-relay'))['suggestRelayDirections']>>
  >('suggestRelayDirections', input);
}

export async function lazyGenerateRelayDraft(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/writers-relay'))['generateRelayDraft']>>
  >('generateRelayDraft', input);
}

export async function lazyGenerateSongDraft(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/generate-song-draft'))['generateSongDraft']>>
  >('generateSongDraft', input);
}

export async function lazySuggestTrackTitles(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/suggest-track-titles'))['suggestTrackTitles']>>
  >('suggestTrackTitles', input);
}

export async function lazyExtractAlbumDna(input: AiFlowInput) {
  return runAiFlow<
    Awaited<ReturnType<(typeof import('@/ai/flows/extract-album-dna'))['extractAlbumDna']>>
  >('extractAlbumDna', input);
}
