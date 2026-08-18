/**
 * Styled lyric range posted from the sheet to The Block / Artist Home wall.
 */

export const LYRIC_CLIP_MAX_LINES = 24;
export const LYRIC_CLIP_LINE_MAX = 180;

export const LYRIC_CLIP_BGS = ['ink', 'paper', 'night', 'alive', 'neon', 'dusk'] as const;
export const LYRIC_CLIP_TEXTS = ['white', 'gold', 'cyan', 'ink', 'hand'] as const;

export type LyricClipBg = (typeof LYRIC_CLIP_BGS)[number];
export type LyricClipText = (typeof LYRIC_CLIP_TEXTS)[number];

export type LyricClip = {
  from: number;
  to: number;
  title?: string;
  section?: string;
  lines: string[];
  bg: LyricClipBg;
  text: LyricClipText;
};

type SheetBar = { idx?: number; text?: string };
type SheetSection = { type?: string; bars?: SheetBar[] };

function asBg(value: unknown): LyricClipBg {
  return LYRIC_CLIP_BGS.includes(value as LyricClipBg) ? (value as LyricClipBg) : 'ink';
}

function asText(value: unknown): LyricClipText {
  return LYRIC_CLIP_TEXTS.includes(value as LyricClipText) ? (value as LyricClipText) : 'white';
}

export function parseLyricClip(raw: unknown): LyricClip | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const lines = Array.isArray(o.lines)
    ? o.lines
        .filter((line): line is string => typeof line === 'string')
        .map((line) => line.slice(0, LYRIC_CLIP_LINE_MAX))
        .slice(0, LYRIC_CLIP_MAX_LINES)
    : [];
  if (lines.length === 0) return undefined;
  const from = Math.max(1, Math.floor(Number(o.from) || 1));
  const to = Math.max(from, Math.floor(Number(o.to) || from));
  return {
    from,
    to,
    lines,
    bg: asBg(o.bg),
    text: asText(o.text),
    ...(typeof o.title === 'string' && o.title.trim() ? { title: o.title.trim().slice(0, 80) } : {}),
    ...(typeof o.section === 'string' && o.section.trim()
      ? { section: o.section.trim().slice(0, 24) }
      : {}),
  };
}

export function lyricClipCaption(clip: LyricClip): string {
  const a = String(clip.from).padStart(2, '0');
  const b = String(clip.to).padStart(2, '0');
  const range = a === b ? `Line ${a}` : `Lines ${a}–${b}`;
  const section = clip.section ? `${clip.section} · ${range}` : range;
  const body = clip.lines.join('\n').trim();
  return body ? `${section}\n${body}` : section;
}

export function collectSectionLines(
  section: SheetSection | undefined,
  from: number,
  to: number
): {
  from: number;
  to: number;
  lines: string[];
  numbered: { idx: number; text: string }[];
  truncated: boolean;
} {
  const bars = [...(section?.bars || [])].sort(
    (a, b) => (Number(a.idx) || 0) - (Number(b.idx) || 0)
  );
  const start = Math.max(1, Math.floor(Math.min(from, to)) || 1);
  const end = Math.max(start, Math.floor(Math.max(from, to)) || start);
  const inRange = bars.filter((bar) => {
    const idx = Number(bar.idx) || 0;
    return idx >= start && idx <= end;
  });
  const numbered = inRange.slice(0, LYRIC_CLIP_MAX_LINES).map((bar) => ({
    idx: Number(bar.idx) || 0,
    text: String(bar.text || '').slice(0, LYRIC_CLIP_LINE_MAX),
  }));
  return {
    from: numbered[0]?.idx || start,
    to: numbered[numbered.length - 1]?.idx || end,
    lines: numbered.map((row) => row.text),
    numbered,
    truncated: inRange.length > LYRIC_CLIP_MAX_LINES,
  };
}

export function sectionLineBounds(section: SheetSection | undefined): { min: number; max: number } {
  const idxs = (section?.bars || [])
    .map((bar) => Number(bar.idx) || 0)
    .filter((idx) => idx > 0);
  if (idxs.length === 0) return { min: 1, max: 1 };
  return { min: Math.min(...idxs), max: Math.max(...idxs) };
}
