'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { captureMarketingRefFromUrl, isSocialMarketingRef } from '@/lib/marketing-attribution';
import { buildLoginUrl } from '@/lib/login-links';
import { getOrCreateGuestIdentity } from '@/lib/guest-identity';
import { StudioLoader } from '@/components/studio-loader';

/**
 * Social/ad ?ref= links on `/welcome` go straight to signup — no landing detour.
 * Organic visitors without ?ref= still see the full marketing landing page.
 * Note: when guest try sheet is ON, `/` redirects to the real editor instead;
 * this redirect only applies on `/welcome`.
 */
export function SocialRefSignupRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');
  const isSocialRef = isSocialMarketingRef(refParam);

  useEffect(() => {
    if (!isSocialRef) return;
    captureMarketingRefFromUrl();
    // Mint guest alias before signup so Telegram can link visit → conversion.
    getOrCreateGuestIdentity();
    router.replace(
      buildLoginUrl({
        mode: 'signup',
        marketingRef: refParam,
      })
    );
  }, [isSocialRef, refParam, router]);

  if (isSocialRef) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return <>{children}</>;
}
