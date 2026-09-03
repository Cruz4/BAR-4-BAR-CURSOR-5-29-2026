import { redirect } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { isFoldsFeatureEnabled } from '@/lib/server/folds-feature';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Msgs',
  description: 'Private messages between connected AKAsheet members.',
  path: '/msgs',
  index: false,
});

export default async function MsgsLayout({ children }: { children: React.ReactNode }) {
  if (!(await isFoldsFeatureEnabled())) {
    redirect('/');
  }
  return children;
}
