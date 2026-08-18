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
import { auth } from '@/lib/firebase/client/firebase';
import type { DropLibraryItem } from '@/lib/drop-library';

export default function DropLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const { enabled: firstDropsOn, loading: featureLoading } = useFirstDropsFeature();
  const [items, setItems] = useState<DropLibraryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!firstDropsOn) {
      setLoaded(true);
      return;
    }
    if (!user?.id) {
      setLoaded(!authLoading);
      return;
    }
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/drops/library?userId=${encodeURIComponent(user.id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.items)) setItems(data.items);
      } finally {
        setLoaded(true);
      }
    })();
  }, [user?.id, authLoading, firstDropsOn]);

  if (authLoading || featureLoading || !loaded) {
    return <StudioLoader size="lg" fullscreen message="Cueing The Deck..." />;
  }

  if (!firstDropsOn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center border-2">
          <CardContent className="p-8 space-y-4">
            <Library className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="font-headline text-3xl font-bold uppercase">Library is off</h1>
            <p className="text-sm text-muted-foreground">
              First Drops is currently turned off. DNA Drops still work. Purchases stay saved if this comes back.
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
            <h1 className="font-headline text-3xl font-bold uppercase">The Deck</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to spin songs you pressed, plus First Drops you bought or unlocked.
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
      <DropDeck userId={user.id} items={items} />
    </div>
  );
}
