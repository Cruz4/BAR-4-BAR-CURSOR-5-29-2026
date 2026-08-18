/** Landing page feature bands — copy + asset paths. */

import { firstDropsFeeCashoutLine, firstDropsPitch } from '@/lib/drop-commerce';

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

/**
 * Story order: presence first (Scene / Artist Home), then craft tools that
 * give the scene teeth (DNA, bars, vault).
 */
export const MARKETING_FEATURE_BANDS: MarketingFeatureBand[] = [
  {
    id: 'artist-home',
    eyebrow: 'Artist Home & The Scene',
    title: 'Your Page. Your Block.',
    description:
      'Sign in and land on The Scene — friends\u2019 drops, a Discover stream of live Artist Homes, and Your Booth. Every artist gets a public home, completely free: living skin, Album Rooms, embeds, live DNA Drops. Write in the vault. Show up on the block.',
    bullets: [
      'Artist Home is free — claim it, skin it, go live. No Pro required for the page.',
      'The Scene home — friends feed + Discover, never an empty room',
      'Public /profile link you control — private by default until you go live',
    ],
    mediaSrc: '/marketing/feature-artist-home.png',
    mediaType: 'image',
    mediaAlt: 'Bar 4 Bar Artist Home — shareable public artist page',
    layout: 'hero-stack',
    mediaVariant: 'hero-full',
  },
  {
    id: 'first-drops',
    eyebrow: 'First Drops',
    title: 'Sell The Song.',
    description: firstDropsPitch(),
    bullets: [
      'Press a song from The Scene — upload, price, live. You keep the rights. DNA Drop stays lyrics-only',
      'Fixed price or pay-what-you-want, floor $1.00',
      `Buy once, stream in-app. Library lives on The Scene. ${firstDropsFeeCashoutLine()}`,
    ],
    mediaSrc: '/marketing/feature-artist-home-live.jpg',
    mediaType: 'image',
    mediaAlt: 'Bar 4 Bar First Drop — sell and stream your song on the public page',
    layout: 'split',
    mediaVariant: 'showcase',
  },
  {
    id: 'cowriter',
    eyebrow: 'Bar Workstation',
    title: 'Next Bar. Two Ways.',
    description:
      'The studio under the booth. Tap a bar, hit Next — two rhyme-aware options land in seconds. Pick one. It slots into your sheet. No paragraph soup.',
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
    id: 'strain-lab',
    eyebrow: 'DNA & Remix',
    title: 'Decode. Save. Remix.',
    description:
      'Paste rough notes and get the real Calibration Hub — themed strain cards, inject buttons, remix paths with influence sliders, then a studio draft that respects your DNA. That\u2019s what you drop back onto the Scene.',
    bullets: [
      'Themes, motifs, shift, emotion, and style cards — not a summary blob',
      '⚡ inject any strain into Creative DNA, Intents, or Style',
      'Pick remix paths, blend influence, synthesize a draft',
    ],
    mediaSrc: '/marketing/gif-dna-remix.gif',
    mediaType: 'gif',
    mediaAlt: 'DNA and Remix workstation decoding strains and synthesizing a draft',
    layout: 'split-reverse',
    mediaVariant: 'showcase',
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
    layout: 'split',
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
      'Ordered tracklists, shared Album DNA, one-click DNA Drops — build albums, not one-off prompts. Live drops show on your Artist Home automatically.',
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
    title: 'Claim Your Booth',
    body: 'Free Artist Home — always. Private until you go live. Land on The Scene with friends and Discover.',
    media: '/marketing/feature-artist-home.png',
  },
  {
    step: '02',
    title: 'Write Bar by Bar',
    body: 'Open The Vault — Next, two options, guardrails, DNA that remembers your album.',
    media: '/marketing/how-step-workstation.png',
  },
  {
    step: '03',
    title: 'Show Up on the Scene',
    body: 'Post to your wall, drop DNA, sell a First Drop, visit Artist Homes, build your block.',
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
    ['No artist presence', 'The Scene home + shareable Artist Home (free) + friends on The Block'],
    [
      'Nowhere to sell the actual song',
      `First Drops — set a price, fans buy once. ${firstDropsFeeCashoutLine()}`,
    ],
  ],
};
