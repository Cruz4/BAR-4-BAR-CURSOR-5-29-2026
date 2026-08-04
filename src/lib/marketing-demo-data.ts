import type { Album, Track, WizardAnalysis } from '@/lib/types';
import demoJson from '../../public/demo-bar-4-bar-file.json';

const baseAlbums = demoJson as Album[];

const DEMO_VIBE = { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['demo'] };

/** Demo vault data for marketing capture scenes (no Firebase). */
export const MARKETING_DEMO_ALBUMS: Album[] = [
  ...baseAlbums,
  {
    id: 'album-midnight-swim-demo',
    ownerId: 'demo-user-id',
    title: 'MIDNIGHT SWIM',
    theme: 'Late-night clarity after the noise fades.',
    message: 'Sink or learn to float in your own depth.',
    thingsToSay: ['Neon on wet asphalt', 'Breath held underwater'],
    createdAt: '2026-04-02T12:00:00.000Z',
    coverArtUrl: 'https://picsum.photos/seed/midnight/800/800',
    direction: {
      enabled: true,
      setting_world: 'A rooftop pool overlooking a sleeping city.',
      emotion_core: 'Weightless surrender and sharp hindsight.',
      trigger_moment: 'The last friend left the party.',
      message_truth: 'Solitude is where the real verse starts.',
      tone_palette: 'Indigo, chlorine blue, and sodium vapor gold.',
    },
    tracks: [
      {
        id: 'track-midnight-01',
        albumId: 'album-midnight-swim-demo',
        ownerId: 'demo-user-id',
        title: 'CHLORINE HALO',
        status: 'in_progress',
        createdAt: '2026-04-02T12:00:00.000Z',
        vibe: DEMO_VIBE,
        intentRefs: [],
        sections: [],
      },
    ],
  },
  {
    id: 'album-mirror-demo',
    ownerId: 'demo-user-id',
    title: 'MIRROR',
    theme: 'Self-confrontation in fractured glass.',
    message: 'The version you perform is not the one that writes.',
    thingsToSay: ['Cracked reflection', 'Dressing room lights'],
    createdAt: '2026-03-15T12:00:00.000Z',
    coverArtUrl: 'https://picsum.photos/seed/mirror/800/800',
    direction: {
      enabled: true,
      setting_world: 'A backstage mirror before the encore.',
      emotion_core: 'Ruthless honesty under pressure.',
      trigger_moment: 'The crowd chant cuts through the door.',
      message_truth: 'Fame is loud; truth is quiet.',
      tone_palette: 'Silver, bruise purple, and stage-light white.',
    },
    tracks: [
      {
        id: 'track-mirror-01',
        albumId: 'album-mirror-demo',
        ownerId: 'demo-user-id',
        title: 'ENCORE ECHO',
        status: 'complete',
        createdAt: '2026-03-15T12:00:00.000Z',
        vibe: DEMO_VIBE,
        intentRefs: [],
        sections: [],
      },
      {
        id: 'track-mirror-02',
        albumId: 'album-mirror-demo',
        ownerId: 'demo-user-id',
        title: 'GLASS SCRIPT',
        status: 'in_progress',
        createdAt: '2026-03-16T12:00:00.000Z',
        vibe: DEMO_VIBE,
        intentRefs: [],
        sections: [],
      },
    ],
  },
];

export const MARKETING_PRIMARY_ALBUM = MARKETING_DEMO_ALBUMS[0];
export const MARKETING_PRIMARY_TRACK = MARKETING_PRIMARY_ALBUM.tracks?.[0] as Track;

/** Rich strain decode output — matches real Calibration Hub cards. */
export const MARKETING_WIZARD_ANALYSIS: WizardAnalysis = {
  themes: ['Coastal permanence', 'Organic resilience', 'Geological time'],
  motifs: ['Mist veil', 'Timber skin', 'Granite heart', 'Riverbed drought'],
  emotionalTone: {
    primaryEmotion: 'Stark reverence',
    secondaryEmotion: 'Cold peace',
    valence: 0.35,
    intensity: 0.72,
  },
  emotionalShift: 'Stillness fractures into a low hymn — the stone learns to sing.',
  narrativeArc: 'Witness → endurance → quiet transformation at the cliff edge.',
  structure: 'Verse-led with a widening bridge; end-weighted closure.',
  pov: 'First-person witness anchored in the monolith.',
  tense: 'Present with flash-memory intrusions',
  voiceStyle: 'Sparse imagery, concrete nouns, geological patience.',
  whatMakesItWork: 'Concrete nature metaphors carry emotional weight without preaching.',
  styleAnalysis: 'Monosyllabic anchors on bar ends; internal rhyme webs across couplets.',
  styleMetrics: {
    vocabularyScore: 78,
    rhymeComplexity: 64,
    cadenceMap: '4-4-5-4 swing',
  },
};

export const MARKETING_SEED_LYRICS =
  'The mist rolls in like a ghost from the shore\nMy skin is timber, my heart is solid stone\nI\'ve watched empires crumble while I stood alone\nThe riverbed is dry, the granite starts to sing';

export const MARKETING_VAULT_PRESETS = [
  { name: 'EARTHEN MONOLITH — Full DNA', source: 'STONE CIRCUIT' },
  { name: 'Coastal Stillness Strain', source: 'Rough notes extract' },
  { name: 'Timber / Stone Motif Pack', source: 'Motifs only' },
] as const;

export const MARKETING_REMIX_PATHS = [
  { label: 'Hope through erosion', influence: 62 },
  { label: 'Tension in the canopy', influence: 38 },
] as const;

/** Co-writer marketing — both rhyme with bar ending in "sing"; distinct end words (rings vs bring). */
export const MARKETING_CO_WRITER_OPTIONS = [
  {
    line: 'I feel the turning of the tide, the weight of a thousand rings',
    syllables: 13,
  },
  {
    line: 'What the granite won\'t confess, the slow roots learn to bring',
    syllables: 12,
  },
] as const;

export const MARKETING_CO_WRITER_SLOTTED_LINE = MARKETING_CO_WRITER_OPTIONS[0].line;

export const MARKETING_EMPTY_BAR_HINT = 'Next bar — hit Next for rhyme options';
