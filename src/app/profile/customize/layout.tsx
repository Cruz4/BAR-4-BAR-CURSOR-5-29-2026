import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Edit Public Page',
  description:
    'Customize your Bar 4 Bar Artist Home — living skin, modules, social links, The Board, and more.',
  path: '/profile/customize',
});

export default function ProfileCustomizeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
