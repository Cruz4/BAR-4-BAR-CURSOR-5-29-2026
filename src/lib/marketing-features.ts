/** Landing page feature bands — copy + asset paths. */

import {
  centsToUsdLabel,
  DROP_PAID_MIN_CENTS,
  firstDropsFeeCashoutLine,
} from '@/lib/drop-commerce';

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
  /** Keep the feature copy while omitting repeated media from the Welcome sequence. */
  showMedia?: boolean;
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
    eyebrow: 'Public Music Home & The Scene',
    title: 'Your Page. Your Block.',
    description:
      'Create a free public music home and join The Scene as an artist, creator, or Music Fan. Find friends and music that match your taste, with clear reasons behind every recommendation.',
    bullets: [
      'Your page starts private. Go live only when you are ready, with your labels, genres, moods, influences, region, and collaboration status',
      'Feature an owned or purchased track: visitors hear your chosen 30 seconds, then buy or stream by entitlement',
      'Follow, Inner Circle, and Friends stay distinct so support does not automatically open collaboration or Msgs',
    ],
    mediaSrc: '/AKA_artist_home_promo_poster.png',
    mediaType: 'image',
    mediaAlt: 'AKAsheet Artist Home — shareable public artist page',
    layout: 'hero-stack',
    mediaVariant: 'hero-full',
  },
  {
    id: 'first-drops',
    eyebrow: 'Music Releases',
    title: 'Sell The Song.',
    description:
      'Start from The Scene, upload a finished recording, choose a fixed or pay-what-you-want price, select the public 30-second preview, and publish the release. Fans buy once and stream it in AKAsheet.',
    bullets: [
      'Listen / buy appears on your Artist Home, The Scene, and the song share link',
      `Fixed price or pay-what-you-want starts at ${centsToUsdLabel(DROP_PAID_MIN_CENTS)}. DNA Drop remains your lyric-preview card; finished-song sales happen through Releases`,
      'You keep every right to your music. We keep 25% below $3, 15% from $3–$4.99, and 10% from $5 up',
      'Connect payouts in Earnings so Stripe can send the rest to your bank',
    ],
    mediaSrc: '/marketing/feature-artist-home-live.jpg',
    mediaType: 'image',
    mediaAlt: 'AKAsheet music release—sell and stream your song on the public page',
    layout: 'hero-stack',
    mediaVariant: 'showcase',
    showMedia: false,
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
    mediaSrc: '/marketing/gif-co-writer-next-line.gif',
    mediaType: 'gif',
    mediaAlt: 'Bar Workstation showing two full next-line options',
    layout: 'split',
    mediaVariant: 'showcase',
  },
  {
    id: 'collab-sheet',
    eyebrow: 'Collab Sheet',
    title: 'Write Together. Live.',
    description:
      'Studio Pro opens a live editable sheet on any track — invite friends, see who\u2019s on the page (2/13 live), chat in a bottom drawer, and watch bars sync in real time. DNA Drop is a snapshot; Collab Sheet is the same room.',
    bullets: [
      'Pro to share as owner — collaborators edit with their account',
      'Presence chip + in-sheet chat — no pop-ups or extra windows',
      'Vault section + album badge when a sheet is open',
    ],
    mediaSrc: '/marketing/how-step-workstation.png',
    mediaType: 'image',
    mediaAlt: 'AKAsheet Collab Sheet — live shared lyric editing on the workstation',
    layout: 'hero-stack',
    mediaVariant: 'showcase',
    showMedia: false,
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
      'Versioned import & export—preview first, merge safely, never overwrite current projects',
    ],
    mediaSrc: '/marketing/feature-vault.png',
    mediaType: 'image',
    mediaAlt: 'AKAsheet vault with vinyl album grid',
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
    bullets: ['Drag-order tracklist', 'DNA inherits per track', 'DNA Drop snapshots · Collab Sheet live editing'],
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
    body: 'Free public music home—Artist, creator, or Music Fan. Private until you go live. Add your Sound Identity and land on The Scene.',
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
    body: 'Post to your wall, publish DNA, sell a release, feature a Library track, discover matches, and build your Support Circle.',
    media: '/marketing/how-step-progress.png',
  },
] as const;

export const MARKETING_COMPARISON = {
  otherLabel: 'Other AI tools',
  b4bLabel: 'AKAsheet',
  rows: [
    ['Prompt, generate, forget', 'Structure, memory, intent, generation'],
    ['No album context', 'Album DNA on every bar'],
    ['Generic filler lines', 'Guardrails + must-includes'],
    ['Paragraphs and prose', 'Bars, hooks, and rhyme schemes'],
    ['No music identity or listener home', 'The Scene + free public home for artists, creators, and Music Fans'],
    ['Black-box popularity feeds', 'Explainable Discover + transparent Emerging signals—no pay-to-rank'],
    [
      'Nowhere to sell the actual song',
      `Releases—set a price, fans buy once. ${firstDropsFeeCashoutLine()}`,
    ],
  ],
};
