import Link from 'next/link';
import { MapPin, Music2, Sparkles, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { discoverySearchHref } from '@/lib/discovery-search';
import {
  collaborationLabel,
  publicIdentityLabel,
  type ArtistHomeSoundIdentity,
} from '@/lib/profile/sound-identity';

export function SoundIdentityStrip({
  identity,
  compact = false,
}: {
  identity?: ArtistHomeSoundIdentity | null;
  compact?: boolean;
}) {
  if (!identity) return null;
  const collaboration = collaborationLabel(identity.collaboration);
  return (
    <div
      data-profile-safe-check
      className={cn(
        'inline-flex w-fit max-w-full min-w-0 flex-col items-start gap-2 rounded-xl border border-[var(--ph-border)] bg-[var(--ph-plate)]/80',
        compact ? 'p-2.5' : 'p-3 sm:p-4'
      )}
    >
      {identity.kinds?.length ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {identity.kinds.map((kind) => (
            <Link
              key={kind}
              href={discoverySearchHref({ resultKinds: ['person'], identityKinds: [kind] })}
              title={`Discover ${publicIdentityLabel(kind)}s`}
              className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border border-[var(--ph-accent)]/35 bg-[var(--ph-accent)]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ph-accent)]"
            >
              <Music2 className="h-3 w-3 shrink-0" /> {publicIdentityLabel(kind)}
            </Link>
          ))}
        </div>
      ) : null}
      {identity.currentFocus ? (
        <Link
          href={discoverySearchHref({ resultKinds: ['person'] }, identity.currentFocus)}
          title="Discover people with a matching current focus"
          className="block max-w-full break-words text-xs font-medium leading-relaxed text-[var(--ph-text)] transition-colors hover:text-[var(--ph-accent)]"
        >
          <Sparkles className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-[var(--ph-accent2)]" />
          {identity.currentFocus}
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ph-muted)]">
        {identity.genres?.map((genre) => (
          <Link
            key={`genre-${genre}`}
            href={discoverySearchHref({ resultKinds: ['person'], genre })}
            className="break-words transition-colors hover:text-[var(--ph-accent)]"
            title={`Discover people tagged ${genre}`}
          >
            {genre}
          </Link>
        ))}
        {identity.moods?.map((mood) => (
          <Link
            key={`mood-${mood}`}
            href={discoverySearchHref({ resultKinds: ['person'], mood })}
            className="break-words text-[var(--ph-accent2)] transition-opacity hover:opacity-75"
            title={`Discover people tagged ${mood}`}
          >
            {mood}
          </Link>
        ))}
        {identity.region ? (
          <Link
            href={discoverySearchHref({ resultKinds: ['person'], region: identity.region })}
            className="inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-[var(--ph-accent)]"
            title={`Discover people in ${identity.region}`}
          >
            <MapPin className="h-3 w-3" />{identity.region}
          </Link>
        ) : null}
        {collaboration ? (
          <Link
            href={discoverySearchHref({ resultKinds: ['person'], collaboration: identity.collaboration })}
            className="inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-[var(--ph-accent)]"
            title={`Discover people who are ${collaboration.toLocaleLowerCase()}`}
          >
            <UsersRound className="h-3 w-3" />{collaboration}
          </Link>
        ) : null}
      </div>
      {identity.influences?.length ? (
        <div className="flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-1 break-words text-[9px] leading-relaxed text-[var(--ph-muted)]">
          <span className="font-bold uppercase tracking-wider">Influenced by</span>{' '}
          {identity.influences.map((influence) => (
            <Link
              key={influence}
              href={discoverySearchHref({ resultKinds: ['person'], influence })}
              className="transition-colors hover:text-[var(--ph-accent)]"
              title={`Discover people influenced by ${influence}`}
            >
              {influence}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
