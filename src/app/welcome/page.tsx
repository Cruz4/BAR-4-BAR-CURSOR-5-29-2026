'use client';

import React, { Suspense } from 'react';
import { PublicHomeLanding } from '@/components/marketing/public-home-landing';
import { SocialRefSignupRedirect } from '@/components/marketing/social-ref-signup-redirect';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Marketing landing — reachable when guest try sheet is the default home. */
function WelcomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  if (loading || user) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return (
    <Suspense fallback={<StudioLoader size="lg" fullscreen />}>
      <SocialRefSignupRedirect>
        <PublicHomeLanding />
      </SocialRefSignupRedirect>
    </Suspense>
  );
}

export default function WelcomePage() {
  return <WelcomeContent />;
}
