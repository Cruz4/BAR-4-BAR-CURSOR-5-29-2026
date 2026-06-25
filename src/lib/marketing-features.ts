/** Landing page feature bands — copy + asset paths. */

export type MarketingMediaType = 'image' | 'gif';

export type ShowcaseLayout = 'hero-stack' | 'split' | 'split-reverse' | 'bento';

export type MarketingMediaVariant = 'hero-full' | 'showcase' | 'feature' | 'bento';

export type MarketingFeatureBand = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  mediaSrc: string;
  mediaType: MarketingMediaType;
  mediaAlt: string;
  layout: ShowcaseLayout;
  mediaVariant?: MarketingMediaVariant;
  bentoGroup?: string;
};

export const STRAIN_PIPELINE_STEPS = [
  { step: '01', label: 'Paste', detail: 'Rough notes or seed lyrics' },
  { step: '02', label: 'Decode', detail: 'Themes, motifs, emotion, style' },
  { step: '03', label: 'Save', detail: 'Vault presets off the rip' },
  { step: '04', label: 'Mix', detail: 'Match strains field by field' },
  { step: '05', label: 'Draft', detail: 'Remix paths → studio draft' },
] as const;

export const MARKETING_FEATURE_BANDS: MarketingFeatureBand[] = [
  {
    id: 'strain-lab',
    eyebrow: 'DNA & Remix',
    title: 'Decode. Save. Remix.',
    description:
      'Paste rough notes and get the real Calibration Hub — themed strain cards, inject buttons, remix paths with influence sliders, then a studio draft that respects your DNA.',
    bullets: [
      'Themes, motifs, shift, emotion, and style cards — not a summary blob',
      '⚡ inject any strain into Creative DNA, Intents, or Style',
      'Pick remix paths, blend influence, synthesize a draft',
    ],
    mediaSrc: '/marketing/gif-dna-remix.gif',
    mediaType: 'gif',
    mediaAlt: 'DNA and Remix workstation decoding strains and synthesizing a draft',
    layout: 'hero-stack',
    mediaVariant: 'hero-full',
  },
  {
    id: 'strain-vault',
    eyebrow: 'Strain Library',
    title: 'Vault & Mixer',
    description:
      'Save extractions from any track. Load full profiles or cherry-pick individual strains on the Album DNA Mixer — mix and match without overwriting your whole world.',
    bullets: [
      'Save DNA from a track in one click (Pro)',
      'Vault presets travel album to album',
      'DNA Mixer: load Setting, Emotion, or Motif strains independently',
    ],
    mediaSrc: '/marketing/gif-strain-vault.gif',
    mediaType: 'gif',
    mediaAlt: 'DNA Vault save, load, and strain mixer workflow',
    layout: 'split-reverse',
    mediaVariant: 'showcase',
  },
  {
    id: 'cowriter',
    eyebrow: 'Bar Workstation',
    title: 'Next Bar. Two Ways.',
    description:
      'Tap a bar, hit Next — two rhyme-aware options land in seconds. Pick one. It slots into your sheet. No paragraph soup.',
    bullets: [
      'Footer co-writer lives on the lyrics sheet',
      'Opt 1 & Opt 2 with syllable counts',
      'Accept a line — structure stays intact',
    ],
    mediaSrc: '/marketing/hero-workstation.png',
    mediaType: 'image',
    mediaAlt: 'Bar Workstation showing two full next-line options',
    layout: 'split',
    mediaVariant: 'showcase',
  },
  {
    id: 'rhyme-pulse',
    eyebrow: 'Rhyme Pulse',
    title: 'See the Scheme',
    description:
      'One tap on the lyrics toolbar. Phonetic scan. Color-coded rhyme groups across verses, hooks, and bridges.',
    bullets: [
      'Round button right on the sheet you write on',
      'Ink cost shown before you scan',
      'Groups light up — no guessing the scheme',
    ],
    mediaSrc: '/marketing/gif-rhyme-pulse.gif',
    mediaType: 'gif',
    mediaAlt: 'Rhyme Pulse highlighting rhyme groups on the lyrics sheet',
    layout: 'split-reverse',
    mediaVariant: 'showcase',
  },
  {
    id: 'vault',
    eyebrow: 'The Vault',
    title: 'Every Bar Has a Home',
    description:
      'Your rhyme book in the cloud — bars, poems, loose lines, half-finished hooks. Jot it down now, load it up later when you are ready to digest and write.',
    bullets: [
      'Store verses, poems, and scratch ideas in one vault',
      'Search every bar you have ever written',
      'Import & export — your studio travels with you',
    ],
    mediaSrc: '/marketing/feature-vault.png',
    mediaType: 'image',
    mediaAlt: 'Bar 4 Bar vault with vinyl album grid',
    layout: 'bento',
    mediaVariant: 'bento',
    bentoGroup: 'studio',
  },
  {
    id: 'album',
    eyebrow: 'Album Blueprint',
    title: 'Concept Arcs',
    description:
      'Ordered tracklists, shared Album DNA, one-click DNA Drops — build albums, not one-off prompts.',
    bullets: ['Drag-order tracklist', 'DNA inherits per track', 'DNA Drop for collab'],
    mediaSrc: '/marketing/feature-album-blueprint.png',
    mediaType: 'image',
    mediaAlt: 'Album blueprint with tracklist and Album DNA panel',
    layout: 'bento',
    mediaVariant: 'bento',
    bentoGroup: 'studio',
  },
];

/** @deprecated Section removed from landing; kept for optional HowItWorksSection component. */
export const MARKETING_MEDIA_ASPECT = 1000 / 720;

export const MARKETING_HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Set the World',
    body: 'Five DNA questions — setting, emotion, trigger, truth, tone.',
    media: '/marketing/how-step-dna.png',
  },
  {
    step: '02',
    title: 'Write Bar by Bar',
    body: 'Bar Workstation at the footer — Next, two options, guardrails on.',
    media: '/marketing/how-step-workstation.png',
  },
  {
    step: '03',
    title: 'Run It Back',
    body: 'Performance Mode, DNA Drops, Studio Progress.',
    media: '/marketing/how-step-progress.png',
  },
] as const;

export const MARKETING_COMPARISON = {
  otherLabel: 'Other AI tools',
  b4bLabel: 'Bar 4 Bar',
  rows: [
    ['Prompt, generate, forget', 'Structure, memory, intent, generation'],
    ['No album context', 'Album DNA on every bar'],
    ['Generic filler lines', 'Guardrails + must-includes'],
    ['Paragraphs and prose', 'Bars, hooks, and rhyme schemes'],
  ],
};
