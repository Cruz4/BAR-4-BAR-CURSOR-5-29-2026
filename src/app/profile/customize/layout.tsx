import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Edit Public Page',
  description:
    'Customize your AKAsheet public music home—identity, sound, featured track, living skin, modules, social links, and The Board.',
  path: '/profile/customize',
  index: false,
});

export default function ProfileCustomizeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
