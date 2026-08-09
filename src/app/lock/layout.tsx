import { redirect } from 'next/navigation';
import { isLockEnabled } from '@/lib/lock-feature';

/**
 * Server gate for all /lock/* routes.
 * Ensures .env.local NEXT_PUBLIC_LOCK is honored even when the client bundle
 * fails to inline the public env var (common on this Windows + next dev setup).
 */
export default function LockSectionLayout({ children }: { children: React.ReactNode }) {
  if (!isLockEnabled()) {
    redirect('/');
  }
  return children;
}
