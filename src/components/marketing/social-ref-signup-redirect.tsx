'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { captureMarketingRefFromUrl, isSocialMarketingRef } from '@/lib/marketing-attribution';
import { buildLoginUrl } from '@/lib/login-links';
import { StudioLoader } from '@/components/studio-loader';

/**
 * Social/ad ?ref= links on `/` go straight to signup — no landing detour.
 * Organic visitors without ?ref= still see the full marketing landing page.
 */
export function SocialRefSignupRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');
  const isSocialRef = isSocialMarketingRef(refParam);

  useEffect(() => {
    if (!isSocialRef) return;
    captureMarketingRefFromUrl();
    router.replace(
      buildLoginUrl({
        mode: 'signup',
        marketingRef: refParam,
      })
    );
  }, [isSocialRef, refParam, router]);

  if (isSocialRef) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <StudioLoader size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
