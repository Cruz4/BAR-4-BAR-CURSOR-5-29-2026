/** Server-safe scene registry for marketing screenshot capture. */

export type MarketingStillScene =
  | 'hero-workstation'
  | 'feature-dna-suite'
  | 'feature-vault'
  | 'feature-album-blueprint'
  | 'feature-guardrails'
  | 'feature-studio-progress'
  | 'how-step-dna'
  | 'how-step-workstation'
  | 'how-step-progress';

export type MarketingGifScene =
  | 'gif-dna-remix'
  | 'gif-strain-vault'
  | 'gif-co-writer-next-line'
  | 'gif-rhyme-pulse';

export type MarketingCaptureScene = MarketingStillScene | MarketingGifScene;

export const MARKETING_STILL_SCENES: MarketingStillScene[] = [
  'hero-workstation',
  'feature-dna-suite',
  'feature-vault',
  'feature-album-blueprint',
  'feature-guardrails',
  'feature-studio-progress',
  'how-step-dna',
  'how-step-workstation',
  'how-step-progress',
];

export const MARKETING_GIF_SCENES: MarketingGifScene[] = [
  'gif-dna-remix',
  'gif-strain-vault',
  'gif-co-writer-next-line',
  'gif-rhyme-pulse',
];

export const MARKETING_CAPTURE_SCENES: MarketingCaptureScene[] = [
  ...MARKETING_STILL_SCENES,
  ...MARKETING_GIF_SCENES,
];

export function isMarketingCaptureScene(value: string): value is MarketingCaptureScene {
  return (MARKETING_CAPTURE_SCENES as string[]).includes(value);
}

export function isMarketingGifScene(value: string): value is MarketingGifScene {
  return (MARKETING_GIF_SCENES as string[]).includes(value);
}
