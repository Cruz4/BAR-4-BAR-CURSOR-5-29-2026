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
import { isLockEnabled, LOCK_HOUSE_PATH } from '@/lib/lock-feature';
import { SCENE_HOME_ENABLED } from '@/lib/scene-home';

function GuestHomeEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockOn = isLockEnabled();
  const guestTry = isGuestTrySheetEnabled();

  // Priority: LOCK (if on) → guest try (if on) → PublicHomeLanding
  useEffect(() => {
    const qs = searchParams.toString();
    if (lockOn) {
      router.replace(qs ? `${LOCK_HOUSE_PATH}?${qs}` : LOCK_HOUSE_PATH);
      return;
    }
    if (!guestTry) return;
    router.replace(qs ? `${GUEST_TRY_PATH}?${qs}` : GUEST_TRY_PATH);
  }, [lockOn, guestTry, router, searchParams]);

  if (lockOn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-background text-foreground font-code">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Opening LOCK</p>
        <p className="text-[11px] text-muted-foreground">Finish the bar.</p>
      </div>
    );
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

export function HomePage() {
  const { user } = useAuth();
  if (user) {
    // Scene home pivot — flip SCENE_HOME_ENABLED off to restore the Vault at /.
    return SCENE_HOME_ENABLED ? <SceneHome /> : <AlbumList />;
  }
  return (
    <Suspense fallback={<GuestTryHandoffScreen />}>
      <GuestHomeEntry />
    </Suspense>
  );
}
