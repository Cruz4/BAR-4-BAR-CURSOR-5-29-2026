'use client';

import { blobToBase64 } from '@/lib/speech-recognition';
import { withAiAuth } from '@/lib/ai-client';
import { lazyTranscribeVoiceNote } from '@/lib/lazy-ai-flows';
import { VOICE_MAX_TRANSCRIPT } from '@/lib/profile/voice-notes';
import { mergeFreestyleTranscriptChunk } from '@/lib/freestyle-transcript';

const TARGET_RATE = 16000;
const CHUNK_SECONDS = 3;
const MIN_CHUNK_RMS = 0.002;

function encodeMonoWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = samples.length * 2;
  const out = new ArrayBuffer(44 + bytes);
  const view = new DataView(out);
  const str = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Blob([out], { type: 'audio/wav' });
}

function chunkRms(samples: Float32Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  return Math.sqrt(sum / samples.length);
}

function audioContext(): AudioContext {
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('This browser can’t decode audio for transcripts.');
  return new Ctx();
}

async function pcmMono16k(blob: Blob): Promise<Float32Array> {
  const ctx = audioContext();
  try {
    const decoded = await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));
    const srcRate = decoded.sampleRate;
    const length = Math.max(1, Math.floor(decoded.length * (TARGET_RATE / srcRate)));
    const mono = new Float32Array(length);
    const channels = Math.max(1, decoded.numberOfChannels);
    for (let i = 0; i < length; i++) {
      const src = Math.min(decoded.length - 1, Math.floor(i * (srcRate / TARGET_RATE)));
      let sum = 0;
      for (let c = 0; c < channels; c++) sum += decoded.getChannelData(c)[src] || 0;
      mono[i] = sum / channels;
    }
    return mono;
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

async function transcribeWavChunk(blob: Blob): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const result = await lazyTranscribeVoiceNote(
    await withAiAuth({
      audioBase64,
      mimeType: 'audio/wav',
    })
  );
  return (result.transcript || '').trim();
}

export async function transcribeVoiceBlob(blob: Blob): Promise<string> {
  if (blob.size < 400) return '';
  const pcm = await pcmMono16k(blob);
  const chunkSamples = TARGET_RATE * CHUNK_SECONDS;
  const shortTake = pcm.length <= chunkSamples;
  let combined = '';
  let lastError: unknown;
  for (let i = 0; i < pcm.length; i += chunkSamples) {
    const slice = pcm.slice(i, Math.min(pcm.length, i + chunkSamples));
    if (slice.length < TARGET_RATE * 0.35) continue;
    if (!shortTake && chunkRms(slice) < MIN_CHUNK_RMS) continue;
    try {
      const text = await transcribeWavChunk(encodeMonoWav(slice, TARGET_RATE));
      combined = mergeFreestyleTranscriptChunk(combined, text);
    } catch (error) {
      lastError = error;
    }
  }
  if (combined.trim()) return combined.slice(0, VOICE_MAX_TRANSCRIPT);
  if (lastError) throw lastError;
  return '';
}
