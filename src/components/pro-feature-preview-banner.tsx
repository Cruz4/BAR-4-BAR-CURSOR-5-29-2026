'use client';

import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  getProFeaturePreviewHoursRemaining,
  isProFeaturePreviewActive,
  isProUser,
} from '@/lib/subscription';
import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';
import {
  BANNER_CHROME_ICON,
  BANNER_CHROME_ROW,
  BANNER_PRIMARY_BTN,
  BANNER_PRIMARY_COL,
} from '@/components/banner-chrome';

const DISMISS_KEY = 'b4b-pro-preview-banner-dismissed';

export function ProFeaturePreviewBanner({ className }: { className?: string }) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  if (!user || isProUser(user) || dismissed || !isProFeaturePreviewActive(user)) {
    return null;
  }

  const hoursLeft = getProFeaturePreviewHoursRemaining(user);
  const timeLabel =
    hoursLeft === null
      ? 'active'
      : hoursLeft <= 1
        ? 'under 1 hour left'
        : `${hoursLeft}h left`;

  return (
    <div
      data-app-chrome
      className={cn(
        BANNER_CHROME_ROW,
        'grid-cols-[1rem_minmax(5.75rem,5.75rem)_minmax(0,1fr)_auto] border-b border-pink-500/35 bg-pink-100/80 dark:bg-pink-600/10',
        className
      )}
    >
      <Sparkles className={cn(BANNER_CHROME_ICON, 'text-pink-600 dark:text-pink-400')} aria-hidden />
      <Link
        href="/usage?tab=cloud"
        className={cn(
          BANNER_PRIMARY_BTN,
          BANNER_PRIMARY_COL,
          'bg-pink-600/15 border border-pink-600/35 text-pink-900 dark:bg-pink-500/20 dark:border-pink-500/40 dark:text-pink-200 hover:bg-pink-600/25 hover:text-pink-950 dark:hover:bg-pink-500/30 dark:hover:text-white'
        )}
      >
        Go Pro
      </Link>
      <p className="text-[10px] sm:text-[11px] font-code text-pink-950/90 dark:text-pink-100/90 min-w-0 sm:pr-[min(21rem,calc(3%+19rem))]">
        <span className="font-bold uppercase tracking-widest text-pink-800 dark:text-pink-300">Pro preview · {timeLabel}</span>
        {' — '}
        Extra tools are on. Still {FREE_TRACK_LIMIT} tracks / {FREE_ALBUM_LIMIT} album.
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground shrink-0 justify-self-end p-1"
        aria-label="Dismiss Pro preview banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
