/** Chrome often encodes a mono mic as stereo with a silent right channel. */

function audioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/** Send L and R into both speakers so a one-sided take still plays in both. */
export function connectDualMono(source: AudioNode, destination: AudioNode): void {
  const ctx = source.context;
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  const gain = ctx.createGain();
  gain.gain.value = 0.85;
  source.connect(gain);
  gain.connect(splitter);
  splitter.connect(merger, 0, 0);
  splitter.connect(merger, 0, 1);
  splitter.connect(merger, 1, 0);
  splitter.connect(merger, 1, 1);
  merger.connect(destination);
}

export function hookElementDualMono(audio: HTMLAudioElement): AudioContext | null {
  const tagged = audio as HTMLAudioElement & { __b4bDualMono?: AudioContext };
  if (tagged.__b4bDualMono) return tagged.__b4bDualMono;
  const AC = audioContextCtor();
  if (!AC) return null;
  const ctx = new AC();
  const source = ctx.createMediaElementSource(audio);
  connectDualMono(source, ctx.destination);
  tagged.__b4bDualMono = ctx;
  return ctx;
}

function encodeStereoWav(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const samples = Math.min(left.length, right.length);
  const bytes = samples * 4;
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
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < samples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(o, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(o + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    o += 4;
  }
  return new Blob([out], { type: 'audio/wav' });
}

/** Decode any take and write the same signal to left and right. */
export async function remixBlobToDualMono(blob: Blob): Promise<Blob> {
  const AC = audioContextCtor();
  if (!AC) return blob;
  const ctx = new AC();
  try {
    const decoded = await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));
    const len = decoded.length;
    const mixed = new Float32Array(len);
    const channels = Math.max(1, decoded.numberOfChannels);
    for (let c = 0; c < channels; c++) {
      const data = decoded.getChannelData(c);
      for (let i = 0; i < len; i++) mixed[i] += data[i];
    }
    if (channels > 1) {
      const inv = 1 / channels;
      for (let i = 0; i < len; i++) mixed[i] *= inv;
    }
    return encodeStereoWav(mixed, mixed, decoded.sampleRate);
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

export async function dualMonoCaptureStream(mic: MediaStream): Promise<{
  stream: MediaStream;
  close: () => void;
}> {
  const AC = audioContextCtor();
  if (!AC) {
    return {
      stream: mic,
      close: () => {
        mic.getTracks().forEach((track) => track.stop());
      },
    };
  }
  const ctx = new AC();
  if (ctx.state === 'suspended') await ctx.resume();
  const source = ctx.createMediaStreamSource(mic);
  const dest = ctx.createMediaStreamDestination();
  dest.channelCount = 2;
  connectDualMono(source, dest);
  return {
    stream: dest.stream,
    close: () => {
      mic.getTracks().forEach((track) => track.stop());
      try {
        source.disconnect();
      } catch {
        /* already closed */
      }
      void ctx.close();
    },
  };
}
