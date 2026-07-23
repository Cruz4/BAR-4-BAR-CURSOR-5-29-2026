'use client';

import { StudioLoader } from '@/components/studio-loader';
import { GUEST_TRY_HANDOFF_MESSAGE, GUEST_TRY_HANDOFF_SUBLINE } from '@/lib/guest-try';

/** Pencil loader shown while cold traffic is routed into the guest try sheet. */
export function GuestTryHandoffScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 bg-background">
      <StudioLoader size="lg" message={GUEST_TRY_HANDOFF_MESSAGE} />
      <p className="text-[9px] font-code uppercase tracking-[0.28em] text-muted-foreground/70 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
        {GUEST_TRY_HANDOFF_SUBLINE}
      </p>
    </div>
  );
}
