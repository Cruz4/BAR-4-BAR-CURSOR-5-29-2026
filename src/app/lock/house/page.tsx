'use client';

import { LockScaffoldPage } from '@/components/lock/lock-scaffold-page';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';

/** House LOCK — static segment for /lock/house */
export default function LockHousePage() {
  return <LockScaffoldPage lockId={LOCK_HOUSE_ID} />;
}
