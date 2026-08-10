import { HomePage } from '@/components/home-page';
import { isLockFeatureEnabled } from '@/lib/server/lock-feature';

/**
 * Runtime LOCK flag (Admin Firestore) — must not statically prerender.
 * Firebase Hosting's build often lacks ADC and would crash / otherwise.
 */
export const dynamic = 'force-dynamic';

/** Server resolves LOCK from Admin Panel (Firestore) + env bootstrap / force-off. */
export default async function Home() {
  const lockEnabled = await isLockFeatureEnabled();
  return <HomePage lockEnabled={lockEnabled} />;
}
