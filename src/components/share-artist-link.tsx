'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Hint } from '@/components/ui/tooltip';
import { useLiveArtistHomeSlug } from '@/components/profile/artist-home-link';
import { cn } from '@/lib/utils';

type ShareArtistLinkProps = {
  name: string;
  slug?: string | null;
  /** Prefer live slug lookup by account — works when baked slugs are stale. */
  userId?: string | null;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
  /** When false, only the artist name is shown (still clickable when live). */
  showLabel?: boolean;
  /** Plain text only — use inside another link to avoid nested `<a>`. */
  disableLink?: boolean;
};

const OFFLINE_HINT = 'Artist Home offline';

/** Clickable original artist credit on public share / DNA pages. */
export function ShareArtistLink({
  name,
  slug,
  userId,
  className,
  label = 'Original artist',
  size = 'md',
  showLabel = true,
  disableLink = false,
}: ShareArtistLinkProps) {
  const { href, resolved, isLive } = useLiveArtistHomeSlug(
    disableLink ? null : userId,
    disableLink ? null : slug
  );
  const textClass =
    size === 'sm'
      ? 'text-[9px] uppercase tracking-[0.16em]'
      : 'text-[10px] sm:text-[11px] uppercase tracking-[0.18em]';

  const nameClass = 'font-bold text-fuchsia-200 transition-colors hover:text-fuchsia-100 hover:underline underline-offset-2';

  let nameEl: ReactNode;
  if (disableLink || (!userId?.trim() && !slug?.trim())) {
    nameEl = <span className="font-bold text-fuchsia-200/90">{name}</span>;
  } else if (!resolved) {
    nameEl = <span className="font-bold text-fuchsia-200/90">{name}</span>;
  } else if (isLive && href) {
    nameEl = (
      <Link href={href} className={nameClass}>
        {name}
      </Link>
    );
  } else {
    nameEl = (
      <Hint content={OFFLINE_HINT} side="top" skipOnTouch={false}>
        <span
          className="cursor-default font-bold text-fuchsia-200/90"
          tabIndex={0}
          role="text"
          aria-label={`${name} — ${OFFLINE_HINT}`}
        >
          {name}
        </span>
      </Hint>
    );
  }

  if (!showLabel) {
    return <span className={cn('font-code', textClass, className)}>{nameEl}</span>;
  }

  return (
    <p className={cn('font-code text-muted-foreground', textClass, className)}>
      <span className="text-muted-foreground/80">{label}</span>
      <span aria-hidden className="mx-1.5 text-muted-foreground/50">
        ·
      </span>
      {nameEl}
    </p>
  );
}
