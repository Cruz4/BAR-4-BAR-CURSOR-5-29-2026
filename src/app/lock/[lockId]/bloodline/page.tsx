'use client';

import { Suspense } from 'react';
import LockBloodlinePageInner from './bloodline-inner';
import { LockShell } from '@/components/lock/lock-shell';

export default function LockBloodlinePage() {
  return (
    <Suspense
      fallback={
        <LockShell badge="Verse Tree">
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
            Loading the strain…
          </div>
        </LockShell>
      }
    >
      <LockBloodlinePageInner />
    </Suspense>
  );
}
