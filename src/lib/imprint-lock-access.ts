/** Studio Tier query that scrolls to and flashes the Imprint style-lock perk. */
export const IMPRINT_LOCK_HIGHLIGHT = 'imprint-lock';

export const IMPRINT_LOCK_UPGRADE_PATH = `/usage?tab=cloud&highlight=${IMPRINT_LOCK_HIGHLIGHT}`;

export const IMPRINT_LOCK_UPGRADE_TOAST = {
  title: 'Imprint style locks are Studio Pro',
  description:
    'Upgrade to save up to 7 looks and reload them on any post — shuffle stays on every tier.',
} as const;

export function isImprintLockAccessFeature(feature: string): boolean {
  return /lockable styles|style locks/i.test(feature);
}
