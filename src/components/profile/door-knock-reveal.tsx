'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Bell, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';
import type { DeliveredDoorKnocker } from '@/lib/door-knock-client';
import type { DoorKnockLiveEvent } from '@/lib/door-knock-client';

const AUTO_CLOSE_MS = 3000;

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

function KnockerLinks({
  knockers,
  className,
}: {
  knockers: { name: string; slug?: string }[];
  className?: string;
}) {
  if (!knockers.length) return null;
  return (
    <p className={cn('font-headline text-lg font-bold uppercase tracking-tight text-sky-50', className)}>
      {knockers.map((k, index) => {
        const href = profileHref(k.slug);
        const sep = index < knockers.length - 1 ? ', ' : '';
        return (
          <span key={`${k.name}-${index}`}>
            {href ? (
              <Link href={href} className="text-fuchsia-200 transition-colors hover:text-fuchsia-100 hover:underline">
                {k.name}
              </Link>
            ) : (
              <span className="text-fuchsia-200">{k.name}</span>
            )}
            {sep}
          </span>
        );
      })}
    </p>
  );
}

export function DoorKnockReveal(props: DoorKnockRevealProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => props.onClose(), 280);
  };

  useEffect(() => {
    setMounted(true);
    const timer = window.setTimeout(() => close(), AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto dismiss per reveal mount
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  const isLive = props.variant === 'live';
  const knockers =
    props.variant === 'delivered'
      ? props.knockers
      : [{ name: props.knock.knockerName, slug: props.knock.knockerSlug }];

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
            <KnockerLinks knockers={knockers} className="mt-2 text-base sm:text-lg" />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {isLive
                ? 'They found you on your Artist Home. Answer or let this card close — you can still reply from Activity.'
                : props.variant === 'delivered'
                  ? `${props.delivered} knock${props.delivered === 1 ? '' : 's'} moved into Activity.`
                  : null}
            </p>
          </div>
        </div>

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
          {!isLive && knockers[0]?.slug ? (
            <Button type="button" size="sm" variant="ghost" className="font-bold uppercase" asChild>
              <Link href={profileHref(knockers[0].slug)!} onClick={() => close()}>
                View profile
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/10">
          <div className="door-knock-reveal-timer h-full origin-left bg-gradient-to-r from-sky-400 to-fuchsia-400" />
        </div>
      </div>
    </div>,
    document.body
  );
}
