'use client';

import { Suspense } from 'react';
import { GuestTryHandoffScreen } from '@/components/guest-try-handoff-screen';
import TryRedirectInner from './try-redirect-inner';

export default function TryRedirectPage() {
  return (
    <Suspense fallback={<GuestTryHandoffScreen />}>
      <TryRedirectInner />
    </Suspense>
  );
}
