import type { Album, Track } from '@/lib/types';

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

export function isIntentsActive(track: Track): boolean {
  const hasIntents = (track.checkedIntents?.length ?? 0) > 0;
  const enabled = track.intentsEnabled ?? hasIntents;
  return enabled && hasIntents;
}

export function isGuardrailsActive(track: Track): boolean {
  return track.guardrails?.enabled ?? true;
}

export function isStyleActive(track: Track): boolean {
  return track.styleEnabled === true;
}

export type WorkstationRuleBadge = { id: string; color: string };

export function getWorkstationRuleBadges(track: Track, album?: Album | null): WorkstationRuleBadge[] {
  const badges: WorkstationRuleBadge[] = [];
  if (isAlbumDnaActive(track, album)) badges.push({ id: 'ALBUM DNA', color: 'border-emerald-500 text-emerald-500' });
  if (isTrackDnaActive(track)) badges.push({ id: 'TRACK DNA', color: 'border-green-500 text-green-500' });
  if (isVibeActive(track)) badges.push({ id: 'VIBE', color: 'border-amber-500 text-amber-500' });
  if (isIntentsActive(track)) badges.push({ id: 'INTENTS', color: 'border-sky-500 text-sky-500' });
  if (track.endWith && isIntentsActive(track)) badges.push({ id: 'END WITH', color: 'border-cyan-500 text-cyan-400' });
  if (isGuardrailsActive(track)) badges.push({ id: 'GUARD', color: 'border-rose-500 text-rose-500' });
  if (isStyleActive(track)) badges.push({ id: 'STYLE', color: 'border-fuchsia-500 text-fuchsia-500' });
  return badges;
}
