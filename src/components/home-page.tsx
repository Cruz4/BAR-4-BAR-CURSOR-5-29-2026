'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlbumList } from '@/components/album-list';
import { PublicHomeLanding } from '@/components/marketing/public-home-landing';
import { SocialRefSignupRedirect } from '@/components/marketing/social-ref-signup-redirect';
import { GuestTryHandoffScreen } from '@/components/guest-try-handoff-screen';
import { useAuth } from '@/hooks/use-auth';
import { GUEST_TRY_PATH, isGuestTrySheetEnabled } from '@/lib/guest-try';

function GuestHomeEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guestTry = isGuestTrySheetEnabled();

  useEffect(() => {
    if (!guestTry) return;
    const qs = searchParams.toString();
    router.replace(qs ? `${GUEST_TRY_PATH}?${qs}` : GUEST_TRY_PATH);
  }, [guestTry, router, searchParams]);

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
  return user ? (
    <AlbumList />
  ) : (
    <Suspense fallback={<GuestTryHandoffScreen />}>
      <GuestHomeEntry />
    </Suspense>
  );
}
