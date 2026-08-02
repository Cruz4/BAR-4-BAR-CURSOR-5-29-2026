import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'The Block',
  description:
    'Your Bar 4 Bar friends feed — wall drops, friend requests, and artist invites. Search live Artist Homes by name.',
  path: '/feed',
});

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
