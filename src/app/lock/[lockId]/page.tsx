'use client';

import { useParams } from 'next/navigation';
import { LockPublicPage } from '@/components/lock/lock-public-page';
import { LOCK_HOUSE_ID } from '@/lib/lock-feature';

export default function LockByIdPage() {
  const params = useParams();
  const raw = params?.lockId;
  const lockId =
    typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : Array.isArray(raw) && typeof raw[0] === 'string'
        ? raw[0].trim()
        : LOCK_HOUSE_ID;

  return <LockPublicPage lockId={lockId || LOCK_HOUSE_ID} />;
}
