import type { DnaPreset } from '@/lib/types';
import type { TrackVibe } from '@/lib/types';

/** Professional system strains available to free-tier artists (load-only). */

export function isSystemPreset(createdAt?: string | null): boolean {
  return createdAt === 'system';
}

/** Pro artists see studio presets plus their saved vault entries. */
export function mergeDnaVaultPresets(custom: DnaPreset[] | undefined, isPro: boolean): DnaPreset[] {
  if (!isPro) return SYSTEM_DNA_PRESETS as DnaPreset[];
  const user = (custom ?? []).filter((p) => !isSystemPreset(p.createdAt));
  return [...SYSTEM_DNA_PRESETS, ...user] as DnaPreset[];
}

export function mergeVibeVaultPresets(
  custom: Array<TrackVibe & { createdAt?: string }> | undefined,
  isPro: boolean
): Array<TrackVibe & { createdAt?: string }> {
  if (!isPro) return SYSTEM_VIBE_PRESETS;
  const user = (custom ?? []).filter((p) => !isSystemPreset(p.createdAt));
  return [...SYSTEM_VIBE_PRESETS, ...user];
}

export type StyleVaultPreset = (typeof SYSTEM_STYLE_PRESETS)[number];

export function mergeStyleVaultPresets(
  custom: StyleVaultPreset[] | undefined,
  isPro: boolean
): StyleVaultPreset[] {
  if (!isPro) return SYSTEM_STYLE_PRESETS;
  const user = (custom ?? []).filter((p) => !isSystemPreset(p.createdAt));
  return [...SYSTEM_STYLE_PRESETS, ...user];
}

export const SYSTEM_DNA_PRESETS = [
  {
    name: 'Midnight Concept',
    createdAt: 'system',
    sourceTrackTitle: 'Studio Preset',
    analysis: { themes: ['nocturnal', 'introspection'], emotionalTone: { primaryEmotion: 'melancholy' } },
    mapping: {
      enabled: true,
      setting_world: 'City after hours — neon, rain, empty streets',
      emotion_core: 'Restless hope beneath fatigue',
      trigger_moment: 'A text that never gets answered',
      message_truth: 'Growth costs what comfort used to give',
      tone_palette: 'Cinematic, sparse, honest',
    },
  },
  {
    name: 'Victory Lap',
    createdAt: 'system',
    sourceTrackTitle: 'Studio Preset',
    analysis: { themes: ['triumph', 'momentum'], emotionalTone: { primaryEmotion: 'confidence' } },
    mapping: {
      enabled: true,
      setting_world: 'Studio booth / arena tunnel',
      emotion_core: 'Earned swagger',
      trigger_moment: 'First crowd singing your hook back',
      message_truth: 'The grind was the price of the moment',
      tone_palette: 'Anthemic, punchy, declarative',
    },
  },
];

export const SYSTEM_VIBE_PRESETS = [
  {
    name: 'Neo-Classical Ethereal',
    createdAt: 'system',
    genre: 'Neo-Classical',
    tempoBPM: 80,
    feeling: ['meditative', 'uplifting', 'cinematic'],
    instrumentation:
      'Ethereal evolving synth pads, shimmering arpeggiated electric piano (Rhodes-like), delicate solo cello lines with extensive sustain, and deep, resonant sub-bass. Subtle organic textures and field recordings (distant forest ambiance). Production tone: Ultra-wide stereo imaging, pristine high-end clarity, warm analog saturation on lead synths, lush orchestral hall reverb with long decay (4–6s), nuanced multi-band compression for dynamic control across elements, airy atmospheric sweeps, and a gentle, unfolding soundscape. Emphasis on sonic breath and spaciousness, creating a meditative yet uplifting feel with clean transients and an expansive low-end foundation.',
  },
  {
    name: 'Dark Cinematic Trap',
    createdAt: 'system',
    genre: 'Cinematic Trap',
    tempoBPM: 74,
    feeling: ['ominous', 'hypnotic', 'nocturnal'],
    instrumentation:
      'Distorted 808 sub with controlled pitch slides, detuned bell plucks, granular vocal chops buried in the mix, and low-passed orchestral stabs (violas + French horns). Tape-saturated drum loops with tight sidechain pumping, vinyl crackle undercurrent, and reverse cymbal swells into each downbeat. Production tone: Mono-compatible low end, wide upper-mid stereo chorus on leads, dark plate reverb (1.8–2.4s) on melodic layers, parallel distortion on percussion bus, automated filter sweeps on hooks, and a claustrophobic-to-expansive dynamic arc — intimate verse pockets opening into wide, reverb-drenched hook sections with aggressive transient shaping on snares and rimshots.',
  },
];

export const SYSTEM_STYLE_PRESETS = [
  {
    name: 'Lyrical Architect',
    createdAt: 'system',
    analysis: 'Multisyllabic internal rhymes, concrete imagery, restrained adjectives, narrative pivots every 4 bars.',
    metrics: { vocabularyScore: 78, rhymeComplexity: 72, cadenceMap: 'Syncopated' },
  },
  {
    name: 'Hook-First Pop-Rap',
    createdAt: 'system',
    analysis: 'Short declarative lines, chantable hooks, conversational tone, emotional clarity over density.',
    metrics: { vocabularyScore: 55, rhymeComplexity: 48, cadenceMap: 'Straight' },
  },
];
