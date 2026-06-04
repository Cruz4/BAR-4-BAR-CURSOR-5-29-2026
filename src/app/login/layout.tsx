import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Sign In — Start Writing Your Next Bar',
  description:
    'Sign in to Bar 4 Bar Studio: paste verses, keep rhyme scheme, generate the next bar with AI, and save lyric projects in your vault. Free tier available.',
  path: '/login',
  openGraphTitle: 'Sign In — Bar 4 Bar Studio',
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
