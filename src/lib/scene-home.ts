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

/** Top of The Scene (header) — jump target from Your Block. */
export const SCENE_TOP_ID = 'scene-top';

/** Your Booth card on Scene home. */
export const SCENE_BOOTH_ID = 'your-booth';

/** Booth memory — last unfinished sheet on Scene home. */
export const SCENE_BOOTH_MEMORY_ID = 'booth-memory';

/** Anchor for friends posts on Scene home (after Live DNA Drops). */
export const BLOCK_SECTION_ID = 'your-block';

/** Anchor for Discover the Scene strip on Scene home. */
export const DISCOVER_SECTION_ID = 'discover-scene';

/** Find artists / find a friend panel under Discover. */
export const FIND_ARTISTS_SECTION_ID = 'find-artists';

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
  return SCENE_HOME_ENABLED ? `/#${BLOCK_SECTION_ID}` : '/feed';
}

export {
  scenePortalHref,
  parseScenePortalFeed,
  type ScenePortalFeed,
} from '@/lib/scene/portal-feed';
