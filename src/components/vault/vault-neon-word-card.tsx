'use client';

/**
 * Vault neon word — same Scene fixed spot (right-[3%]).
 * Artist Home / Activity docks are not moved.
 *
 * On xl the right gutter is shared with the dock. A max-width calc that
 * can go to 0px (laptops, 125% Windows scale, ~1280–1760 CSS px) stacks
 * the gloss one letter per line. Hide until that gutter can hold a line;
 * keep the same cap on wide screens where it already looks right.
 */

import React, { useEffect, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAppChromeBottom } from '@/hooks/use-app-chrome-bottom';
import {
  pinSceneNeonEntry,
  pickSceneNeonEntry,
  resolveSceneNeonEntry,
  unpinSceneNeonEntry,
  type SceneNeonEntry,
} from '@/lib/scene/scene-neon-lexicon';

export function VaultNeonWordCard() {
  const { resolvedTheme } = useTheme();
  const [neon, setNeon] = useState<SceneNeonEntry | null>(null);
  const [neonPinned, setNeonPinned] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const appChromeBottom = useAppChromeBottom(16);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    const { entry, pinned } = resolveSceneNeonEntry();
    setNeon(entry);
    setNeonPinned(pinned);
  }, []);

  const togglePin = () => {
    if (!neon) return;
    if (neonPinned) {
      unpinSceneNeonEntry();
      setNeonPinned(false);
      setNeon(pickSceneNeonEntry());
      return;
    }
    pinSceneNeonEntry(neon);
    setNeonPinned(true);
  };

  if (!neon) return null;

  const phase = themeReady && resolvedTheme === 'light' ? 'day' : 'night';

  return (
    <div
      className={cn(
        'scene-block-neon pointer-events-none fixed right-[3%] z-[40] hidden overflow-hidden text-right sm:block',
        'max-w-[16rem] sm:max-w-[18rem]',
        'xl:max-[1759px]:hidden',
        'min-[1760px]:max-w-[min(18rem,max(10rem,calc(50%-36rem-5.75rem-3%)))]'
      )}
      data-phase={phase}
      style={{ top: appChromeBottom }}
      aria-label={`Neon word ${neon.word}`}
    >
      <div className="inline-flex max-w-full items-baseline justify-end gap-1.5">
        <button
          type="button"
          onClick={togglePin}
          className={cn(
            'pointer-events-auto -translate-y-px inline-flex shrink-0 items-center justify-center p-0.5 transition-opacity',
            neonPinned
              ? 'text-amber-300/85 opacity-90 hover:opacity-100'
              : 'text-white/30 opacity-65 hover:opacity-100 hover:text-white/50'
          )}
          title={
            neonPinned
              ? 'Unlock now — or it frees itself after 24 hours'
              : 'Lock this word for up to 24 hours'
          }
          aria-label={neonPinned ? `Unlock ${neon.word}` : `Lock ${neon.word} for 24 hours`}
          aria-pressed={neonPinned}
        >
          {neonPinned ? (
            <LockOpen className="h-2.5 w-2.5" strokeWidth={1.6} aria-hidden />
          ) : (
            <Lock className="h-2.5 w-2.5" strokeWidth={1.6} aria-hidden />
          )}
        </button>
        <span className="scene-block-neon-text min-w-0 font-headline text-base font-bold uppercase tracking-[0.12em] sm:text-lg">
          {neon.word}
        </span>
      </div>
      <p className="scene-block-neon-pron mt-1 max-w-full font-sans text-xs font-medium normal-case tracking-wide sm:text-[13px]">
        /{neon.pron}/
      </p>
      <p className="scene-block-neon-gloss mt-1.5 w-full max-w-full overflow-hidden break-normal font-code text-[11px] font-medium leading-relaxed tracking-wide sm:text-[12px]">
        {neon.gloss}
      </p>
    </div>
  );
}
