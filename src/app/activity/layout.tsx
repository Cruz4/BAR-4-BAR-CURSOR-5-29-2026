import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Activity',
  description: 'Loves, replies, friend requests, and Lyrics DNA Drop imports — received and sent.',
  path: '/activity',
  index: false,
});

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
