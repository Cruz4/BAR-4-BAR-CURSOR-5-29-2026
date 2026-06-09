/** Public marketing/legal pages where Google AdSense may load (not app tools or loaders). */
export const ADSENSE_ALLOWED_PATHS = new Set([
  '/login',
  '/pricing',
  '/terms',
  '/privacy',
  '/cookies',
]);

export function isAdsenseAllowedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ADSENSE_ALLOWED_PATHS.has(pathname);
}
