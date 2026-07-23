'use client';

import { Suspense } from 'react';
import { StudioLoader } from '@/components/studio-loader';
import TryRedirectInner from './try-redirect-inner';

export default function TryRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <StudioLoader size="lg" />
        </div>
      }
    >
      <TryRedirectInner />
    </Suspense>
  );
}
