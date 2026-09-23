'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ArtistHomeVisibilityDialog } from '@/components/profile/artist-home-visibility-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { buildLoginUrl } from '@/lib/login-links';

type ArtistHomeEngagementContextValue = {
  /** Opens the Artist Home visibility dialog (engage copy). */
  promptGoLive: () => void;
  profileLive: boolean;
  profileLoading: boolean;
};

const ArtistHomeEngagementContext = createContext<ArtistHomeEngagementContextValue | null>(null);

export function ArtistHomeEngagementProvider({ children }: { children: React.ReactNode }) {
  const { summary, loading: profileLoading } = useGamification();
  const [engageOpen, setEngageOpen] = useState(false);

  const profileLive = Boolean(summary.publicProfile && summary.profileSlug);

  const promptGoLive = useCallback(() => {
    setEngageOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      promptGoLive,
      profileLive,
      profileLoading,
    }),
    [promptGoLive, profileLive, profileLoading]
  );

  return (
    <ArtistHomeEngagementContext.Provider value={value}>
      {children}
      <ArtistHomeVisibilityDialog open={engageOpen} onOpenChange={setEngageOpen} variant="engage" />
    </ArtistHomeEngagementContext.Provider>
  );
}

export function useArtistHomeEngagementGate() {
  const ctx = useContext(ArtistHomeEngagementContext);
  const { user, authReady, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const profileLive = ctx?.profileLive ?? false;
  const profileLoading = ctx?.profileLoading ?? true;

  /**
   * Returns true when the viewer may perform a public social interaction.
   * Redirects guests to login/signup; prompts signed-in artists to go live.
   */
  const ensureEngagement = useCallback(
    (opts?: { next?: string; intent?: string }): boolean => {
      if (authLoading || !authReady) return false;
      if (!user) {
        router.push(
          buildLoginUrl({
            mode: 'signup',
            next: opts?.next ?? pathname,
            intent: opts?.intent ?? 'engage',
          })
        );
        return false;
      }
      if (profileLoading) return false;
      if (!profileLive) {
        ctx?.promptGoLive();
        return false;
      }
      return true;
    },
    [authLoading, authReady, user, profileLoading, profileLive, ctx, router, pathname]
  );

  return { ensureEngagement, profileLive, profileLoading, promptGoLive: ctx?.promptGoLive };
}
