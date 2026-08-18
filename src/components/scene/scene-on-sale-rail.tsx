'use client';

import Link from 'next/link';
import { Music } from 'lucide-react';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import type { DiscoverDrop } from '@/lib/scene/discover-client';

/** Always-visible Scene rail so a song for sale is not mixed into Discover. */
export function SceneOnSaleRail({ drops }: { drops: DiscoverDrop[] }) {
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  if (!firstDropsOn) return null;
  const sale = drops.filter((d) => d.hasDropAudio && d.type === 'track').slice(0, 8);
  if (!sale.length) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/[0.08] p-3.5 sm:p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-code text-[9px] font-bold uppercase tracking-[0.28em] text-fuchsia-300">
          On sale · listen / buy
        </p>
        <Link
          href="/discover"
          className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-fuchsia-200/80 hover:text-fuchsia-100"
        >
          More →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sale.map((drop) => {
          return (
            <li key={drop.shareId}>
              <Link
                href={`/share/${drop.shareId}`}
                className="group flex items-center gap-3 rounded-xl border border-fuchsia-400/30 bg-black/35 px-3 py-2.5 transition-colors hover:border-fuchsia-300/60 hover:bg-fuchsia-500/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200">
                  <Music className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{drop.title}</span>
                  <span className="block truncate font-code text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {drop.ownerName}
                    {drop.dropPriceSummary ? ` · ${drop.dropPriceSummary}` : ''}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-fuchsia-400 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-black group-hover:bg-fuchsia-300">
                  Listen
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
