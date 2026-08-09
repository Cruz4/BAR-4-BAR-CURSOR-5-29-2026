'use client';

import { useParams } from 'next/navigation';
import { LockScaffoldPage } from '@/components/lock/lock-scaffold-page';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';

/** Dynamic LOCK — /lock/[lockId] (placeholder shell; no DB). */
export default function LockByIdPage() {
  const params = useParams();
  const raw = params?.lockId;
  const lockId =
    typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : Array.isArray(raw) && typeof raw[0] === 'string'
        ? raw[0].trim()
        : LOCK_HOUSE_ID;

  return <LockScaffoldPage lockId={lockId || LOCK_HOUSE_ID} />;
}
