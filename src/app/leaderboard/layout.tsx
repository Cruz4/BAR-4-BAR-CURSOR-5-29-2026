import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Studio Leaderboard',
  description:
    'See Bar 4 Bar writing leaders and transparent Emerging (7d) music momentum, with visible signals and no pay-to-rank points.',
  path: '/leaderboard',
});

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
