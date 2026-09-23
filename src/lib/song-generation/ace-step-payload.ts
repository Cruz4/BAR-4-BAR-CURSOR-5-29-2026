import type { CompiledRenderRecipe } from '@/lib/song-generation/types';

const SECTION_MAP: Record<string, string> = {
  intro: 'verse',
  verse: 'verse',
  hook: 'chorus',
  chorus: 'chorus',
  pre: 'verse',
  'pre-chorus': 'verse',
  bridge: 'bridge',
  outro: 'verse',
};

/** ACE-Step structure tags: [verse] [chorus] [bridge]. */
export function toAceLyrics(lyricsText: string, workKind: CompiledRenderRecipe['workKind']): string {
  if (workKind === 'instrumental') return '[inst]';
  const mapped = lyricsText
    .replace(/\[([^\]]+)\]/g, (_, raw: string) => {
      const key = String(raw).trim().toLowerCase().replace(/\s+/g, '-');
      const mappedTag = SECTION_MAP[key] || (key.includes('hook') ? 'chorus' : 'verse');
      return `[${mappedTag}]`;
    })
    .trim();
  return mapped || '[verse]\n';
}

export function toAceTags(recipe: CompiledRenderRecipe): string {
  const bits = recipe.caption
    .replace(/\n+/g, ', ')
    .replace(/[_:]+/g, ' ')
    .split(/[,.]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 48);
  const extras: string[] = [];
  if (recipe.bpm) extras.push(`${Math.round(recipe.bpm)} bpm`);
  extras.push('full song', 'studio mix', 'lead vocal');
  const joined = [...bits.slice(0, 12), ...extras].join(', ');
  return joined.slice(0, 280) || 'contemporary, studio, vocal song';
}

export function toAceDurationSec(recipe: CompiledRenderRecipe): number {
  const raw = recipe.durationSec || 240;
  const fullSong = recipe.workKind === 'instrumental' ? raw : Math.max(raw, 180);
  return Math.max(5, Math.min(240, fullSong));
}
