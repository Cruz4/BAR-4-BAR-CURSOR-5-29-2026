import { LockPublicPage } from '@/components/lock/lock-public-page';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';

type PageProps = {
  params: Promise<{ lockId: string }>;
};

/** Layout already gates LOCK; pass lockEnabled so client skips env-only bounce. */
export default async function LockByIdPage({ params }: PageProps) {
  const { lockId: raw } = await params;
  const lockId = (raw || '').trim() || LOCK_HOUSE_ID;
  return <LockPublicPage lockId={lockId} lockEnabled />;
}
