'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useOptionalDropPlayer } from '@/context/drop-player-context';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { shouldHideDropNowPlayingBar } from '@/components/library/drop-now-playing-bar';
import { isTrackLyricSheetPath } from '@/lib/studio-theme';
import { cn } from '@/lib/utils';

/** Always-on corner link to the Studio 4000 landing page. A plain anchor, because that route is static HTML. */
export function Studio4000Link() {
  const pathname = usePathname() || '';
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const dropPlayer = useOptionalDropPlayer();
  const showNowPlaying =
    Boolean(user && dropPlayer?.current) && !shouldHideDropNowPlayingBar(pathname);
  const [dockPx, setDockPx] = React.useState(0);

  React.useEffect(() => {
    let resize: ResizeObserver | null = null;
    let mutations: MutationObserver | null = null;
    const measure = () => {
      const dock = document.querySelector<HTMLElement>('[data-bottom-dock]');
      if (!dock) {
        setDockPx(0);
        return;
      }
      if (!resize) {
        resize = new ResizeObserver(measure);
        resize.observe(dock);
        mutations?.disconnect();
        mutations = null;
      }
      const overlap = Math.max(0, window.innerHeight - dock.getBoundingClientRect().top);
      const next = overlap > 8 ? Math.ceil(overlap) + 10 : 0;
      setDockPx((prev) => (prev === next ? prev : next));
    };
    measure();
    if (!resize) {
      mutations = new MutationObserver(measure);
      mutations.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener('resize', measure);
    return () => {
      resize?.disconnect();
      mutations?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pathname]);

  if (pathname.startsWith('/marketing/capture') || pathname === '/studio4000') return null;

  const lyricSheet = isTrackLyricSheetPath(pathname);
  // Phone track editor: the corner link covers Work, Lyrics, and Co-Write. Desktop keeps it.
  const editorLift = pathname.startsWith('/albums/') || pathname.startsWith('/tracks/');
  const bottom = dockPx > 0
    ? undefined
    : !isMobile
      ? 'bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]'
      : lyricSheet
        ? 'bottom-[calc(4.35rem+env(safe-area-inset-bottom,0px))]'
        : showNowPlaying
          ? editorLift
            ? 'bottom-[calc(8.6rem+env(safe-area-inset-bottom,0px))]'
            : 'bottom-[calc(5.15rem+env(safe-area-inset-bottom,0px))]'
          : 'bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]';

  return (
    <a
      href="/studio4000"
      style={dockPx > 0 ? { bottom: `calc(${dockPx}px + env(safe-area-inset-bottom, 0px))` } : undefined}
      className={cn(
        'fixed left-3 z-[46] flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-white/15 bg-[#0c0e14]/88 py-1 pl-1 pr-3 text-white no-underline shadow-[0_10px_28px_rgba(0,0,0,0.4)] backdrop-blur-md transition hover:border-[#a08bff]/55 hover:bg-[#141824]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c5cff]',
        lyricSheet && 'max-md:hidden',
        bottom
      )}
    >
      <img
        src="/studio-4000-page/icon.png"
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-[7px]"
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[11px] font-semibold tracking-wide">Studio 4000</span>
        <span className="mt-0.5 text-[9px] text-white/55">Free DAW</span>
      </span>
    </a>
  );
}
