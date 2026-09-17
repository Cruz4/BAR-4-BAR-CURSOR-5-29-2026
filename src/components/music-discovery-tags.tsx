import Link from 'next/link';
import { Gauge, Layers3, Music2, Waves } from 'lucide-react';
import { discoverySearchHref } from '@/lib/discovery-search';
import { albumHubHref } from '@/lib/pressed-song';
import type { PublicMusicMetadata } from '@/lib/music-discovery-metadata';
import { cn } from '@/lib/utils';

export function MusicDiscoveryTags({
  metadata,
  compact = false,
  soundAsText = false,
  hideAlbum = false,
  className,
}: {
  metadata?: PublicMusicMetadata | null;
  compact?: boolean;
  soundAsText?: boolean;
  hideAlbum?: boolean;
  className?: string;
}) {
  if (!metadata) return null;
  const hasDetails = Boolean(
    metadata.genreStyles.length ||
    metadata.moods.length ||
    metadata.bpm ||
    metadata.instrumentation ||
    (!hideAlbum && metadata.albumTitle)
  );
  if (!hasDetails) return null;
  const chipClass = cn(
    'inline-flex max-w-full items-center gap-1 rounded-full border bg-black/30 font-code font-bold uppercase tracking-wider transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60',
    compact ? 'px-2 py-1 text-[8px]' : 'px-2.5 py-1.5 text-[9px]'
  );
  return (
    <div className={cn('flex min-w-0 flex-wrap gap-1.5', className)} aria-label="Music categories">
      {metadata.genreStyles.map((genre) => (
        <Link
          key={`genre-${genre}`}
          href={discoverySearchHref({ resultKinds: ['drop'], genre })}
          className={cn(chipClass, 'border-fuchsia-400/30 text-fuchsia-200')}
          title={`Discover music tagged ${genre}`}
        >
          <Music2 className="h-3 w-3 shrink-0" /> Genre / style · {genre}
        </Link>
      ))}
      {metadata.moods.map((mood) => (
        <Link
          key={`mood-${mood}`}
          href={discoverySearchHref({ resultKinds: ['drop'], mood })}
          className={cn(chipClass, 'border-violet-400/30 text-violet-200')}
          title={`Discover ${mood} music`}
        >
          <Waves className="h-3 w-3 shrink-0" /> Mood · {mood}
        </Link>
      ))}
      {metadata.bpm ? (
        <Link
          href={discoverySearchHref({ resultKinds: ['drop'] }, `${metadata.bpm} BPM`)}
          className={cn(chipClass, 'border-sky-400/30 text-sky-200')}
          title={`Discover music around ${metadata.bpm} BPM`}
        >
          <Gauge className="h-3 w-3 shrink-0" /> {metadata.bpm} BPM
        </Link>
      ) : null}
      {!hideAlbum && metadata.albumTitle && metadata.albumShareId ? (
        <Link
          href={albumHubHref(metadata.albumShareId) || '#'}
          className={cn(chipClass, 'border-emerald-400/30 text-emerald-200')}
          title={`Open ${metadata.albumTitle}`}
        >
          <Layers3 className="h-3 w-3 shrink-0" /> Album · {metadata.albumTitle}
        </Link>
      ) : !hideAlbum && metadata.albumTitle ? (
        <span className={cn(chipClass, 'border-emerald-400/30 text-emerald-200')}>
          <Layers3 className="h-3 w-3 shrink-0" /> Album · {metadata.albumTitle}
        </span>
      ) : null}
      {!compact && metadata.instrumentation ? (
        soundAsText ? (
          <div className="flex w-full min-w-0 items-start gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left text-xs leading-relaxed text-white/75">
            <Waves className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="min-w-0 break-words"><strong className="mr-1 uppercase tracking-wider text-white">Sound</strong>{metadata.instrumentation}</span>
          </div>
        ) : (
          <Link
            href={discoverySearchHref({ resultKinds: ['drop'] }, metadata.instrumentation)}
            className="flex w-full min-w-0 items-start gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left text-xs leading-relaxed text-white/75 transition-colors hover:border-sky-300/30 hover:text-white"
            title="Discover music with a matching sound palette"
          >
            <Waves className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
            <span className="min-w-0 break-words"><strong className="mr-1 uppercase tracking-wider text-white">Sound</strong>{metadata.instrumentation}</span>
          </Link>
        )
      ) : null}
    </div>
  );
}
