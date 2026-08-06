'use client';

/**
 * The Catch — visitors hunt end-sounds to unlock the artist's bar chain.
 * First bar is the cast; each correct lure reveals the next bar.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CATCH_LIVES,
  buildLureField,
  catchBestTimeStorageKey,
  formatEndSoundDisplay,
  type TheCatch,
} from '@/lib/profile/the-catch';

type Phase = 'hunting' | 'cleared' | 'failed';

function readBest(msKey: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(msKey);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeBest(msKey: string, ms: number) {
  try {
    const prev = readBest(msKey);
    if (prev == null || ms < prev) localStorage.setItem(msKey, String(ms));
  } catch {
    /* ignore */
  }
}

function formatMs(ms: number): string {
  const s = ms / 1000;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

/** Interactive Catch game — used on Artist Home and Edit Public Page preview. */
export function TheCatchGame({
  data,
  profileUserId,
  profileName,
  compact,
}: {
  data: TheCatch;
  profileUserId: string;
  profileName: string;
  compact?: boolean;
}) {
  const bestKey = catchBestTimeStorageKey(profileUserId);
  const [unlocked, setUnlocked] = useState(1);
  const [lives, setLives] = useState(CATCH_LIVES);
  const [phase, setPhase] = useState<Phase>('hunting');
  const [missFlash, setMissFlash] = useState<string | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [runMs, setRunMs] = useState<number | null>(null);
  const [lureSeed, setLureSeed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    setBestMs(readBest(bestKey));
  }, [bestKey]);

  const targetIndex = unlocked;
  const hunting = phase === 'hunting' && targetIndex < data.links.length;

  const lures = useMemo(() => {
    if (!hunting) return [];
    void lureSeed;
    return buildLureField(data, targetIndex);
  }, [data, targetIndex, hunting, lureSeed]);

  const rewardShareId = useMemo(() => {
    for (let i = data.links.length - 1; i >= 0; i--) {
      if (data.links[i].shareId) return data.links[i].shareId;
    }
    return data.links[0]?.shareId;
  }, [data.links]);

  const reset = () => {
    setUnlocked(1);
    setLives(CATCH_LIVES);
    setPhase('hunting');
    setMissFlash(null);
    setHitFlash(false);
    setRunMs(null);
    setLureSeed((n) => n + 1);
    startedAt.current = null;
  };

  const onPick = (sound: string) => {
    if (!hunting || phase !== 'hunting') return;
    if (startedAt.current == null) startedAt.current = performance.now();

    const target = data.links[targetIndex]?.endSound?.toLowerCase();
    if (!target) return;

    if (sound.toLowerCase() === target) {
      setHitFlash(true);
      window.setTimeout(() => setHitFlash(false), 420);
      const next = unlocked + 1;
      setUnlocked(next);
      if (next >= data.links.length) {
        const elapsed = Math.max(
          1,
          Math.round(performance.now() - (startedAt.current || performance.now()))
        );
        setRunMs(elapsed);
        writeBest(bestKey, elapsed);
        setBestMs(readBest(bestKey));
        setPhase('cleared');
      } else {
        setLureSeed((n) => n + 1);
      }
      return;
    }

    setMissFlash(sound);
    window.setTimeout(() => setMissFlash(null), 380);
    const nextLives = lives - 1;
    setLives(nextLives);
    setLureSeed((n) => n + 1);
    if (nextLives <= 0) setPhase('failed');
  };

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--ph-muted,rgba(255,255,255,0.55))]">
          Feel the pocket — catch the next end-sound
        </p>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted)]">
          <span className="flex items-center gap-1" aria-label={`${lives} lives`}>
            {Array.from({ length: CATCH_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < lives
                    ? 'fill-[var(--ph-accent,#7dd3fc)] text-[var(--ph-accent,#7dd3fc)]'
                    : 'opacity-25'
                )}
              />
            ))}
          </span>
          {bestMs != null && <span>Best {formatMs(bestMs)}</span>}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {data.links.slice(0, unlocked).map((link, i) => (
            <motion.div
              key={`${i}-${link.text.slice(0, 24)}`}
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={cn(
                'relative border border-dashed border-[var(--ph-border)] bg-black/30 px-3 py-2.5',
                i === unlocked - 1 && hitFlash && 'ring-1 ring-[var(--ph-accent,#7dd3fc)]'
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--ph-accent,#7dd3fc)]/80">
                {i === 0 ? 'The cast' : `Catch ${i}`}
              </p>
              <p
                className={cn(
                  'mt-1 text-[var(--ph-text,#fff)]',
                  compact ? 'text-sm' : 'text-base sm:text-lg'
                )}
              >
                {link.text}
              </p>
              <span className="mt-1 inline-block font-code text-[10px] tracking-widest text-[var(--ph-accent2,#a5b4fc)]">
                {formatEndSoundDisplay(link.endSound)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hunting && (
        <div className="relative overflow-hidden border border-[var(--ph-border)] bg-gradient-to-b from-black/40 to-black/20 p-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 50% 120%, hsl(var(--ph-hue, 200) 70% 40% / 0.35), transparent 60%)',
            }}
          />
          <p className="relative mb-3 text-center text-[9px] font-bold uppercase tracking-[0.35em] text-[var(--ph-muted)]">
            Lures in the water · pick the next mouthfeel
          </p>
          <div className="relative flex flex-wrap items-center justify-center gap-2">
            {lures.map((sound, i) => {
              const missed = missFlash === sound;
              return (
                <motion.button
                  key={`${lureSeed}-${sound}-${i}`}
                  type="button"
                  onClick={() => onPick(sound)}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, i % 2 === 0 ? -3 : 3, 0],
                  }}
                  transition={{
                    y: { repeat: Infinity, duration: 2.4 + (i % 3) * 0.35, ease: 'easeInOut' },
                    opacity: { duration: 0.25 },
                    scale: { type: 'spring', stiffness: 420, damping: 22 },
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 font-code text-sm tracking-wide transition-colors',
                    missed
                      ? 'border-red-400/80 bg-red-500/20 text-red-200'
                      : 'border-white/20 bg-white/5 text-[var(--ph-text)] hover:border-[var(--ph-accent)] hover:bg-[var(--ph-accent)]/15 hover:text-[var(--ph-accent)]'
                  )}
                >
                  {formatEndSoundDisplay(sound)}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'cleared' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3 border border-[var(--ph-accent)]/40 bg-[var(--ph-accent)]/10 p-4 text-center"
        >
          <p className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[var(--ph-accent)]">
            <Sparkles className="h-4 w-4" /> You caught {profileName}&apos;s whole run
          </p>
          {runMs != null && (
            <p className="text-xs text-[var(--ph-muted)]">
              Time {formatMs(runMs)}
              {bestMs != null ? ` · personal best ${formatMs(bestMs)}` : ''}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-text)] hover:border-[var(--ph-accent)] hover:text-[var(--ph-accent)]"
            >
              <RotateCcw className="h-3 w-3" /> Run it again
            </button>
            {rewardShareId && (
              <Link
                href={`/share/${rewardShareId}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ph-accent)]/50 bg-[var(--ph-accent)]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-accent)] hover:bg-[var(--ph-accent)]/25"
              >
                Open the DNA Drop →
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {phase === 'failed' && (
        <div className="space-y-3 border border-white/15 bg-black/30 p-4 text-center">
          <p className="text-sm text-[var(--ph-muted)]">The run slipped — lures scatter.</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-text)] hover:border-[var(--ph-accent)] hover:text-[var(--ph-accent)]"
          >
            <RotateCcw className="h-3 w-3" /> Cast again
          </button>
        </div>
      )}
    </div>
  );
}
