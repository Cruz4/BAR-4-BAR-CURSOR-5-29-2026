/** Professional system strains available to free-tier artists (load-only). */

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
    name: 'Trap-Soul Midnight',
    createdAt: 'system',
    genre: 'Trap-Soul',
    tempoBPM: 82,
    feeling: ['moody', 'intimate'],
    instrumentation: '808 sub, muted keys, airy pads',
  },
  {
    name: 'Boom-Bap Classic',
    createdAt: 'system',
    genre: 'Boom-Bap',
    tempoBPM: 92,
    feeling: ['gritty', 'lyrical'],
    instrumentation: 'Dusty drums, sample chops, upright bass stabs',
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
