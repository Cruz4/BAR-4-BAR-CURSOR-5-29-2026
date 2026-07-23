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
      className={cn(
        'shrink-0 border-b border-pink-500/35 bg-pink-100/80 dark:bg-pink-600/10 px-4 py-2 flex items-center gap-3 z-40',
        className
      )}
    >
      <Sparkles className="h-4 w-4 text-pink-600 dark:text-pink-400 shrink-0" aria-hidden />
      <p className="text-[10px] sm:text-[11px] font-code text-pink-950/90 dark:text-pink-100/90 flex-grow min-w-0">
        <span className="font-bold uppercase tracking-widest text-pink-800 dark:text-pink-300">Pro preview · {timeLabel}</span>
        {' — '}
        Vault saves, export, Performance &amp; DNA Drop unlocked. Still {FREE_TRACK_LIMIT} tracks /{' '}
        {FREE_ALBUM_LIMIT} album — Go Pro for unlimited catalog. Ink unchanged.
      </p>
      <Link
        href="/usage?tab=cloud"
        className="text-[9px] font-bold uppercase tracking-widest text-pink-800 hover:text-pink-950 dark:text-pink-200 dark:hover:text-white shrink-0"
      >
        Go Pro
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground shrink-0 p-1"
        aria-label="Dismiss Pro preview banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
