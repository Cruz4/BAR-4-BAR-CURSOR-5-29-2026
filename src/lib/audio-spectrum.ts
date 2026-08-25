export const MUSICAL_EQ_BANDS = [
  { lowHz: 35, highHz: 180, gain: 0.72 },
  { lowHz: 180, highHz: 700, gain: 0.86 },
  { lowHz: 700, highHz: 2_800, gain: 1 },
  { lowHz: 2_800, highHz: 10_000, gain: 1.14 },
] as const;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Measures a musical frequency range without letting a single FFT peak pin the
 * meter. The small noise-floor cut keeps silence and inaudible sub energy from
 * looking louder than the track actually is.
 */
export function measureSpectrumBand(
  analyser: AnalyserNode,
  bins: Uint8Array,
  band: { lowHz: number; highHz: number; gain: number }
): number {
  const binHz = analyser.context.sampleRate / analyser.fftSize;
  const start = Math.max(1, Math.floor(band.lowHz / binHz));
  const end = Math.min(bins.length, Math.max(start + 1, Math.ceil(band.highHz / binHz)));
  let sum = 0;
  let sumSquares = 0;
  let peak = 0;

  for (let index = start; index < end; index += 1) {
    const value = bins[index] / 255;
    sum += value;
    sumSquares += value * value;
    peak = Math.max(peak, value);
  }

  const count = Math.max(1, end - start);
  const average = sum / count;
  const rms = Math.sqrt(sumSquares / count);
  const body = Math.max(0, rms - 0.035) / 0.82;
  const transient = Math.max(0, peak - average - 0.12) * 0.07;
  return Math.min(0.96, clamp01(Math.pow(body, 0.9) * band.gain + transient));
}

export function smoothSpectrumLevel(current: number, target: number): number {
  const speed = target > current ? 0.24 : 0.095;
  return current + (target - current) * speed;
}
