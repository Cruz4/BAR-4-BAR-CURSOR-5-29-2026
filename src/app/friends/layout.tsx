import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Your circle',
  description: 'Friends list and blocked artists on Bar 4 Bar.',
  path: '/friends',
});

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
