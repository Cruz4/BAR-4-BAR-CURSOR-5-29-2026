import { redirect } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { isFoldsFeatureEnabled } from '@/lib/server/folds-feature';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Folds',
  description: 'Private lyric sheets passed between artists on Bar 4 Bar.',
  path: '/folds',
});

export default async function FoldsLayout({ children }: { children: React.ReactNode }) {
  if (!(await isFoldsFeatureEnabled())) {
    redirect('/');
  }
  return children;
}
