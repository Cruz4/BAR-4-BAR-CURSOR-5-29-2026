/** PCM WAV the browser can actually decode — used until ACE audio exists. */

const SAMPLE_RATE = 44_100;
const DURATION_SEC = 4;
const NOTES = [220, 261.63, 329.63, 392, 329.63, 261.63, 220];

export function buildStudioPreviewWav(durationSec = DURATION_SEC): Buffer {
  const numSamples = Math.floor(durationSec * SAMPLE_RATE);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  const noteLen = durationSec / NOTES.length;
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const ni = Math.min(NOTES.length - 1, Math.floor(t / noteLen));
    const localT = t - ni * noteLen;
    const env = Math.min(1, localT * 50) * Math.min(1, (noteLen - localT) * 10);
    const hz = NOTES[ni];
    const sample =
      Math.sin(2 * Math.PI * hz * t) * 0.28 * env +
      Math.sin(2 * Math.PI * hz * 2 * t) * 0.08 * env;
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), 44 + i * 2);
  }
  return buf;
}

export const STUDIO_PREVIEW_WAV_MIME = 'audio/wav';
