'use client';

/**
 * Full Discover stream — newest public Scene activity beyond the home strip.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { SceneDiscoverCard } from '@/components/scene/scene-discover-card';
import { useAuth } from '@/hooks/use-auth';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import { fetchBlockedUsers } from '@/lib/profile/social-client';
import {
  buildDiscoverCards,
  DISCOVER_ALL_MAX_CARDS,
  fetchDiscover,
  type DiscoverCard,
  type DiscoverData,
} from '@/lib/scene/discover-client';

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const [discover, setDiscover] = useState<DiscoverData | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [viewerSlug, setViewerSlug] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [data, blocks] = await Promise.all([
          fetchDiscover(user?.id, { view: 'all' }),
          user?.id ? fetchBlockedUsers().catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setDiscover(data);
        setBlockedIds(new Set(blocks.map((b) => b.blockedUserId)));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    if (user?.id) {
      void fetchGamificationSummary(user.id).then((s) => {
        if (s?.profileSlug) setViewerSlug(s.profileSlug);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const cards: DiscoverCard[] = useMemo(() => {
    if (!discover) return [];
    return buildDiscoverCards(discover, {
      excludeUserIds: blockedIds,
      maxCards: DISCOVER_ALL_MAX_CARDS,
    });
  }, [discover, blockedIds]);

  if (authLoading || !loaded) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 font-bold uppercase" asChild>
          <Link href="/">
            <ChevronLeft className="h-3.5 w-3.5" /> The Scene
          </Link>
        </Button>
        <div className="flex items-end gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">
              Discover
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Newest public posts, live DNA Drops, and Artist Homes — newest first
            </p>
          </div>
        </div>
      </header>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Quiet out there — check back when more artists go live.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <SceneDiscoverCard
              key={card.key}
              card={card}
              viewerSlug={viewerSlug}
              onLockRemoved={(lockId) => {
                setDiscover((prev) =>
                  prev
                    ? { ...prev, locks: prev.locks.filter((l) => l.id !== lockId) }
                    : prev
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
