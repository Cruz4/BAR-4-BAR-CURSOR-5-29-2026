import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Ink & Studio Usage',
  description:
    'View your Ink balance, monthly capacity, and Studio Pro benefits on Bar 4 Bar — the AI lyric workstation for bar-by-bar writing.',
  path: '/usage',
});

export default function UsageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
