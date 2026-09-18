'use client';

import Link from 'next/link';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';

type ShareArtistLinkProps = {
  name: string;
  slug?: string | null;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
  /** When false, only the artist name is shown (still clickable when slug exists). */
  showLabel?: boolean;
};

/** Clickable original artist credit on public share / DNA pages. */
export function ShareArtistLink({
  name,
  slug,
  className,
  label = 'Original artist',
  size = 'md',
  showLabel = true,
}: ShareArtistLinkProps) {
  const href = profileHref(slug);
  const textClass =
    size === 'sm'
      ? 'text-[9px] uppercase tracking-[0.16em]'
      : 'text-[10px] sm:text-[11px] uppercase tracking-[0.18em]';

  const nameEl = href ? (
    <Link
      href={href}
      className="font-bold text-fuchsia-200 transition-colors hover:text-fuchsia-100 hover:underline underline-offset-2"
    >
      {name}
    </Link>
  ) : (
    <span className="font-bold text-fuchsia-200/90">{name}</span>
  );

  if (!showLabel) {
    return (
      <span className={cn('font-code', textClass, className)}>
        {nameEl}
      </span>
    );
  }

  return (
    <p className={cn('font-code text-muted-foreground', textClass, className)}>
      <span className="text-muted-foreground/80">{label}</span>
      <span aria-hidden className="mx-1.5 text-muted-foreground/50">·</span>
      {nameEl}
    </p>
  );
}
