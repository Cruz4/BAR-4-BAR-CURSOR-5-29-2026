/** Per-band chromatic copy themes — mirrors Calibration Hub / vault / workstation colors. */

export type MarketingBandTheme = {
  panel: string;
  rule: string;
  eyebrow: string;
  titleParts: string[];
  titlePartColors: string[];
  description: string;
  bulletNums: string[];
  bulletText: string[];
  bulletRails: string[];
};

export const MARKETING_BAND_THEMES: Record<string, MarketingBandTheme> = {
  vault: {
    panel: 'border-amber-500/25 bg-gradient-to-br from-amber-500/[0.09] via-black/20 to-orange-600/[0.05]',
    rule: 'from-amber-400',
    eyebrow: 'text-amber-300 border-amber-500/35 bg-amber-500/10',
    titleParts: ['Every Bar', 'Has a Home'],
    titlePartColors: ['text-amber-100', 'text-orange-400'],
    description: 'text-amber-100/85',
    bulletNums: ['text-amber-400', 'text-orange-400', 'text-amber-300'],
    bulletText: ['text-amber-50/90', 'text-amber-50/90', 'text-amber-50/90'],
    bulletRails: ['border-l-amber-500/60', 'border-l-orange-500/50', 'border-l-amber-400/40'],
  },
  album: {
    panel: 'border-sky-500/25 bg-gradient-to-br from-sky-500/[0.08] via-black/20 to-primary/[0.06]',
    rule: 'from-sky-400',
    eyebrow: 'text-sky-300 border-sky-500/35 bg-sky-500/10',
    titleParts: ['Concept', 'Arcs'],
    titlePartColors: ['text-sky-100', 'text-sky-400'],
    description: 'text-sky-100/85',
    bulletNums: ['text-sky-400', 'text-primary', 'text-sky-300'],
    bulletText: ['text-sky-50/90', 'text-primary/90', 'text-sky-100/80'],
    bulletRails: ['border-l-sky-500/60', 'border-l-primary/50', 'border-l-sky-400/40'],
  },
  'strain-lab': {
    panel: 'border-violet-500/30 bg-gradient-to-br from-violet-500/[0.12] via-fuchsia-500/[0.04] to-emerald-500/[0.08]',
    rule: 'from-violet-400',
    eyebrow: 'text-violet-200 border-violet-400/40 bg-violet-500/15',
    titleParts: ['Decode.', 'Save.', 'Remix.'],
    titlePartColors: [
      'text-violet-200',
      'text-emerald-200',
      'text-sky-400',
    ],
    description: 'text-violet-100/90',
    bulletNums: ['text-violet-400', 'text-emerald-400', 'text-sky-400'],
    bulletText: ['text-violet-100/95', 'text-emerald-100/90', 'text-sky-100/90'],
    bulletRails: ['border-l-violet-500/70', 'border-l-emerald-500/60', 'border-l-sky-500/55'],
  },
  'strain-vault': {
    panel: 'border-emerald-500/28 bg-gradient-to-br from-emerald-500/[0.1] via-black/20 to-green-600/[0.06]',
    rule: 'from-emerald-400',
    eyebrow: 'text-emerald-300 border-emerald-500/35 bg-emerald-500/10',
    titleParts: ['Vault', '& Mixer'],
    titlePartColors: ['text-emerald-100', 'text-green-400'],
    description: 'text-emerald-100/88',
    bulletNums: ['text-emerald-400', 'text-green-400', 'text-emerald-300'],
    bulletText: ['text-emerald-50/92', 'text-green-100/88', 'text-emerald-100/85'],
    bulletRails: ['border-l-emerald-500/65', 'border-l-green-500/55', 'border-l-emerald-400/45'],
  },
  cowriter: {
    panel: 'border-primary/30 bg-gradient-to-br from-primary/[0.12] via-black/20 to-sky-500/[0.06]',
    rule: 'from-primary',
    eyebrow: 'text-primary border-primary/40 bg-primary/10',
    titleParts: ['Next Bar.', 'Two Ways.'],
    titlePartColors: ['text-primary', 'text-sky-400'],
    description: 'text-sky-100/88',
    bulletNums: ['text-primary', 'text-sky-400', 'text-primary/80'],
    bulletText: ['text-sky-50/92', 'text-primary/90', 'text-sky-100/88'],
    bulletRails: ['border-l-primary/65', 'border-l-sky-500/55', 'border-l-primary/45'],
  },
  'rhyme-pulse': {
    panel: 'border-orange-500/28 bg-gradient-to-br from-orange-500/[0.1] via-black/20 to-primary/[0.06]',
    rule: 'from-orange-400',
    eyebrow: 'text-orange-300 border-orange-500/35 bg-orange-500/10',
    titleParts: ['See the', 'Scheme'],
    titlePartColors: ['text-orange-100', 'text-orange-400'],
    description: 'text-orange-100/85',
    bulletNums: ['text-orange-400', 'text-primary', 'text-orange-300'],
    bulletText: ['text-orange-50/90', 'text-orange-50/90', 'text-orange-50/90'],
    bulletRails: ['border-l-orange-500/60', 'border-l-primary/50', 'border-l-orange-400/45'],
  },
};
