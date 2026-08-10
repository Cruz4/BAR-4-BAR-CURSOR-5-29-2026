import { redirect } from 'next/navigation';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

export const dynamic = 'force-dynamic';

/**
 * Server gate for all /lock/* routes.
 * Honors Admin Panel → Config → LOCK System (and LOCK_FORCE_OFF).
 */
export default async function LockSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isLockFeatureEnabled())) {
    redirect('/');
  }
  return children;
}
