/** Landing page feature bands — copy + asset paths. */

export type MarketingMediaType = 'image' | 'gif';

export type MarketingFeatureBand = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  mediaSrc: string;
  mediaType: MarketingMediaType;
  mediaAlt: string;
  reverse?: boolean;
};

export const MARKETING_FEATURE_BANDS: MarketingFeatureBand[] = [
  {
    id: 'vault',
    eyebrow: 'The Vault',
    title: 'Every Bar Has a Home',
    description:
      'Your whole studio in one place — concept albums, loose tracks, and midnight drafts. Search anything. Export everything.',
    bullets: [
      'Vinyl-style albums + cassette loose tracks',
      'Vault-wide lyric search in seconds',
      'Import & export full studio blueprints',
    ],
    mediaSrc: '/marketing/feature-vault.png',
    mediaType: 'image',
    mediaAlt: 'Bar 4 Bar vault with vinyl album grid',
  },
  {
    id: 'dna',
    eyebrow: 'Creative DNA',
    title: 'Lock the World. Free the Bars.',
    description:
      'Five direction questions set the scene before a single line drops — so the AI stays in your universe, not generic chatbot land.',
    bullets: [
      'World, emotion, trigger, truth, and tone per project',
      'Inherit album DNA or override per track',
      'Save strains to your DNA vault (Pro)',
    ],
    mediaSrc: '/marketing/feature-dna-suite.png',
    mediaType: 'image',
    mediaAlt: 'DNA Suite with Five Creative Direction Questions',
    reverse: true,
  },
  {
    id: 'dna-remix',
    eyebrow: 'DNA & REMIX',
    title: 'Rough Notes → Decoded Strains → Draft',
    description:
      'Paste rough notes. Strains decode beside your text. Pick a remix path. Push into new lanes — wider range, same DNA backbone.',
    bullets: [
      'Rough notes in → motifs mapped live',
      'Strains decoded, not summarized away',
      'Path → synthesize → draft ready to stretch your reach',
    ],
    mediaSrc: '/marketing/gif-dna-remix.gif',
    mediaType: 'gif',
    mediaAlt: 'DNA and REMIX generation workstation workflow',
  },
  {
    id: 'cowriter',
    eyebrow: 'Bar Workstation',
    title: 'Next Line. Two Options. Your Call.',
    description:
      'Tap a bar, hit Next — two rhyme-aware options land in seconds. Pick one. It slots into your sheet. No paragraph soup.',
    bullets: [
      'Footer co-writer lives on the lyrics sheet',
      'Opt 1 & Opt 2 with syllable counts',
      'Accept a line — structure stays intact',
    ],
    mediaSrc: '/marketing/gif-co-writer-next-line.gif',
    mediaType: 'gif',
    mediaAlt: 'Bar Workstation showing two next-line options',
    reverse: true,
  },
  {
    id: 'album',
    eyebrow: 'Album Blueprint',
    title: 'Concept Albums, Not One-Off Vibes',
    description:
      'Ordered tracklists. Shared Album DNA. DNA Drops for collab. Build the arc — not just the single.',
    bullets: [
      'Drag-order tracklist with live per-song status',
      'Album DNA inherits to every track automatically',
      'One-click DNA Drop when you need outside ears',
    ],
    mediaSrc: '/marketing/feature-album-blueprint.png',
    mediaType: 'image',
    mediaAlt: 'Album blueprint with tracklist and Album DNA panel',
  },
  {
    id: 'rhyme-pulse',
    eyebrow: 'Rhyme Pulse',
    title: 'Rhyme Schemes You Can See',
    description:
      'One tap on the lyrics toolbar. Phonetic scan. Color-coded rhyme groups across verses, hooks, and bridges.',
    bullets: [
      'Round button right on the sheet you write on',
      'Ink cost shown before you scan',
      'Groups light up — no guessing the scheme',
    ],
    mediaSrc: '/marketing/gif-rhyme-pulse.gif',
    mediaType: 'gif',
    mediaAlt: 'Rhyme Pulse button highlighting rhyme groups on the lyrics sheet',
    reverse: true,
  },
];

export const MARKETING_HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Set the World',
    body: 'Five DNA questions — setting, emotion, trigger, truth, tone. Your album\'s rules before bar one.',
    media: '/marketing/how-step-dna.png',
  },
  {
    step: '02',
    title: 'Write Bar by Bar',
    body: 'Bar Workstation at the footer — Next, two options, guardrails on. A rhyme book, not a chat box.',
    media: '/marketing/how-step-workstation.png',
  },
  {
    step: '03',
    title: 'Run It Back',
    body: 'Performance Mode to rehearse, DNA Drops to share, Studio Progress to keep the habit alive.',
    media: '/marketing/how-step-progress.png',
  },
];

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
