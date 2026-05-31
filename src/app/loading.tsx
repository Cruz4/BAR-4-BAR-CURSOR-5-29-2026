
'use client';

import { StudioLoader } from '@/components/studio-loader';

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <StudioLoader size="lg" />
        <p className="text-xs font-code uppercase tracking-widest text-muted-foreground animate-pulse">
          Opening Workstation...
        </p>
      </div>
    </div>
  );
}
