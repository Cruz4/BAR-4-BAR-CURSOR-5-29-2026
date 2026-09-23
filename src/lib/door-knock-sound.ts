/** Spacing between the three knocks (seconds). */
const KNOCK_OFFSETS_SEC = [0, 0.13, 0.26] as const;

/** How long to keep the audio context open after the last knock. */
export const DOOR_KNOCK_SOUND_MS = 520;

/** Match fist animation on the Knock button. */
export const DOOR_KNOCK_PUNCH_ANIM_MS = 780;

function scheduleSingleKnock(ctx: AudioContext, at: number, peak: number) {
  const durationSec = 0.045;
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const noiseBuffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    const decay = Math.exp(-i / (sampleCount * 0.22));
    samples[i] = (Math.random() * 2 - 1) * decay;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(520, at);
  bandpass.Q.setValueAtTime(0.65, at);

  const tapGain = ctx.createGain();
  tapGain.gain.setValueAtTime(0.0001, at);
  tapGain.gain.linearRampToValueAtTime(peak * 0.55, at + 0.004);
  tapGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);

  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(165, at);
  thud.frequency.exponentialRampToValueAtTime(72, at + 0.055);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.0001, at);
  thudGain.gain.linearRampToValueAtTime(peak * 0.35, at + 0.006);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);

  noise.connect(bandpass);
  bandpass.connect(tapGain);
  thud.connect(thudGain);
  tapGain.connect(ctx.destination);
  thudGain.connect(ctx.destination);

  noise.start(at);
  noise.stop(at + durationSec + 0.01);
  thud.start(at);
  thud.stop(at + 0.1);
}

/** Classic triple door knock — synthesized, no asset file. Respects autoplay policies. */
export function playDoorKnockSound(volume = 0.22) {
  if (typeof window === 'undefined') return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const peak = Math.min(Math.max(volume, 0), 0.5);

    for (const offset of KNOCK_OFFSETS_SEC) {
      scheduleSingleKnock(ctx, now + offset, peak);
    }

    window.setTimeout(() => void ctx.close(), DOOR_KNOCK_SOUND_MS);
  } catch {
    /* autoplay blocked or unsupported */
  }
}
