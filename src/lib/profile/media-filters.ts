/** Twenty wall photo / clip looks — CSS filter strings applied on canvas. */

export type MediaFilterId =
  | 'none'
  | 'fade'
  | 'mono'
  | 'contrast'
  | 'warm'
  | 'cool'
  | 'night'
  | 'glow'
  | 'film'
  | 'punch'
  | 'soft'
  | 'sepia'
  | 'invert'
  | 'vintage'
  | 'neon'
  | 'fog'
  | 'crisp'
  | 'polar'
  | 'noir'
  | 'bloom';

export type MediaFilterDef = {
  id: MediaFilterId;
  label: string;
  css: string;
};

export const MEDIA_FILTERS: readonly MediaFilterDef[] = [
  { id: 'none', label: 'None', css: 'none' },
  { id: 'fade', label: 'Fade', css: 'brightness(1.08) saturate(0.82) contrast(0.92)' },
  { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.08)' },
  { id: 'contrast', label: 'Contrast', css: 'contrast(1.28) saturate(1.1)' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.28) saturate(1.2) hue-rotate(-8deg)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.05) hue-rotate(18deg) brightness(1.04)' },
  { id: 'night', label: 'Night', css: 'brightness(0.78) contrast(1.2) saturate(0.7) hue-rotate(210deg)' },
  { id: 'glow', label: 'Glow', css: 'brightness(1.16) saturate(1.25) contrast(0.95)' },
  { id: 'film', label: 'Film', css: 'contrast(1.12) saturate(0.78) sepia(0.18)' },
  { id: 'punch', label: 'Punch', css: 'contrast(1.22) saturate(1.35) brightness(1.04)' },
  { id: 'soft', label: 'Soft', css: 'brightness(1.1) contrast(0.88) saturate(0.9)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(0.72) contrast(1.05)' },
  { id: 'invert', label: 'Invert', css: 'invert(1) hue-rotate(180deg)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.45) contrast(0.95) brightness(1.05) saturate(0.7)' },
  { id: 'neon', label: 'Neon', css: 'saturate(1.8) contrast(1.15) hue-rotate(300deg)' },
  { id: 'fog', label: 'Fog', css: 'brightness(1.12) contrast(0.8) saturate(0.55)' },
  { id: 'crisp', label: 'Crisp', css: 'contrast(1.18) saturate(1.08) brightness(1.02)' },
  { id: 'polar', label: 'Polar', css: 'grayscale(0.35) contrast(1.2) brightness(1.12) saturate(0.4)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.35) brightness(0.92)' },
  { id: 'bloom', label: 'Bloom', css: 'brightness(1.2) saturate(1.15) contrast(0.9)' },
] as const;

export function mediaFilterCss(id: string | undefined): string {
  return MEDIA_FILTERS.find((f) => f.id === id)?.css || 'none';
}

export type MediaAspectId = 'original' | 'square' | 'portrait' | 'story';

export const MEDIA_ASPECTS: readonly { id: MediaAspectId; label: string; ratio: number | null }[] = [
  { id: 'original', label: 'Free', ratio: null },
  { id: 'square', label: '1:1', ratio: 1 },
  { id: 'portrait', label: '4:5', ratio: 4 / 5 },
  { id: 'story', label: '9:16', ratio: 9 / 16 },
];
