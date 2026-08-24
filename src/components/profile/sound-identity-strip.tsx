import { MapPin, Music2, Sparkles, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        'min-w-0 space-y-2 rounded-xl border border-[var(--ph-border)] bg-[var(--ph-plate)]/80',
        compact ? 'p-2.5' : 'max-w-2xl p-3 sm:p-4'
      )}
    >
      {identity.kinds?.length ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {identity.kinds.map((kind) => (
            <span
              key={kind}
              className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border border-[var(--ph-accent)]/35 bg-[var(--ph-accent)]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ph-accent)]"
            >
              <Music2 className="h-3 w-3 shrink-0" /> {publicIdentityLabel(kind)}
            </span>
          ))}
        </div>
      ) : null}
      {identity.currentFocus ? (
        <p className="break-words text-xs font-medium leading-relaxed text-[var(--ph-text)]">
          <Sparkles className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-[var(--ph-accent2)]" />
          {identity.currentFocus}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ph-muted)]">
        {identity.genres?.length ? <span className="break-words">{identity.genres.join(' · ')}</span> : null}
        {identity.moods?.length ? <span className="break-words text-[var(--ph-accent2)]">{identity.moods.join(' · ')}</span> : null}
        {identity.region ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><MapPin className="h-3 w-3" />{identity.region}</span>
        ) : null}
        {collaboration ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><UsersRound className="h-3 w-3" />{collaboration}</span>
        ) : null}
      </div>
      {identity.influences?.length ? (
        <p className="break-words text-[9px] leading-relaxed text-[var(--ph-muted)]">
          <span className="font-bold uppercase tracking-wider">Influenced by</span>{' '}
          {identity.influences.join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

