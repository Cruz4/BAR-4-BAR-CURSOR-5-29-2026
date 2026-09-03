import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'The Block',
  description:
    'Your AKAsheet friends feed—wall drops, friend requests, and music connections.',
  path: '/feed',
  index: false,
});

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
