import { buildLoginPath } from '@/lib/checkout-intent';

/** Studio Tier query that scrolls to and flashes the DNA Drop perk. */
export const DNA_DROP_HIGHLIGHT = 'dna-drop';

export const DNA_DROP_UPGRADE_PATH = `/usage?tab=cloud&highlight=${DNA_DROP_HIGHLIGHT}`;

export type DnaDropAccessKind = 'view' | 'import';

export function isDnaDropLoginIntent(intent: string | null | undefined): boolean {
  return intent === 'dna-drop' || intent === 'dna-import';
}

export function isDnaDropAccessFeature(feature: string): boolean {
  return /DNA Drop|Shareable lyric links|lyric links/i.test(feature);
}

export function dnaDropSharePath(shareId: string): string {
  return `/share/${encodeURIComponent(shareId.trim())}`;
}

/** Guest sign-in: must be Pro to view / download / import; sign in to check tier or create an account. */
export function buildDnaDropLoginPath(
  shareId: string,
  kind: DnaDropAccessKind = 'view'
): string {
  const intent = kind === 'import' ? 'dna-import' : 'dna-drop';
  return `${buildLoginPath(dnaDropSharePath(shareId))}&intent=${intent}`;
}

/**
 * Click destination for a DNA Drop (lyric snapshot), not a music release.
 * Guests go to sign-in. Signed-in members open the share page, which sends
 * non-Pro visitors to Studio Tier with the DNA Drop perk highlighted.
 */
export function resolveDnaDropHref(shareId: string, signedIn: boolean, isPro = true): string {
  if (!signedIn) return buildDnaDropLoginPath(shareId, 'view');
  if (!isPro) return DNA_DROP_UPGRADE_PATH;
  return dnaDropSharePath(shareId);
}

export function resolveDnaDropImportPath(shareId: string, opts: {
  signedIn: boolean;
  isPro: boolean;
}): string {
  if (!opts.signedIn) return buildDnaDropLoginPath(shareId, 'import');
  if (!opts.isPro) return DNA_DROP_UPGRADE_PATH;
  return dnaDropSharePath(shareId);
}
