'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Library, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StudioLoader } from '@/components/studio-loader';
import { DropDeck } from '@/components/library/drop-deck';
import { useAuth } from '@/hooks/use-auth';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import type { DropLibraryItem } from '@/lib/drop-library';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';
import type { PressingConfig } from '@/lib/profile/pressing';
import { isProOrTrial } from '@/lib/subscription';

export default function DropLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const { enabled: firstDropsOn, loading: featureLoading } = useFirstDropsFeature();
  const [items, setItems] = useState<DropLibraryItem[]>([]);
  const [pressing, setPressing] = useState<PressingConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!firstDropsOn) {
      setLoaded(true);
      return () => {
        cancelled = true;
      };
    }
    if (!user?.id) {
      setLoaded(!authLoading);
      return () => {
        cancelled = true;
      };
    }
    setLoaded(false);
    setPressing(null);
    void (async () => {
      try {
        const firebaseUser = await waitForAuthUser();
        if (cancelled || !firebaseUser || firebaseUser.uid !== user.id) return;
        const token = await firebaseUser.getIdToken(false);
        const headers: HeadersInit = { Authorization: `Bearer ${token}` };
        const [libraryResponse, profileResponse] = await Promise.all([
          fetch(`/api/drops/library?userId=${encodeURIComponent(user.id)}`, { headers }),
          fetch(`/api/profile/config?userId=${encodeURIComponent(user.id)}`, { headers }).catch(() => null),
        ]);
        const [libraryData, profileData] = await Promise.all([
          libraryResponse.json(),
          profileResponse?.ok ? profileResponse.json() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (libraryResponse.ok && Array.isArray(libraryData.items)) setItems(libraryData.items);
        if (profileData?.config) setPressing(normalizeArtistHomeConfig(profileData.config).theme);
      } catch (error) {
        if (!cancelled) console.warn('[library] authenticated load skipped', error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, firstDropsOn]);

  if (authLoading || featureLoading || !loaded) {
    return <StudioLoader size="lg" fullscreen message="Opening Library..." />;
  }

  if (!firstDropsOn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center border-2">
          <CardContent className="p-8 space-y-4">
            <Library className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="font-headline text-3xl font-bold uppercase">Library is off</h1>
            <p className="text-sm text-muted-foreground">
              Music releases are currently turned off. DNA lyric pages still work. Purchases stay saved if releases return.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Back to The Scene</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center border-2">
          <CardContent className="p-8 space-y-4">
            <Library className="h-10 w-10 text-primary mx-auto" />
            <h1 className="font-headline text-3xl font-bold uppercase">Library</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to spin songs you released, bought, or unlocked.
            </p>
            <Button asChild className="w-full font-bold">
              <Link href="/login?next=/library">
                <LogIn className="mr-2 h-4 w-4" /> Sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DropDeck userId={user.id} items={items} pressing={pressing} canDownloadOffline={isProOrTrial(user)} />
    </div>
  );
}
