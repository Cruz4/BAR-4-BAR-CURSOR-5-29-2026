'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE, BRAND_ARIA_LABEL } from '@/lib/brand';

/** Canonical brand-home for the nav logo everywhere (Pressing / Scene). */
export const BRAND_HOME_HREF = '/';

type BrandLockupProps = {
  variant?: 'app' | 'marketing';
  /** Lyrics sheet phone nav — logo mark only, no wordmark overlap. */
  compact?: boolean;
  className?: string;
  /** Defaults to the shared brand home (`/`). */
  linkHref?: string;
  titleTag?: 'span' | 'h1';
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function scrollPageTop() {
  const main = document.querySelector('main');
  if (main && 'scrollTo' in main) {
    (main as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function BrandLockup({
  variant = 'app',
  compact = false,
  className,
  linkHref = BRAND_HOME_HREF,
  titleTag = 'span',
  onLinkClick,
}: BrandLockupProps) {
  const pathname = usePathname();
  const isMarketing = variant === 'marketing';
  const TitleTag = titleTag;
  const targetPath = linkHref.split('?')[0] || BRAND_HOME_HREF;

  const content = (
    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
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
          compact ? 'hidden sm:flex' : isMarketing ? 'hidden sm:flex' : 'flex'
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

  return (
    <Link
      href={linkHref}
      onClick={(e) => {
        onLinkClick?.(e);
        if (e.defaultPrevented) return;
        // Same route: still give feedback by scrolling home to the top.
        if (pathname === targetPath) {
          e.preventDefault();
          scrollPageTop();
        }
      }}
      className={cn('group flex min-w-0 max-w-full', className)}
      aria-label={BRAND_ARIA_LABEL}
    >
      {content}
    </Link>
  );
}
