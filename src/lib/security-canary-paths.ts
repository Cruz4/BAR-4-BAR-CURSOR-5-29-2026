/**
 * Paths no real AKAsheet screen links to. Scanners still request them.
 * Keep this Edge-safe (middleware imports it).
 */

const PREFIXES = [
  '/.env',
  '/.git',
  '/.aws',
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/wp-login.php',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/wordpress',
  '/cgi-bin',
  '/vendor/phpunit',
] as const;

const EXACT = new Set([
  '/wordpress',
  '/xmlrpc.php',
  '/wp-login.php',
  '/phpmyadmin',
  '/admin.php',
  '/phpinfo.php',
  '/wlwmanifest.xml',
]);

const BAIT_FILE = /\.(php|asp|aspx|jsp|cgi|sql|bak)$/i;

function matchesCanaryPrefix(lower: string, prefix: string): boolean {
  if (lower === prefix || lower.startsWith(`${prefix}/`)) return true;
  return prefix === '/.env' && lower.startsWith('/.env.');
}

export function matchSecurityCanaryPath(pathname: string): string | null {
  const path = (pathname.split('?')[0] || '/').replace(/\/{2,}/g, '/') || '/';
  if (path === '/') return null;

  const lower = path.toLowerCase();
  if (EXACT.has(lower)) return path.slice(0, 120);
  if (PREFIXES.some((prefix) => matchesCanaryPrefix(lower, prefix))) {
    return path.slice(0, 120);
  }
  if (BAIT_FILE.test(lower)) return path.slice(0, 120);
  return null;
}
