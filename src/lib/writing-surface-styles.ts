import type { CSSProperties } from 'react';
import { resolveWritingSurface, type WritingSurfaceMode } from '@/lib/studio-theme';

type NotebookStyleArgs = {
  writingMode: WritingSurfaceMode;
  colorTheme: 'light' | 'dark' | undefined;
  lineHeightPx: number;
  gutterPx?: number;
};

/** Lyrics notebook background — paper (B) or elevated studio panel. */
export function buildLyricsNotebookStyle({
  writingMode,
  colorTheme,
  lineHeightPx,
  gutterPx = 100,
}: NotebookStyleArgs): CSSProperties {
  const surface = resolveWritingSurface(writingMode, colorTheme);
  const lh = `${lineHeightPx}px`;
  // Prefer CSS --lyrics-gutter so mobile can shrink the margin without fighting inline px.
  const gutter = `var(--lyrics-gutter, ${gutterPx}px)`;

  if (surface === 'paper') {
    return {
      backgroundColor: 'hsl(45 33% 96%)',
      color: 'hsl(220 28% 14%)',
      backgroundImage: `
        linear-gradient(90deg, transparent ${gutter}, hsl(0 62% 52% / 0.35) ${gutter}, hsl(0 62% 52% / 0.35) calc(${gutter} + 1px), transparent calc(${gutter} + 1px)),
        repeating-linear-gradient(transparent, transparent ${lineHeightPx - 1}px, hsl(220 18% 78%) ${lineHeightPx - 1}px, hsl(220 18% 78%) ${lh})
      `,
      backgroundSize: `100% ${lh}`,
      backgroundAttachment: 'local',
    };
  }

  const lineAlpha = colorTheme === 'light' ? 0.14 : 0.16;
  const marginAlpha = colorTheme === 'light' ? 0.45 : 0.28;

  return {
    backgroundColor: colorTheme === 'light' ? 'hsl(220 22% 98%)' : 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    backgroundImage: `
      linear-gradient(90deg, transparent ${gutter}, hsl(0 62% 52% / ${marginAlpha}) ${gutter}, hsl(0 62% 52% / ${marginAlpha}) calc(${gutter} + 1px), transparent calc(${gutter} + 1px)),
      repeating-linear-gradient(transparent, transparent ${lineHeightPx - 1}px, hsl(220 15% 50% / ${lineAlpha}) ${lineHeightPx - 1}px, hsl(220 15% 50% / ${lineAlpha}) ${lh})
    `,
    backgroundSize: `100% ${lh}`,
    backgroundAttachment: 'local',
  };
}

export function lyricsSurfaceClassName(
  writingMode: WritingSurfaceMode,
  colorTheme: 'light' | 'dark' | undefined
): string {
  const surface = resolveWritingSurface(writingMode, colorTheme);
  return surface === 'paper' ? 'writing-surface-paper' : 'writing-surface-studio';
}
