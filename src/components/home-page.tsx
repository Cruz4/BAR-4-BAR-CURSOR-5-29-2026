'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlbumList } from '@/components/album-list';
import { PublicHomeLanding } from '@/components/marketing/public-home-landing';
import { SocialRefSignupRedirect } from '@/components/marketing/social-ref-signup-redirect';
import { useAuth } from '@/hooks/use-auth';
import { StudioLoader } from '@/components/studio-loader';
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <StudioLoader size="lg" />
      </div>
    );
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <StudioLoader size="lg" />
        </div>
      }
    >
      <GuestHomeEntry />
    </Suspense>
  );
}
