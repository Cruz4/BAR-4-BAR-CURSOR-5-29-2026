'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';
import { SCENE_HOME_ENABLED } from '@/lib/scene-home';

const homeRouteFallback = (
  <div className="min-h-screen bg-background" aria-busy="true" />
);

const GuestPressingLanding = dynamic(
  () =>
    import('@/components/marketing/guest-pressing-landing').then((m) => ({
      default: m.GuestPressingLanding,
    })),
  { loading: () => homeRouteFallback }
);

const SceneHome = dynamic(
  () =>
    import('@/components/scene/scene-home').then((m) => ({
      default: m.SceneHome,
    })),
  { loading: () => homeRouteFallback }
);

const AlbumList = dynamic(
  () =>
    import('@/components/album-list').then((m) => ({
      default: m.AlbumList,
    })),
  { loading: () => homeRouteFallback }
);

const GuestPressingClaimBootstrap = dynamic(
  () =>
    import('@/components/profile/guest-pressing-claim-bootstrap').then((m) => ({
      default: m.GuestPressingClaimBootstrap,
    })),
  { ssr: false }
);

const ArtistHomeProspectClaimBootstrap = dynamic(
  () =>
    import('@/components/profile/artist-home-prospect-claim-bootstrap').then((m) => ({
      default: m.ArtistHomeProspectClaimBootstrap,
    })),
  { ssr: false }
);

type HomePageProps = {
  /** Kept for callers; finish-the-bar / try sheet no longer steal guest `/`. */
  lockEnabled?: boolean;
};

export function HomePage(_props: HomePageProps = {}) {
  const { user, loading } = useAuth();
  if (user) {
    return (
      <>
        {!SCENE_HOME_ENABLED ? <GuestPressingClaimBootstrap /> : null}
        <ArtistHomeProspectClaimBootstrap />
        {SCENE_HOME_ENABLED ? (
          <Suspense fallback={homeRouteFallback}>
            <SceneHome />
          </Suspense>
        ) : (
          <AlbumList />
        )}
      </>
    );
  }
  if (loading) {
    return homeRouteFallback;
  }
  return (
    <Suspense fallback={homeRouteFallback}>
      <GuestPressingLanding />
    </Suspense>
  );
}
