import { redirect } from 'next/navigation';
import { LockPublicPage } from '@/components/lock/lock-public-page';
import { isLockEnabled, LOCK_HOUSE_ID } from '@/lib/lock-feature';

type PageProps = {
  params: Promise<{ lockId: string }>;
};

/** Server gate — env flag read here so /lock/* does not bounce when client inlining fails. */
export default async function LockByIdPage({ params }: PageProps) {
  if (!isLockEnabled()) {
    redirect('/');
  }
  const { lockId: raw } = await params;
  const lockId = (raw || '').trim() || LOCK_HOUSE_ID;
  return <LockPublicPage lockId={lockId} lockEnabled />;
}
