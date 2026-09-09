import { absoluteUrl } from '@/lib/seo';

/** Paths blocked for all crawlers — keep in sync with `public/robots.txt` via `npm run robots:sync`. */
export const ROBOTS_DISALLOW_PATHS = [
  '/admin',
  '/api/',
  '/albums/',
  '/activity',
  '/earnings',
  '/feed',
  '/friends',
  '/insights',
  '/library',
  '/maintenance',
  '/marketing/capture',
  '/msgs',
  '/profile/customize',
  '/studio-progress',
  '/supporters',
  '/usage',
  '/vault',
] as const;

export function buildRobotsTxt(): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    ...ROBOTS_DISALLOW_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '',
  ];
  return lines.join('\n');
}
