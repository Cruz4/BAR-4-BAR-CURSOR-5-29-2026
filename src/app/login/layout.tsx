import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Sign In',
  description:
    'Sign in to your Bar 4 Bar DNA Notebook — AI rhyme co-writing, creative DNA strains, a cloud vault, and a shareable Artist Home page. Free tier available.',
  path: '/login',
  openGraphTitle: 'Sign In — Bar 4 Bar DNA Notebook',
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
