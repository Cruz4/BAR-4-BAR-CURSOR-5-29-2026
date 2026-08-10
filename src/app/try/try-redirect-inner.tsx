'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GuestTryHandoffScreen } from '@/components/guest-try-handoff-screen';
import { StudioLoader } from '@/components/studio-loader';
import { GUEST_TRY_PATH, isGuestTrySheetEnabled } from '@/lib/guest-try';
import { vaultHref } from '@/lib/scene-home';
import { useAuth } from '@/hooks/use-auth';

/** Short URL → real guest track editor (or vault / welcome depending on flag + auth). */
export default function TryRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const qs = searchParams.toString();
    const suffix = qs ? `?${qs}` : '';
    if (user) {
      // Guest-try handoff logic lives on the Vault surface.
      router.replace(qs ? `${vaultHref()}?${qs}` : vaultHref());
      return;
    }
    if (!isGuestTrySheetEnabled()) {
      router.replace(qs ? `/?${qs}` : '/');
      return;
    }
    router.replace(`${GUEST_TRY_PATH}${suffix}`);
  }, [loading, user, router, searchParams]);

  if (!user && isGuestTrySheetEnabled()) {
    return <GuestTryHandoffScreen />;
  }

  return <StudioLoader size="lg" fullscreen />;
}
