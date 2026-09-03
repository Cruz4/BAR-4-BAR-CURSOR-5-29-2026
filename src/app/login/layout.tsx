import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Sign In',
  description: 'Sign in to AKAsheet — Lyric App & Social Music Drop Platform. Put Your World Within Reach.',
  path: '/login',
  openGraphTitle: 'Sign In — AKAsheet: Put Your World Within Reach',
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
