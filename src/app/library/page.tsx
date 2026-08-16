'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Library, LogIn, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { auth } from '@/lib/firebase/client/firebase';
import { centsToUsdLabel, type DropLibraryEntry } from '@/lib/drop-commerce';
import { format } from 'date-fns';

export default function DropLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const { enabled: firstDropsOn, loading: featureLoading } = useFirstDropsFeature();
  const [items, setItems] = useState<DropLibraryEntry[]>([]);
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
    return <StudioLoader size="lg" fullscreen message="Opening your library..." />;
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
            <h1 className="font-headline text-3xl font-bold uppercase">Your library</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to stream First Drops you bought or unlocked.
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
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Bar 4 Bar First Drops</p>
          <h1 className="font-headline text-4xl font-bold uppercase">Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Songs and albums you unlocked. Stream them on their drop pages.
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center space-y-3">
              <Music className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Nothing here yet. Open a live DNA Drop with audio and buy or unlock it.
              </p>
              <Button variant="outline" asChild>
                <Link href="/">Back to The Scene</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.shareId}>
                <Link
                  href={`/share/${item.shareId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-card/80 p-4 hover:border-primary/50"
                >
                  <div className="min-w-0">
                    <p className="font-headline font-bold uppercase truncate">{item.title}</p>
                    <p className="text-[10px] font-code uppercase text-muted-foreground">
                      {item.scope} · {item.free ? 'Free' : centsToUsdLabel(item.amountCents)}
                      {item.purchasedAt
                        ? ` · ${format(new Date(item.purchasedAt), 'MMM d, yyyy')}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-primary shrink-0">Stream</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
