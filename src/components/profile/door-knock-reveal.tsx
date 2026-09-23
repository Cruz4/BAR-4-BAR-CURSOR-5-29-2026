'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Bell, ChevronLeft, ChevronRight, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';
import type { DeliveredDoorKnocker } from '@/lib/door-knock-client';
import type { DoorKnockLiveEvent } from '@/lib/door-knock-client';

const AUTO_CLOSE_SINGLE_MS = 14_000;
const AUTO_CLOSE_MULTI_BASE_MS = 18_000;
const AUTO_CLOSE_MULTI_PER_KNOCK_MS = 5_000;
const AUTO_CLOSE_MULTI_MAX_MS = 60_000;
const AUTO_CLOSE_SLIDE_RESET_MS = 12_000;

type DoorKnockRevealProps =
  | {
      variant: 'delivered';
      knockers: DeliveredDoorKnocker[];
      delivered: number;
      onClose: () => void;
    }
  | {
      variant: 'live';
      knock: DoorKnockLiveEvent;
      onClose: () => void;
      onSayHello: () => void;
    };

function formatKnockWhen(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function autoCloseDurationMs(knockerCount: number): number {
  if (knockerCount <= 1) return AUTO_CLOSE_SINGLE_MS;
  return Math.min(
    AUTO_CLOSE_MULTI_MAX_MS,
    AUTO_CLOSE_MULTI_BASE_MS + Math.max(0, knockerCount - 1) * AUTO_CLOSE_MULTI_PER_KNOCK_MS
  );
}

function KnockerName({
  knocker,
  className,
}: {
  knocker: { name: string; slug?: string };
  className?: string;
}) {
  const href = profileHref(knocker.slug);
  return (
    <p className={cn('font-headline text-lg font-bold uppercase tracking-tight text-sky-50', className)}>
      {href ? (
        <Link href={href} className="text-fuchsia-200 transition-colors hover:text-fuchsia-100 hover:underline">
          {knocker.name}
        </Link>
      ) : (
        <span className="text-fuchsia-200">{knocker.name}</span>
      )}
    </p>
  );
}

export function DoorKnockReveal(props: DoorKnockRevealProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [index, setIndex] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const dismissTimerRef = useRef<number | null>(null);

  const isLive = props.variant === 'live';
  const deliveredKnockers = useMemo(() => {
    if (props.variant !== 'delivered') return [];
    return [...props.knockers].sort((a, b) => {
      const ta = Date.parse(a.createdAt || '');
      const tb = Date.parse(b.createdAt || '');
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
  }, [props]);

  const knockers = isLive
    ? [{ name: props.knock.knockerName, slug: props.knock.knockerSlug, createdAt: props.knock.createdAt }]
    : deliveredKnockers;

  const knockerCount = knockers.length;
  const safeIndex = knockerCount ? Math.min(index, knockerCount - 1) : 0;
  const current = knockers[safeIndex];
  const hasMultiple = knockerCount > 1;
  const timerMs = hasMultiple ? AUTO_CLOSE_SLIDE_RESET_MS : autoCloseDurationMs(knockerCount);

  const onClose = props.onClose;

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onClose(), 280);
  }, [closing, onClose]);

  const bumpDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = window.setTimeout(() => close(), timerMs);
    setTimerKey((k) => k + 1);
  }, [close, timerMs]);

  useEffect(() => {
    setMounted(true);
    bumpDismissTimer();
    return () => {
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    };
  }, [bumpDismissTimer]);

  const goPrev = () => {
    if (!hasMultiple) return;
    setIndex((i) => (i <= 0 ? knockerCount - 1 : i - 1));
    bumpDismissTimer();
  };

  const goNext = () => {
    if (!hasMultiple) return;
    setIndex((i) => (i >= knockerCount - 1 ? 0 : i + 1));
    bumpDismissTimer();
  };

  if (!mounted || typeof document === 'undefined') return null;

  const whenLabel = formatKnockWhen(current?.createdAt);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[260] flex items-start justify-center px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:items-center sm:pt-0"
      role="status"
      aria-live="assertive"
    >
      <div
        className={cn(
          'door-knock-reveal-pop pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-sky-400/45 bg-[linear-gradient(145deg,rgba(8,22,42,0.97),rgba(3,8,18,0.98))] p-5 shadow-[0_0_60px_rgba(56,189,248,0.35),0_24px_80px_rgba(0,0,0,0.55)]',
          closing && 'door-knock-reveal-out'
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-sky-200/70 transition-colors hover:bg-white/10 hover:text-white"
          onClick={close}
          aria-label="Dismiss knock alert"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div
            className="door-knock-punch flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-300/40 bg-sky-500/15 text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            aria-hidden
          >
            ✊
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-sky-300/90">
              {isLive ? 'Live at your door' : 'While you were away'}
            </p>
            <h2 className="mt-1 font-headline text-xl font-bold uppercase tracking-tight text-white">
              {isLive ? "Someone's knocking" : 'Knocks collected'}
            </h2>
            {current ? <KnockerName knocker={current} className="mt-2 text-base sm:text-lg" /> : null}
            {whenLabel ? (
              <p className="mt-1.5 font-code text-[10px] tabular-nums uppercase tracking-wide text-sky-200/85">
                {whenLabel}
              </p>
            ) : null}
            {hasMultiple ? (
              <p className="mt-1 font-code text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Knock {safeIndex + 1} of {knockerCount}
              </p>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {isLive
                ? 'They found you on your Artist Home. Answer or dismiss — you can still reply from Activity.'
                : props.variant === 'delivered'
                  ? `${props.delivered} knock${props.delivered === 1 ? '' : 's'} moved into Activity.${
                      hasMultiple ? ' Use Next to see each visitor.' : ''
                    }`
                  : null}
            </p>
          </div>
        </div>

        {hasMultiple ? (
          <div className="relative mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1 font-bold uppercase"
              onClick={goPrev}
              aria-label="Previous knock"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1 font-bold uppercase"
              onClick={goNext}
              aria-label="Next knock"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          {isLive ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-sky-600 font-bold uppercase hover:bg-sky-500"
              onClick={() => {
                props.onSayHello();
                close();
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Say hello
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" className="gap-1.5 font-bold uppercase" asChild>
            <Link href="/activity" onClick={() => close()}>
              <Bell className="h-3.5 w-3.5" /> Activity
            </Link>
          </Button>
          {!isLive && current?.slug ? (
            <Button type="button" size="sm" variant="ghost" className="font-bold uppercase" asChild>
              <Link href={profileHref(current.slug)!} onClick={() => close()}>
                View profile
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/10">
          <div
            key={timerKey}
            className="door-knock-reveal-timer h-full origin-left bg-gradient-to-r from-sky-400 to-fuchsia-400"
            style={{ animationDuration: `${timerMs}ms` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
