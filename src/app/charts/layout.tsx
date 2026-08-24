import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Bar 4 Bar Music Charts',
  description:
    'Discover independent songs and emerging artists ranked by qualified listening, completion, repeat support, and unique buyers—not pay-to-rank placement.',
  path: '/charts',
});

export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
