'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Globe2, Loader2, MapPin, Clock3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ReachAnalyticsResponse } from '@/lib/reach-analytics-types';
import { compactReachCount } from '@/lib/profile-view-client';
import { cn } from '@/lib/utils';

type ReachAnalyticsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  load: (days: number) => Promise<ReachAnalyticsResponse | null>;
};

export function ReachAnalyticsDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  load,
}: ReachAnalyticsDialogProps) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ReachAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const allTime = days === 0;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load(days));
    } finally {
      setLoading(false);
    }
  }, [days, load]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    void refresh();
  }, [open, refresh]);

  const maxDay = Math.max(1, ...(data?.timeline.map((row) => row.count) || []));
  const maxHour = Math.max(1, ...(data?.hoursUtc.map((row) => row.count) || []));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-lg overflow-y-auto border-cyan-500/20 bg-background/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-lg">
            <Globe2 className="h-5 w-5 text-cyan-400" />
            {title}
          </DialogTitle>
          {subtitle ? (
            <DialogDescription className="text-left text-xs">{subtitle}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((window) => (
            <Button
              key={window}
              type="button"
              size="sm"
              variant={days === window ? 'default' : 'outline'}
              className="h-8 text-[10px] font-bold uppercase"
              onClick={() => setDays(window)}
            >
              {window}d
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={allTime ? 'default' : 'outline'}
            className="h-8 text-[10px] font-bold uppercase"
            onClick={() => setDays(0)}
          >
            All time
          </Button>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : data ? (
          <div className={cn('space-y-5 text-sm', loading && 'pointer-events-none opacity-60')}>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Updating…
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Unique {data.kind === 'profile' ? 'people' : 'landings'}
                </p>
                <p className="mt-1 font-headline text-2xl">{compactReachCount(data.uniqueLandings)}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">All time · each person once</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {allTime
                    ? data.kind === 'profile'
                      ? 'Total wall opens'
                      : 'All-time landings'
                    : `Last ${days} days`}
                </p>
                <p className="mt-1 font-headline text-2xl">{data.periodLandings.toLocaleString()}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {allTime && data.kind === 'profile'
                    ? 'Every post open on your wall (all time)'
                    : data.kind === 'profile'
                      ? 'Geo-tagged Artist Home landings in this window'
                      : 'Unique landings in this window'}
                </p>
              </div>
            </div>

            {data.note ? (
              <p className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-100/90">
                {data.note}
              </p>
            ) : null}

            {typeof data.legacyPageLoads === 'number' && data.legacyPageLoads > data.uniqueLandings ? (
              <p className="text-[11px] text-muted-foreground">
                Legacy page-load counter (includes repeats):{' '}
                <span className="font-bold text-foreground">{data.legacyPageLoads.toLocaleString()}</span>
                {typeof data.imports === 'number' ? (
                  <>
                    {' · '}
                    Imports: <span className="font-bold text-foreground">{data.imports.toLocaleString()}</span>
                  </>
                ) : null}
              </p>
            ) : null}

            {data.places.length > 0 ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200/90">
                  <MapPin className="h-3.5 w-3.5" /> Top areas
                </h3>
                <ul className="space-y-1.5">
                  {data.places.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate">{row.label}</span>
                      <span className="shrink-0 font-bold tabular-nums">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.hoursUtc.some((row) => row.count > 0) ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200/90">
                  <Clock3 className="h-3.5 w-3.5" /> Peak hours (UTC)
                </h3>
                <div className="flex items-end gap-0.5 h-16">
                  {data.hoursUtc.map((row) => (
                    <div
                      key={row.hourUtc}
                      className="flex-1 rounded-t bg-cyan-500/35"
                      style={{ height: `${Math.max(8, (row.count / maxHour) * 100)}%` }}
                      title={`${row.hourUtc}:00 UTC — ${row.count}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Bars show when people opened (UTC clock).</p>
              </section>
            ) : null}

            {data.referrers.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Referrers
                </h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {data.referrers.map((row) => (
                    <li key={row.host} className="flex justify-between gap-2">
                      <span className="truncate">{row.host}</span>
                      <span className="font-bold text-foreground">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.timeline.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Daily{allTime ? ' (all time)' : ''}
                </h3>
                <ul className="space-y-1">
                  {(allTime ? data.timeline : data.timeline.slice(-14)).map((row) => (
                    <li key={row.day} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-muted-foreground">
                        {format(parseISO(`${row.day}T12:00:00`), 'MMM d')}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/40">
                        <div
                          className={cn('h-full rounded-full bg-fuchsia-500/60')}
                          style={{ width: `${Math.max(4, (row.count / maxDay) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-bold tabular-nums">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.recent.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Recent
                </h3>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
                  {data.recent.slice(0, 20).map((row, index) => (
                    <li key={`${row.at}-${index}`} className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                      <span>{row.place}</span>
                      <span className="tabular-nums">
                        {format(parseISO(row.at), 'MMM d · h:mm a')}
                        {row.referrer ? ` · ${row.referrer}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.periodLandings === 0 && data.places.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                No geo-tagged visits in this window yet. New landings will show city/region after the next unique visitor.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Could not load reach data.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
