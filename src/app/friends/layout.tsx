import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Your circle',
  description: 'Friends list and blocked accounts on Bar 4 Bar.',
  path: '/friends',
  index: false,
});

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
