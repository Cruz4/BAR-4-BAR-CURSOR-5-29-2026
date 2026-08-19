'use client';

/**
 * Booth memory — last unfinished sheet, shown on The Scene so the room
 * is never "nothing to do" even when the feed is quiet.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { fetchCraftResume } from '@/lib/activity/client';
import {
  dismissBoothMemory,
  readLocalBoothMemory,
  snippetBarText,
  visibleBoothMemory,
  type BoothMemory,
} from '@/lib/scene/booth-memory';
import { getLastWorkedTrackPath } from '@/lib/studio-tips-session';
import { SCENE_BOOTH_MEMORY_ID } from '@/lib/scene-home';
import { cn } from '@/lib/utils';

function fallbackMemory(): BoothMemory | null {
  const local = readLocalBoothMemory();
  if (local) return visibleBoothMemory(local);
  const path = getLastWorkedTrackPath();
  if (!path) return null;
  return visibleBoothMemory({
    trackPath: path,
    trackTitle: 'Untitled',
    barCount: 0,
    updatedAt: new Date(0).toISOString(),
  });
}

export function SceneBoothMemoryCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const [memory, setMemory] = useState<BoothMemory | null>(() => fallbackMemory());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void fetchCraftResume().then((next) => {
      if (cancelled) return;
      setMemory(next ?? fallbackMemory());
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || !memory) return null;

  const line = snippetBarText(memory.lastBarText);
  const barsLabel =
    memory.barCount > 0
      ? `${memory.barCount} ${memory.barCount === 1 ? 'bar' : 'bars'}`
      : 'blank sheet';

  return (
    <Card
      id={SCENE_BOOTH_MEMORY_ID}
      className={cn(
        'relative overflow-hidden border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card/90 to-card/70 px-3 py-2',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1.5 top-1.5 h-6 w-6 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        aria-label="Close booth memory"
        onClick={() => {
          dismissBoothMemory(memory);
          setMemory(null);
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <p className="flex items-center gap-1.5 pr-8 font-code text-[9px] font-bold uppercase tracking-[0.28em] text-sky-300">
        <Mic2 className="h-3 w-3" />
        Booth memory
      </p>
      <div className="mt-1 flex items-center justify-between gap-3 pr-1">
        <div className="min-w-0">
          <p className="text-[13px] leading-snug text-foreground/95">
            You left <span className="font-semibold">{memory.trackTitle}</span>{' '}
            <span className="text-muted-foreground">
              &middot; {barsLabel}
              {memory.albumTitle ? ` \u00b7 ${memory.albumTitle}` : ''}
            </span>
          </p>
          {line ? (
            <p className="mt-0.5 truncate text-[12px] italic text-muted-foreground">
              &ldquo;{line}&rdquo;
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-muted-foreground">The sheet is still on the desk.</p>
          )}
        </div>
        <Button asChild size="sm" className="h-7 shrink-0 px-3 font-bold uppercase tracking-wider">
          <Link href={memory.trackPath}>{line ? 'Finish this bar' : 'Open the sheet'}</Link>
        </Button>
      </div>
    </Card>
  );
}
