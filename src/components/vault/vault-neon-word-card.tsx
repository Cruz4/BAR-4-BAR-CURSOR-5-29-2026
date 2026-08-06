'use client';

/**
 * Vault neon word — identical placement + markup to Scene/feed neon.
 * Fixed overlay only; Vault docks stay untouched.
 */

import React, { useEffect, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  pinSceneNeonEntry,
  pickSceneNeonEntry,
  resolveSceneNeonEntry,
  unpinSceneNeonEntry,
  type SceneNeonEntry,
} from '@/lib/scene/scene-neon-lexicon';

export function VaultNeonWordCard() {
  const [neon, setNeon] = useState<SceneNeonEntry | null>(null);
  const [neonPinned, setNeonPinned] = useState(false);

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

  return (
    <div
      className="scene-block-neon pointer-events-none fixed right-[3%] top-[4.5rem] z-[40] hidden max-w-[16rem] text-right sm:block sm:max-w-[18rem]"
      data-phase="night"
      aria-label={`Neon word ${neon.word}`}
    >
      <div className="inline-flex items-baseline justify-end gap-1.5">
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
        <span className="scene-block-neon-text font-headline text-base font-bold uppercase tracking-[0.12em] sm:text-lg">
          {neon.word}
        </span>
      </div>
      <p className="scene-block-neon-pron mt-1 font-sans text-xs font-medium normal-case tracking-wide sm:text-[13px]">
        /{neon.pron}/
      </p>
      <p className="scene-block-neon-gloss mt-1.5 max-w-[18rem] font-code text-[12px] font-medium leading-relaxed tracking-wide sm:max-w-[22rem] sm:text-[13px]">
        {neon.gloss}
      </p>
    </div>
  );
}
