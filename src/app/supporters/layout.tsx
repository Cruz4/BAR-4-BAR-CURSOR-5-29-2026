import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Support Circle',
  description: 'Manage the people who follow and support you and the people you support on AKAsheet.',
  path: '/supporters',
  index: false,
});

export default function SupportersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
