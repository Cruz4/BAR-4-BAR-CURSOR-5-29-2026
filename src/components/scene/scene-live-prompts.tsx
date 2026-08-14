'use client';

/**
 * Scene pins for admin-togglable house bar of the day + weekly public challenge.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarRange, Flame, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGamification } from '@/context/gamification-context';
import { useLockFeature } from '@/hooks/use-lock-feature';
import { getLastWorkedTrackPath } from '@/lib/studio-tips-session';
import { VAULT_PATH } from '@/lib/scene-home';
import { LOCK_HOUSE_PATH } from '@/lib/lock-feature';
import { getChallengeProgress, WEEKLY_CHALLENGES } from '@/lib/gamification/challenges';
import {
  DEFAULT_HOUSE_BAR,
  DEFAULT_WEEKLY_CHALLENGE,
  type SceneLivePublic,
} from '@/lib/scene/live-events';
import { cn } from '@/lib/utils';

async function fetchSceneLive(): Promise<SceneLivePublic> {
  try {
    const res = await fetch('/api/scene/live', { cache: 'no-store' });
    if (!res.ok) {
      return { houseBar: DEFAULT_HOUSE_BAR, weeklyChallenge: DEFAULT_WEEKLY_CHALLENGE };
    }
    const data = (await res.json()) as Partial<SceneLivePublic>;
    return {
      houseBar: { ...DEFAULT_HOUSE_BAR, ...data.houseBar },
      weeklyChallenge: { ...DEFAULT_WEEKLY_CHALLENGE, ...data.weeklyChallenge },
    };
  } catch {
    return { houseBar: DEFAULT_HOUSE_BAR, weeklyChallenge: DEFAULT_WEEKLY_CHALLENGE };
  }
}

export function SceneLivePrompts({ className }: { className?: string }) {
  const { summary } = useGamification();
  const { enabled: lockOn } = useLockFeature();
  const [live, setLive] = useState<SceneLivePublic | null>(null);
  const writeHref = getLastWorkedTrackPath() || `${VAULT_PATH}?create=track`;

  useEffect(() => {
    let cancelled = false;
    void fetchSceneLive().then((data) => {
      if (!cancelled) setLive(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!live) return null;

  const houseOn = live.houseBar.enabled && live.houseBar.seedBar.trim().length > 0;
  const weeklyOn = live.weeklyChallenge.enabled;
  if (!houseOn && !weeklyOn) return null;

  const barsChallenge = WEEKLY_CHALLENGES.find((c) => c.id === 'bars_8');
  const written = barsChallenge
    ? getChallengeProgress(summary, barsChallenge)
    : 0;
  const target = Math.max(1, live.weeklyChallenge.targetBars);
  const pct = Math.min(100, Math.round((written / target) * 100));

  return (
    <div className={cn('space-y-3', className)}>
      {houseOn ? (
        <Card className="relative overflow-hidden border border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-500/10 via-card/90 to-card/70 p-4 sm:p-5">
          <p className="flex items-center gap-2 font-code text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300">
            <Radio className="h-3.5 w-3.5" />
            {live.houseBar.title || 'House bar of the day'}
          </p>
          <p className="mt-2 text-sm leading-snug text-foreground/95">“{live.houseBar.seedBar}”</p>
          <div className="mt-3">
            <Button asChild size="sm" className="h-8 font-bold uppercase tracking-wider">
              <Link href={lockOn ? LOCK_HOUSE_PATH : writeHref}>
                {lockOn ? 'Answer this bar' : 'Write the next line'}
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {weeklyOn ? (
        <Card className="relative overflow-hidden border border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-card/90 to-card/70 p-4 sm:p-5">
          <p className="flex items-center gap-2 font-code text-[9px] font-bold uppercase tracking-[0.28em] text-amber-300">
            <CalendarRange className="h-3.5 w-3.5" />
            This week
          </p>
          <h2 className="mt-1.5 font-headline text-lg font-bold uppercase tracking-tight">
            {live.weeklyChallenge.title}
          </h2>
          {live.weeklyChallenge.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{live.weeklyChallenge.description}</p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-code text-[11px] font-bold tabular-nums text-amber-200">
              {written} / {target} bars
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Resets Monday
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-amber-400/90"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="h-8 font-bold uppercase tracking-wider">
              <Link href={writeHref}>Keep writing</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 font-bold uppercase tracking-wider">
              <Link href="/studio-progress">Studio Progress</Link>
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
