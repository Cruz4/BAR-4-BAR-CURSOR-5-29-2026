import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Studio Leaderboard',
  description:
    'See top Bar 4 Bar writers by bars written, streaks, and studio activity. Join the community and climb the ranks.',
  path: '/leaderboard',
});

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
