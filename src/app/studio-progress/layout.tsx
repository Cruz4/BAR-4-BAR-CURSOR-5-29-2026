import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Studio Progress & Achievements',
  description:
    'Track your AKAsheet milestones, achievements, and writing streaks as you build bars and grow your lyric vault.',
  path: '/studio-progress',
  index: false,
});

export default function StudioProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
