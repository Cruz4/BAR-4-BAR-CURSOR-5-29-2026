import { buildDnaPresetPayload } from '@/lib/dna-strands';
import type { DnaPreset, WizardAnalysis } from '@/lib/types';
import type { TrackVibe } from '@/lib/types';

function buildSystemDnaPreset(
  analysis: WizardAnalysis,
  options: {
    name: string;
    sourceTrackTitle?: string;
    structure?: Array<{ name: string; bars: number; enabled: boolean }>;
  }
): DnaPreset {
  const preset = buildDnaPresetPayload(analysis, {
    name: options.name,
    sourceTrackTitle: options.sourceTrackTitle ?? 'Studio Preset',
    hubStructure: options.structure,
  });
  return { ...preset, createdAt: 'system' };
}

/** Professional system strains available to free-tier artists (load-only). */

export function isSystemPreset(createdAt?: string | null): boolean {
  return createdAt === 'system';
}

/** Pro artists see studio presets plus their saved vault entries. */
export function mergeDnaVaultPresets(custom: DnaPreset[] | undefined, isPro: boolean): DnaPreset[] {
  if (!isPro) return SYSTEM_DNA_PRESETS;
  const user = (custom ?? []).filter((p) => !isSystemPreset(p.createdAt));
  return [...SYSTEM_DNA_PRESETS, ...user];
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

/** Full-fidelity studio presets — same shape as a saved DNA extraction vault profile. */
export const SYSTEM_DNA_PRESETS: DnaPreset[] = [
  buildSystemDnaPreset(
    {
      themes: ['nocturnal city', 'introspection', 'isolation', 'late-night clarity'],
      motifs: ['neon rain', 'empty streets', 'unread texts', 'last train', 'window glow'],
      emotionalTone: {
        primaryEmotion: 'Melancholy',
        secondaryEmotion: 'Restless hope',
        valence: 35,
        intensity: 52,
      },
      emotionalShift:
        'Fatigue and distance open the track; a single unanswered message sharpens the emotional turn.',
      narrativeArc:
        'After-hours drift → trigger moment of silence → resolve into honest growth over comfort.',
      structure: 'Sparse verse pockets into a wide, cinematic hook — dynamic opens on the chorus.',
      pov: 'First Person',
      tense: 'Present Tense',
      voiceStyle: 'Cinematic, sparse, confessional — concrete images, restrained adjectives.',
      whatMakesItWork:
        'City texture carries emotion; small details (rain, glow, silence) do the heavy lifting.',
      styleAnalysis:
        'Image-first lines, long vowel sounds, internal rhyme in pockets, hook widens the stereo field.',
      styleMetrics: {
        vocabularyScore: 68,
        rhymeComplexity: 61,
        cadenceMap: 'Cinematic Sparse',
      },
    },
    { name: 'Midnight Concept', sourceTrackTitle: 'Studio Preset' }
  ),
  buildSystemDnaPreset(
    {
      themes: ['triumph', 'momentum', 'earned confidence', 'crowd energy'],
      motifs: ['arena tunnel', 'hook sing-back', '808 knock', 'victory lap', 'studio booth'],
      emotionalTone: {
        primaryEmotion: 'Confidence',
        secondaryEmotion: 'Swagger',
        valence: 82,
        intensity: 74,
      },
      emotionalShift:
        'Tunnel tension builds → first crowd sing-back flips the record into full anthem mode.',
      narrativeArc:
        'Grind and proof → crowd validation turning point → declarative victory resolution.',
      structure: 'Hook-forward: chantable chorus every 8 bars with punchy declarative verses.',
      pov: 'First Person',
      tense: 'Present Tense',
      voiceStyle: 'Anthemic, punchy, declarative — short lines built for crowd repetition.',
      whatMakesItWork:
        'Earned swagger lands because verses show the grind before the hook releases it.',
      styleAnalysis:
        'Short declarative bars, chantable hooks, straight cadence, emotional clarity over density.',
      styleMetrics: {
        vocabularyScore: 55,
        rhymeComplexity: 48,
        cadenceMap: 'Straight',
      },
    },
    { name: 'Victory Lap', sourceTrackTitle: 'Studio Preset' }
  ),
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
