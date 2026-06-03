import type { Album, Track } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Match Co-Writer panel switch UI — undefined toggles default ON where switches use ?? true */
export function isTrackDnaActive(track: Track): boolean {
  return track.direction?.enabled ?? true;
}

export function isAlbumDnaActive(track: Track, album?: Album | null): boolean {
  return track.direction?.inheritFromAlbum !== false && !!album?.direction?.enabled;
}

export function isVibeActive(track: Track): boolean {
  return track.vibe?.enabled ?? true;
}

/** Master switch on the Intents card (can be on with zero motifs checked). */
export function isIntentsMasterEnabled(track: Track): boolean {
  const hasIntents = (track.checkedIntents?.length ?? 0) > 0;
  return track.intentsEnabled ?? hasIntents;
}

export function isIntentsActive(track: Track): boolean {
  const hasIntents = (track.checkedIntents?.length ?? 0) > 0;
  return isIntentsMasterEnabled(track) && hasIntents;
}

export function isGuardrailsActive(track: Track): boolean {
  return track.guardrails?.enabled ?? true;
}

export function isStyleActive(track: Track): boolean {
  return track.styleEnabled === true;
}

export type WorkstationRuleBadge = { id: string; active: boolean };

const WORKSTATION_BADGE_ACTIVE: Record<string, string> = {
  'ALBUM DNA': 'border-emerald-500/70 text-emerald-400 bg-emerald-500/10',
  'TRACK DNA': 'border-green-500/70 text-green-400 bg-green-500/10',
  VIBE: 'border-amber-500/70 text-amber-400 bg-amber-500/10',
  INTENTS: 'border-sky-500/70 text-sky-400 bg-sky-500/10',
  'END WITH': 'border-cyan-500/70 text-cyan-300 bg-cyan-500/10',
  GUARD: 'border-rose-500/70 text-rose-400 bg-rose-500/10',
  STYLE: 'border-fuchsia-500/70 text-fuchsia-400 bg-fuchsia-500/10',
};

/** Muted pill when the Co-Writer rule is toggled off (still visible in Bar WS telemetry). */
export const WORKSTATION_BADGE_INACTIVE =
  'border-white/12 text-muted-foreground/50 bg-white/[0.03] opacity-80';

export function getWorkstationRuleBadgeClass(id: string, active: boolean): string {
  return active ? (WORKSTATION_BADGE_ACTIVE[id] ?? WORKSTATION_BADGE_ACTIVE.VIBE) : WORKSTATION_BADGE_INACTIVE;
}

/** Co-Writer panel card — colored when the section toggle is on, muted grey when off. */
export function coWriterSectionCardClass(active: boolean, activeClass: string): string {
  return cn(
    activeClass,
    !active &&
      'border-white/12 bg-neutral-950/55 opacity-[0.72] grayscale-[0.45] shadow-none transition-[filter,opacity,border-color,background-color] duration-200'
  );
}

export function coWriterSectionTitleClass(active: boolean, activeColor: string): string {
  return cn(activeColor, !active && '!text-muted-foreground/55');
}

export function coWriterSectionAccentClass(active: boolean, activeColor: string): string {
  return cn(activeColor, !active && '!text-muted-foreground/45');
}

/** Intent motif rows inside the Intents card */
export function coWriterIntentRowClass(active: boolean, locked: boolean): string {
  if (locked) {
    return 'bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.1)]';
  }
  return cn(
    'flex items-start gap-2 sm:gap-3 p-3 rounded-lg border transition-all group min-w-0 overflow-hidden',
    active
      ? 'bg-[#142633] border-white/5 hover:bg-[#1a3040]'
      : 'bg-neutral-900/50 border-white/10 opacity-60 grayscale-[0.35] hover:bg-neutral-900/50'
  );
}

/** Always lists core rules; inactive ones render grey in the Bar Workstation header. */
export function getWorkstationRuleBadges(track: Track, album?: Album | null): WorkstationRuleBadge[] {
  const badges: WorkstationRuleBadge[] = [
    { id: 'TRACK DNA', active: isTrackDnaActive(track) },
  ];
  if (album) {
    badges.push({ id: 'ALBUM DNA', active: isAlbumDnaActive(track, album) });
  }
  badges.push(
    { id: 'VIBE', active: isVibeActive(track) },
    { id: 'INTENTS', active: isIntentsActive(track) },
    { id: 'GUARD', active: isGuardrailsActive(track) },
    { id: 'STYLE', active: isStyleActive(track) }
  );
  if (track.endWith?.trim()) {
    badges.push({ id: 'END WITH', active: isIntentsActive(track) });
  }
  return badges;
}
