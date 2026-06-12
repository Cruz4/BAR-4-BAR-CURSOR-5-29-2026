import { CREATIVE_DNA_FIELDS } from '@/lib/dna-strands';
import type { Album, Direction, Track } from '@/lib/types';
import { cn } from '@/lib/utils';

export const UNASSIGNED_ALBUM_ID = 'unassigned';

/** Loose / idea-shelf tracks — no concept album blueprint to inherit. */
export function isLooseTrackAlbum(album?: Pick<Album, 'id'> | null): boolean {
  return album?.id === UNASSIGNED_ALBUM_ID;
}

export function hasCreativeDnaContent(direction?: Partial<Direction> | null): boolean {
  if (!direction) return false;
  return CREATIVE_DNA_FIELDS.some(({ key }) => String(direction[key] ?? '').trim().length > 0);
}

export function hasGuardrailsContent(guardrails?: Track['guardrails'] | null): boolean {
  if (!guardrails) return false;
  if (guardrails.negativePrompt?.trim()) return true;
  if ((guardrails.forbiddenWords?.length ?? 0) > 0) return true;
  if ((guardrails.mustIncludeWords?.length ?? 0) > 0) return true;
  return false;
}

/** Co-Writer DNA switch — on only when at least one Creative DNA field has text and not explicitly disabled. */
export function isTrackDnaToggleOn(track: Track): boolean {
  if (!hasCreativeDnaContent(track.direction)) return false;
  return track.direction?.enabled !== false;
}

export function isTrackDnaActive(track: Track): boolean {
  return isTrackDnaToggleOn(track);
}

export function directionWithSyncedEnabled(
  direction: Partial<Direction> | null | undefined,
  explicitEnabled?: boolean
): Partial<Direction> {
  const next = { ...(direction ?? {}) };
  if (!hasCreativeDnaContent(next)) {
    next.enabled = false;
    return next;
  }
  if (explicitEnabled === false) {
    next.enabled = false;
  } else if (explicitEnabled === true) {
    next.enabled = true;
  } else if (next.enabled !== false) {
    next.enabled = true;
  }
  return next;
}

export function guardrailsWithSyncedEnabled(
  guardrails: Track['guardrails'] | null | undefined,
  patch: Partial<NonNullable<Track['guardrails']>> = {}
): NonNullable<Track['guardrails']> {
  const merged: NonNullable<Track['guardrails']> = {
    enabled: guardrails?.enabled ?? false,
    negativePrompt: guardrails?.negativePrompt,
    forbiddenWords: guardrails?.forbiddenWords,
    mustIncludeWords: guardrails?.mustIncludeWords,
    ...patch,
  };
  if (!hasGuardrailsContent(merged)) {
    merged.enabled = false;
  } else if (patch.enabled === false) {
    merged.enabled = false;
  } else if (patch.enabled === true || guardrails?.enabled !== false) {
    merged.enabled = true;
  }
  return merged;
}

/** Track toggle: pull album Creative DNA into this track (default on for album tracks only). */
export function isInheritFromAlbumOn(track: Track, album?: Album | null): boolean {
  if (isLooseTrackAlbum(album) || track.albumId === UNASSIGNED_ALBUM_ID) return false;
  return track.direction?.inheritFromAlbum !== false;
}

export function isAlbumDnaActive(track: Track, album?: Album | null): boolean {
  return isInheritFromAlbumOn(track, album) && !!album?.direction?.enabled;
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

/** Co-Writer guardrails switch — on only when a restriction field has content and not explicitly disabled. */
export function isGuardrailsToggleOn(track: Track): boolean {
  if (!hasGuardrailsContent(track.guardrails)) return false;
  return track.guardrails?.enabled !== false;
}

export function isGuardrailsActive(track: Track): boolean {
  return isGuardrailsToggleOn(track);
}

export function isStyleActive(track: Track): boolean {
  return track.styleEnabled === true;
}

export type WorkstationRuleBadge = { id: string; active: boolean };

const WORKSTATION_BADGE_ACTIVE: Record<string, string> = {
  INHERIT: 'border-dashed border-emerald-500/55 text-emerald-400 bg-emerald-500/10',
  'FROM ALBUM': 'border-dashed border-emerald-500/55 text-emerald-400 bg-emerald-500/10',
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

/** Active Co-Writer rules only — shown in the Bar Workstation header when toggled on. */
export function getWorkstationRuleBadges(track: Track, album?: Album | null): WorkstationRuleBadge[] {
  const badges: WorkstationRuleBadge[] = [];
  const onRealAlbum = !!album && !isLooseTrackAlbum(album);

  if (onRealAlbum && isInheritFromAlbumOn(track, album)) {
    badges.push({ id: 'INHERIT', active: true });
  }
  if (isTrackDnaActive(track)) {
    badges.push({ id: 'TRACK DNA', active: true });
  }
  if (onRealAlbum && isAlbumDnaActive(track, album)) {
    badges.push({ id: 'ALBUM DNA', active: true });
  }
  if (isVibeActive(track)) {
    badges.push({ id: 'VIBE', active: true });
  }
  if (isIntentsActive(track)) {
    badges.push({ id: 'INTENTS', active: true });
  }
  if (track.endWith?.trim() && isIntentsActive(track)) {
    badges.push({ id: 'END WITH', active: true });
  }
  if (isGuardrailsActive(track)) {
    badges.push({ id: 'GUARD', active: true });
  }
  if (isStyleActive(track)) {
    badges.push({ id: 'STYLE', active: true });
  }

  return badges;
}
