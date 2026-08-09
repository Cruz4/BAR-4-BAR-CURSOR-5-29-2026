'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlbumList } from '@/components/album-list';
import { SceneHome } from '@/components/scene/scene-home';
import { PublicHomeLanding } from '@/components/marketing/public-home-landing';
import { SocialRefSignupRedirect } from '@/components/marketing/social-ref-signup-redirect';
import { GuestTryHandoffScreen } from '@/components/guest-try-handoff-screen';
import { useAuth } from '@/hooks/use-auth';
import { GUEST_TRY_PATH, isGuestTrySheetEnabled } from '@/lib/guest-try';
import { LOCK_HOUSE_PATH } from '@/lib/lock-feature';
import { SCENE_HOME_ENABLED } from '@/lib/scene-home';

function LockHandoffScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-background text-foreground font-code">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Opening LOCK</p>
      <p className="text-[11px] text-muted-foreground">Finish the bar.</p>
    </div>
  );
}

function GuestHomeEntry({ lockEnabled }: { lockEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guestTry = isGuestTrySheetEnabled();

  // Priority: LOCK (if on) → guest try (if on) → PublicHomeLanding
  useEffect(() => {
    const qs = searchParams.toString();
    if (lockEnabled) {
      router.replace(qs ? `${LOCK_HOUSE_PATH}?${qs}` : LOCK_HOUSE_PATH);
      return;
    }
    if (!guestTry) return;
    router.replace(qs ? `${GUEST_TRY_PATH}?${qs}` : GUEST_TRY_PATH);
  }, [lockEnabled, guestTry, router, searchParams]);

  if (lockEnabled) {
    return <LockHandoffScreen />;
  }

  if (guestTry) {
    return <GuestTryHandoffScreen />;
  }

  return (
    <SocialRefSignupRedirect>
      <PublicHomeLanding />
    </SocialRefSignupRedirect>
  );
}

type HomePageProps = {
  /** From server `page.tsx` — authoritative kill-flag (do not rely on client env inlining). */
  lockEnabled?: boolean;
};

export function HomePage({ lockEnabled = false }: HomePageProps) {
  const { user } = useAuth();
  if (user) {
    // Scene home pivot — flip SCENE_HOME_ENABLED off to restore the Vault at /.
    return SCENE_HOME_ENABLED ? <SceneHome /> : <AlbumList />;
  }
  return (
    <Suspense fallback={lockEnabled ? <LockHandoffScreen /> : <GuestTryHandoffScreen />}>
      <GuestHomeEntry lockEnabled={lockEnabled} />
    </Suspense>
  );
}
