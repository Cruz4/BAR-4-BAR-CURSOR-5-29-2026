import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Discover Independent Music People & First Drops',
  description:
    'Discover artists, creators, Music Fans, and First Drops by public taste and craft signals. Every personalized match explains why it fits.',
  path: '/discover',
});

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
