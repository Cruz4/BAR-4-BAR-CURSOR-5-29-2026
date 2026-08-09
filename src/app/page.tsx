import { HomePage } from '@/components/home-page';
import { isLockEnabled } from '@/lib/lock-feature';

/** Server reads NEXT_PUBLIC_LOCK from .env.local — client inlining is unreliable here. */
export default function Home() {
  return <HomePage lockEnabled={isLockEnabled()} />;
}
