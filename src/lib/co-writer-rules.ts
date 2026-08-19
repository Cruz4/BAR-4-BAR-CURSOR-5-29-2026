import { CREATIVE_DNA_FIELDS } from '@/lib/dna-strands';
import type { Album, Direction, Track } from '@/lib/types';
import { cn, safeTrim } from '@/lib/utils';

export const UNASSIGNED_ALBUM_ID = 'unassigned';

/** Loose / idea-shelf tracks — no concept album blueprint to inherit. */
export function isLooseTrackAlbum(album?: Pick<Album, 'id'> | null): boolean {
  return album?.id === UNASSIGNED_ALBUM_ID;
}

export function hasCreativeDnaContent(direction?: Partial<Direction> | null): boolean {
  if (!direction) return false;
  return CREATIVE_DNA_FIELDS.some(({ key }) => String(direction[key] ?? '').trim().length > 0);
}

export function hasGuardrailsContent(
  guardrails?: Pick<
    NonNullable<Track['guardrails']>,
    'negativePrompt' | 'forbiddenWords' | 'mustIncludeWords'
  > | null
): boolean {
  if (!guardrails) return false;
  if (safeTrim(guardrails.negativePrompt)) return true;
  if ((guardrails.forbiddenWords?.length ?? 0) > 0) return true;
  if ((guardrails.mustIncludeWords?.length ?? 0) > 0) return true;
  return false;
}

/** Hub / form strings before comma-splitting into guardrails arrays. */
export function formatGuardrailsCsv(words?: string[] | null): string {
  return (words ?? []).join(', ');
}

export function parseGuardrailsCsv(csv = ''): string[] {
  return csv.split(',').map((w) => w.trim()).filter(Boolean);
}

export function hasGuardrailsStringsContent(
  negativePrompt = '',
  forbiddenCsv = '',
  mustIncludeCsv = ''
): boolean {
  return hasGuardrailsContent({
    negativePrompt,
    forbiddenWords: parseGuardrailsCsv(forbiddenCsv),
    mustIncludeWords: parseGuardrailsCsv(mustIncludeCsv),
  });
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
  const contentFieldsTouched =
    'negativePrompt' in patch || 'forbiddenWords' in patch || 'mustIncludeWords' in patch;

  if (!hasGuardrailsContent(merged)) {
    merged.enabled = false;
  } else if (patch.enabled === false) {
    merged.enabled = false;
  } else if (patch.enabled === true) {
    merged.enabled = true;
  } else if (contentFieldsTouched) {
    merged.enabled = true;
  } else if (guardrails?.enabled !== false) {
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

/** Unique motif strings for this track only (library + checked). */
export function trackIntentPool(track: Pick<Track, 'intentRefs' | 'checkedIntents'>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...(track.intentRefs ?? []), ...(track.checkedIntents ?? [])]) {
    if (typeof raw !== 'string') continue;
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Prefer this track's intent library. An explicit `intentRefs` array
 * (including empty) is always per-track — never shared with siblings.
 * Only legacy tracks missing `intentRefs` fall back to album `thingsToSay`
 * for display until they are forked onto the track.
 */
export function resolveTrackIntentPool(
  track: Pick<Track, 'intentRefs' | 'checkedIntents'> & { intentRefs?: string[] | null },
  album?: Pick<Album, 'thingsToSay'> | null
): string[] {
  if (Array.isArray(track.intentRefs)) {
    return trackIntentPool(track);
  }
  const legacy = album?.thingsToSay ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of legacy) {
    if (typeof raw !== 'string') continue;
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
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

/** Per-effect accent tokens — strong tint + readable text in light mode; glow preserved in dark. */
export type EffectAccentKey =
  | 'emerald'
  | 'green'
  | 'amber'
  | 'sky'
  | 'rose'
  | 'fuchsia'
  | 'primary'
  | 'cyan'
  | 'teal';

export const EFFECT_ACCENT: Record<
  EffectAccentKey,
  {
    badge: string;
    panel: string;
    title: string;
    subtitle: string;
    label: string;
    header: string;
  }
> = {
  emerald: {
    badge:
      'border-emerald-600/75 text-emerald-950 bg-emerald-400/25 shadow-sm dark:border-emerald-500/70 dark:text-emerald-300 dark:bg-emerald-500/12',
    panel:
      'border-emerald-500/40 bg-emerald-500/14 dark:border-emerald-500/25 dark:bg-emerald-500/5',
    title: 'text-emerald-700 dark:text-emerald-400',
    subtitle: 'text-emerald-800/95 dark:text-emerald-400/85',
    label: 'text-emerald-900 dark:text-emerald-300/85',
    header: 'text-emerald-700 dark:text-emerald-500',
  },
  green: {
    badge:
      'border-green-600/75 text-green-950 bg-green-400/25 shadow-sm dark:border-green-500/70 dark:text-green-400 dark:bg-green-500/12',
    panel:
      'border-green-500/40 bg-green-500/14 dark:border-green-500/25 dark:bg-green-500/5',
    title: 'text-green-700 dark:text-green-500',
    subtitle: 'text-green-800/95 dark:text-green-400/85',
    label: 'text-green-900 dark:text-green-300/85',
    header: 'text-green-700 dark:text-green-500',
  },
  amber: {
    badge:
      'border-amber-600/80 text-amber-950 bg-amber-400/30 shadow-sm dark:border-amber-500/70 dark:text-amber-400 dark:bg-amber-500/12',
    panel:
      'border-amber-500/45 bg-amber-500/16 dark:border-amber-500/25 dark:bg-amber-500/5',
    title: 'text-amber-800 dark:text-amber-500',
    subtitle: 'text-amber-900/95 dark:text-amber-400/85',
    label: 'text-amber-900 dark:text-amber-300/85',
    header: 'text-amber-700 dark:text-amber-500',
  },
  sky: {
    badge:
      'border-sky-600/75 text-sky-950 bg-sky-400/25 shadow-sm dark:border-sky-500/70 dark:text-sky-400 dark:bg-sky-500/12',
    panel:
      'border-sky-500/40 bg-sky-500/14 dark:border-sky-500/25 dark:bg-sky-500/5',
    title: 'text-sky-800 dark:text-sky-400',
    subtitle: 'text-sky-900/95 dark:text-sky-300/85',
    label: 'text-sky-900 dark:text-sky-300/85',
    header: 'text-sky-700 dark:text-sky-400',
  },
  rose: {
    badge:
      'border-rose-600/75 text-rose-950 bg-rose-400/25 shadow-sm dark:border-rose-500/70 dark:text-rose-400 dark:bg-rose-500/12',
    panel:
      'border-rose-500/40 bg-rose-500/14 dark:border-rose-500/25 dark:bg-rose-500/5',
    title: 'text-rose-700 dark:text-rose-500',
    subtitle: 'text-rose-800/95 dark:text-rose-400/85',
    label: 'text-rose-900 dark:text-rose-300/85',
    header: 'text-rose-700 dark:text-rose-500',
  },
  fuchsia: {
    badge:
      'border-fuchsia-600/75 text-fuchsia-950 bg-fuchsia-400/25 shadow-sm dark:border-fuchsia-500/70 dark:text-fuchsia-400 dark:bg-fuchsia-500/12',
    panel:
      'border-fuchsia-500/40 bg-fuchsia-500/14 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/5',
    title: 'text-fuchsia-800 dark:text-fuchsia-500',
    subtitle: 'text-fuchsia-900/95 dark:text-fuchsia-400/85',
    label: 'text-fuchsia-900 dark:text-fuchsia-300/85',
    header: 'text-fuchsia-700 dark:text-fuchsia-500',
  },
  primary: {
    badge:
      'border-primary/70 text-primary bg-primary/15 shadow-sm dark:border-primary/60 dark:text-primary dark:bg-primary/10',
    panel:
      'border-primary/35 bg-primary/12 dark:border-primary/25 dark:bg-primary/5',
    title: 'text-primary',
    subtitle: 'text-primary/90 dark:text-primary/80',
    label: 'text-primary dark:text-primary/70',
    header: 'text-primary',
  },
  cyan: {
    badge:
      'border-cyan-600/75 text-cyan-950 bg-cyan-400/25 shadow-sm dark:border-cyan-500/70 dark:text-cyan-300 dark:bg-cyan-500/12',
    panel:
      'border-cyan-500/40 bg-cyan-500/14 dark:border-cyan-500/25 dark:bg-cyan-500/5',
    title: 'text-cyan-800 dark:text-cyan-400',
    subtitle: 'text-cyan-900/95 dark:text-cyan-300/85',
    label: 'text-cyan-900 dark:text-cyan-300/85',
    header: 'text-cyan-700 dark:text-cyan-400',
  },
  teal: {
    badge:
      'border-teal-600/75 text-teal-950 bg-teal-400/25 shadow-sm dark:border-teal-500/70 dark:text-teal-400 dark:bg-teal-500/12',
    panel:
      'border-teal-500/40 bg-teal-500/14 dark:border-teal-500/25 dark:bg-teal-500/5',
    title: 'text-teal-800 dark:text-teal-400',
    subtitle: 'text-teal-900/95 dark:text-teal-400/85',
    label: 'text-teal-900 dark:text-teal-300/85',
    header: 'text-teal-700 dark:text-teal-400',
  },
};

const WORKSTATION_BADGE_ACTIVE: Record<string, string> = {
  INHERIT:
    'border-dashed border-emerald-500/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'FROM ALBUM':
    'border-dashed border-emerald-500/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'ALBUM DNA':
    'border-emerald-500/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'INHERIT ALBUM':
    'border-teal-500/70 bg-teal-500/10 text-teal-700 dark:text-teal-400',
  'TRACK DNA':
    'border-green-500/70 bg-green-500/10 text-green-700 dark:text-green-400',
  VIBE:
    'border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  INTENTS:
    'border-sky-500/70 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  'END WITH':
    'border-cyan-500/70 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  GUARD:
    'border-rose-500/70 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  GUARDRAILS:
    'border-rose-500/70 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  STYLE:
    'border-fuchsia-500/70 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400',
  'STYLE DNA':
    'border-fuchsia-500/70 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400',
  'SPECIAL INSTRUCTIONS':
    'border-primary/70 bg-primary/10 text-primary',
  'REMIX PATHS':
    'border-primary/70 bg-primary/10 text-primary',
};

/** Muted pill when the Co-Writer rule is toggled off (still visible in Bar WS telemetry). */
export const WORKSTATION_BADGE_INACTIVE =
  'border-border/60 text-foreground/50 bg-muted/50 opacity-90 dark:border-white/12 dark:text-muted-foreground/50 dark:bg-white/[0.03] dark:opacity-80';

export function getWorkstationRuleBadgeClass(id: string, active: boolean): string {
  if (!active) return WORKSTATION_BADGE_INACTIVE;
  if (WORKSTATION_BADGE_ACTIVE[id]) return WORKSTATION_BADGE_ACTIVE[id];
  if (id.includes('INTENTS')) return WORKSTATION_BADGE_ACTIVE.INTENTS;
  if (id.includes('REMIX PATHS')) return WORKSTATION_BADGE_ACTIVE['REMIX PATHS'];
  return WORKSTATION_BADGE_ACTIVE.VIBE;
}

/** Hover / tap copy for Bar Workstation active-rule badges. */
export function getWorkstationRuleBadgeTooltip(id: string): string {
  switch (id) {
    case 'INHERIT':
    case 'FROM ALBUM':
    case 'INHERIT ALBUM':
      return 'Inherit From Album is on — album DNA feeds this track.';
    case 'TRACK DNA':
      return 'Track DNA is on — these five questions guide AI gens.';
    case 'ALBUM DNA':
      return 'Album DNA is on — album world / emotion / message guide AI gens.';
    case 'VIBE':
      return 'Track Vibe is on — genre, BPM, and mood guide AI gens.';
    case 'INTENTS':
      return 'Intents are on — checked punchlines weave into AI suggestions.';
    case 'END WITH':
      return 'Precision Lock is on — the next generated line must end with your locked phrase.';
    case 'GUARD':
    case 'GUARDRAILS':
      return 'Guardrails are on — forbidden / must-include words and avoid themes apply.';
    case 'STYLE':
    case 'STYLE DNA':
      return 'Style DNA is on — your trained cadence profile shapes AI gens.';
    case 'SPECIAL INSTRUCTIONS':
      return 'Special Instructions are on — freeform rules take priority in gens.';
    case 'REMIX PATHS':
      return 'Remix Paths are active in the Calibration Hub.';
    default:
      return `${id} is on for AI generation.`;
  }
}

export function coWriterEffectPanel(accent: EffectAccentKey): string {
  return cn('rounded-xl shadow-sm', EFFECT_ACCENT[accent].panel);
}

export function coWriterEffectTitle(accent: EffectAccentKey, active: boolean): string {
  return cn(EFFECT_ACCENT[accent].title, !active && '!text-muted-foreground/55');
}

export function coWriterEffectSubtitle(accent: EffectAccentKey, active: boolean): string {
  return cn(EFFECT_ACCENT[accent].subtitle, !active && '!text-muted-foreground/55');
}

export function coWriterEffectLabel(accent: EffectAccentKey): string {
  return EFFECT_ACCENT[accent].label;
}

export function coWriterEffectHeader(accent: EffectAccentKey): string {
  return EFFECT_ACCENT[accent].header;
}

/** Co-Writer panel card — colored when the section toggle is on, muted when off. */
export function coWriterSectionCardClass(active: boolean, activeClass: string): string {
  return cn(
    activeClass,
    !active &&
      'border-border/55 bg-muted/40 opacity-80 grayscale-[0.35] shadow-none transition-[filter,opacity,border-color,background-color] duration-200 dark:border-white/12 dark:bg-neutral-950/55 dark:opacity-[0.72] dark:grayscale-[0.45]'
  );
}

export function coWriterSectionTitleClass(active: boolean, activeColor: string): string {
  return cn(activeColor, !active && '!text-muted-foreground/55');
}

export function coWriterSectionAccentClass(active: boolean, activeColor: string): string {
  return cn(activeColor, !active && '!text-muted-foreground/45');
}

export type NeuralStripAccent = 'emerald' | 'amber' | 'sky' | 'rose' | 'fuchsia' | 'yellow' | 'indigo';

/** Minimized Co-Writer / workstation rail — same glow language as dark, inverted contrast in light. */
export const NEURAL_STRIP_STYLE: Record<
  NeuralStripAccent,
  { bar: string; labelActive: string; glow: string }
> = {
  emerald: {
    bar: 'bg-emerald-500',
    labelActive: 'text-emerald-700 dark:text-emerald-400',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.55)] dark:shadow-[0_0_14px_rgba(16,185,129,0.85)]',
  },
  amber: {
    bar: 'bg-amber-500',
    labelActive: 'text-amber-700 dark:text-amber-400',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.55)] dark:shadow-[0_0_14px_rgba(245,158,11,0.85)]',
  },
  sky: {
    bar: 'bg-sky-500',
    labelActive: 'text-sky-700 dark:text-sky-400',
    glow: 'shadow-[0_0_16px_rgba(14,165,233,0.55)] dark:shadow-[0_0_14px_rgba(56,189,248,0.85)]',
  },
  rose: {
    bar: 'bg-rose-500',
    labelActive: 'text-rose-700 dark:text-rose-400',
    glow: 'shadow-[0_0_16px_rgba(244,63,94,0.5)] dark:shadow-[0_0_14px_rgba(244,63,94,0.85)]',
  },
  fuchsia: {
    bar: 'bg-fuchsia-500',
    labelActive: 'text-fuchsia-700 dark:text-fuchsia-400',
    glow: 'shadow-[0_0_16px_rgba(217,70,239,0.5)] dark:shadow-[0_0_14px_rgba(217,70,239,0.85)]',
  },
  yellow: {
    bar: 'bg-yellow-600',
    labelActive: 'text-yellow-800 dark:text-yellow-500',
    glow: 'shadow-[0_0_16px_rgba(202,138,4,0.55)] dark:shadow-[0_0_14px_rgba(234,179,8,0.85)]',
  },
  indigo: {
    bar: 'bg-indigo-500',
    labelActive: 'text-indigo-700 dark:text-indigo-400',
    glow: 'shadow-[0_0_16px_rgba(99,102,241,0.5)] dark:shadow-[0_0_14px_rgba(99,102,241,0.85)]',
  },
};

/** Intent motif rows inside the Intents card */
export function coWriterIntentRowClass(
  active: boolean,
  locked: boolean,
  checked: boolean = false
): string {
  const base =
    'flex items-start gap-2 sm:gap-3 px-3 py-2 rounded-lg border transition-all group min-w-0';
  if (locked) {
    return cn(
      base,
      'bg-sky-500/15 border-sky-500/45 dark:bg-sky-500/10 dark:border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.12)] dark:shadow-[0_0_15px_rgba(56,189,248,0.1)]'
    );
  }
  if (checked) {
    return cn(
      base,
      active
        ? 'bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/15 dark:bg-[#142633] dark:border-sky-500/20 dark:hover:bg-[#1a3040]'
        : 'bg-muted/50 border-sky-500/20 opacity-75 grayscale-[0.2] hover:bg-muted/60 dark:bg-neutral-900/50 dark:border-sky-500/15 dark:hover:bg-neutral-900/55'
    );
  }
  return cn(
    base,
    active
      ? 'bg-sky-500/10 border-border/60 hover:bg-sky-500/15 dark:bg-[#142633] dark:border-white/5 dark:hover:bg-[#1a3040]'
      : 'bg-muted/40 border-border/50 opacity-70 grayscale-[0.35] hover:bg-muted/50 dark:bg-neutral-900/50 dark:border-white/10 dark:hover:bg-neutral-900/50'
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
  if (safeTrim(track.endWith) && isIntentsActive(track)) {
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
