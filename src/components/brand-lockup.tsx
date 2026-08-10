'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE, BRAND_ARIA_LABEL } from '@/lib/brand';

type BrandLockupProps = {
  variant?: 'app' | 'marketing';
  className?: string;
  linkHref?: string;
  titleTag?: 'span' | 'h1';
  /** Optional click (e.g. scroll-to-top when already on home). */
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function BrandLockup({
  variant = 'app',
  className,
  linkHref,
  titleTag = 'span',
  onLinkClick,
}: BrandLockupProps) {
  const isMarketing = variant === 'marketing';
  const TitleTag = titleTag;

  const content = (
    <div className={cn('flex min-w-0 items-center gap-2 sm:gap-4', !linkHref && className)}>
      <div
        className={cn(
          'shrink-0 overflow-hidden rounded-xl flex items-center justify-center',
          isMarketing
            ? 'h-9 w-9 bg-white p-1.5 shadow-2xl sm:h-10 sm:w-10'
            : 'h-9 w-9 border border-primary/20 bg-black p-0.5 sm:h-11 sm:w-11 group-hover:scale-110 transition-transform duration-300'
        )}
      >
        <img src="/Logo.png" alt="" className="h-full w-full object-contain" aria-hidden />
      </div>
      <div
        className={cn(
          'min-w-0 flex flex-col items-center text-center',
          isMarketing ? 'hidden sm:flex' : 'flex'
        )}
      >
        <TitleTag
          className={cn(
            'truncate font-headline font-bold leading-none tracking-tight',
            isMarketing
              ? 'text-lg uppercase tracking-tighter text-white sm:text-2xl'
              : 'text-base sm:text-lg md:text-xl'
          )}
        >
          {APP_NAME}
        </TitleTag>
        <p
          className={cn(
            'font-tagline -mt-0.5 truncate uppercase tracking-widest opacity-70 max-sm:hidden',
            isMarketing
              ? 'text-[7px] text-muted-foreground sm:text-[8px]'
              : 'text-[7px] text-muted-foreground md:text-[8px]'
          )}
        >
          {APP_TAGLINE}
        </p>
      </div>
    </div>
  );

  if (linkHref) {
    return (
      <Link
        href={linkHref}
        onClick={onLinkClick}
        className={cn('group flex min-w-0 max-w-full', className)}
        aria-label={BRAND_ARIA_LABEL}
      >
        {content}
      </Link>
    );
  }

  return content;
}
