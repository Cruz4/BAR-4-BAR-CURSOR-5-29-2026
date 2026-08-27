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
  snippetBarText,
  type BoothMemory,
} from '@/lib/scene/booth-memory';
import { SCENE_BOOTH_MEMORY_ID } from '@/lib/scene-home';
import { cn } from '@/lib/utils';

export function SceneBoothMemoryCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [memory, setMemory] = useState<BoothMemory | null>(null);

  useEffect(() => {
    setMemory(null);
    if (!userId) return;
    let cancelled = false;
    void fetchCraftResume(userId).then((next) => {
      if (cancelled) return;
      setMemory(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || !memory || memory.ownerId !== userId) return null;

  const line = snippetBarText(memory.lastBarText);
  const barsLabel =
    memory.barCount > 0
      ? `${memory.barCount} ${memory.barCount === 1 ? 'bar' : 'bars'}`
      : 'blank sheet';

  return (
    <Card
      id={SCENE_BOOTH_MEMORY_ID}
      className={cn(
        'relative overflow-hidden border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card/90 to-card/70 p-2',
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-[0.28em] text-sky-300">
            <Mic2 className="h-3 w-3" />
            Booth memory
          </p>
          <p className="text-[13px] leading-snug text-foreground/95">
            You left <span className="font-semibold">{memory.trackTitle}</span>{' '}
            <span className="text-muted-foreground">
              &middot; {barsLabel}
              {memory.albumTitle ? ` \u00b7 ${memory.albumTitle}` : ''}
            </span>
          </p>
          {line ? (
            <p className="truncate text-[12px] italic text-muted-foreground">
              &ldquo;{line}&rdquo;
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">The sheet is still on the desk.</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            aria-label="Close booth memory"
            onClick={() => {
              dismissBoothMemory(memory);
              setMemory(null);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
          <Button asChild size="sm" className="h-7 shrink-0 px-3 font-bold uppercase tracking-wider">
            <Link href={memory.trackPath}>{line ? 'Finish this bar' : 'Open the sheet'}</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
