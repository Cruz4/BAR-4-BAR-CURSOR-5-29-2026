/**
 * Scene Home pivot — kill switch + shared path helpers.
 *
 * When SCENE_HOME_ENABLED is true, signed-in `/` renders the Scene home
 * (feed + discover + booth) and The Vault lives at /vault.
 * Flip to false to fully restore the old behavior: `/` renders the Vault
 * and /vault redirects home.
 */

export const SCENE_HOME_ENABLED = true;

export const VAULT_PATH = '/vault';

export const SCENE_HOME_PATH = '/';

/** True when the pathname is the Vault surface (respects the flag). */
export function isVaultPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (SCENE_HOME_ENABLED) return pathname === VAULT_PATH;
  return pathname === '/';
}

/** Where "go to the Vault" intents should navigate. */
export function vaultHref(): string {
  return SCENE_HOME_ENABLED ? VAULT_PATH : '/';
}

/** Where "open The Block / friends feed" intents should navigate. */
export function blockFeedHref(): string {
  return SCENE_HOME_ENABLED ? '/' : '/feed';
}
