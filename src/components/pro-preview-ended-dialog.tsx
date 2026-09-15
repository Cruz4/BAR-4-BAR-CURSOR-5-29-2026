'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Sparkles, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  FREE_ALBUM_LIMIT,
  FREE_TRACK_LIMIT,
  PRO_FEATURE_PREVIEW_DAYS,
  hasProFeaturePreviewEnded,
} from '@/lib/subscription';
import { isStudioOnboardingBusy } from '@/lib/studio-privacy-intro';
import { cn } from '@/lib/utils';

function previewEndedAckKey(userId: string): string {
  return `b4b_pro_preview_ended_ack_${userId}`;
}

function hasAckedPreviewEnded(userId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(previewEndedAckKey(userId)) === '1';
  } catch {
    return true;
  }
}

function markPreviewEndedAcked(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(previewEndedAckKey(userId), '1');
  } catch {
    /* ignore */
  }
}

/**
 * One-time dialog when the 48h Pro feature preview expires —
 * clear before/after so Visitor vs Go Pro is obvious.
 */
export function ProPreviewEndedDialog() {
  const { user, authReady, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!authReady || loading || !user?.id) return;
    if (!hasProFeaturePreviewEnded(user)) return;
    if (hasAckedPreviewEnded(user.id)) return;
    if (isStudioOnboardingBusy()) return;

    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [authReady, loading, user]);

  const dismiss = useCallback(() => {
    if (user?.id) markPreviewEndedAcked(user.id);
    setOpen(false);
  }, [user?.id]);

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-lg border-pink-500/30 max-h-[min(90dvh,40rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            Your {PRO_FEATURE_PREVIEW_DAYS * 24}-hour Pro preview ended
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-left">
            You&apos;re back on Visitor. Nothing was deleted — your lyrics and Ink stay.
            Here&apos;s what changed:
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 text-[11px] leading-snug">
          <div className="rounded-lg border border-border/60 bg-muted/25 p-3 space-y-2">
            <p className="font-bold uppercase tracking-widest text-[9px] text-muted-foreground flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Still yours on Visitor
            </p>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
              <li>All lyrics &amp; projects saved</li>
              <li>Your Ink balance (AI tools still run on Ink)</li>
              <li>
                Demo catalog: {FREE_ALBUM_LIMIT} album · {FREE_TRACK_LIMIT} editable tracks
              </li>
              <li>Song &amp; album music releases (press live from New release)</li>
              <li>System DNA / Vibe / Style presets (load-only)</li>
            </ul>
          </div>
          <div className="rounded-lg border border-pink-500/25 bg-pink-500/[0.06] p-3 space-y-2">
            <p className="font-bold uppercase tracking-widest text-[9px] text-pink-600 dark:text-pink-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Locked until Go Pro
            </p>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
              <li>Custom DNA / Vibe / Style vault saves</li>
              <li>Export (PDF / TXT / vault JSON) &amp; import</li>
              <li>Performance Mode, Freestyle, Lyrics DNA Drop links</li>
              <li>Unlimited albums &amp; tracks</li>
            </ul>
          </div>
        </div>

        <p className={cn('text-[10px] text-muted-foreground leading-snug')}>
          Preview never unlocked unlimited catalog — that stays a paid Pro benefit. Continue writing on
          Visitor anytime, or Go Pro to keep the full workflow.
        </p>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" className="w-full sm:w-auto order-2 sm:order-1" onClick={dismiss}>
            Continue as Visitor
          </Button>
          <Button asChild className="w-full sm:flex-1 font-bold uppercase order-1 sm:order-2" onClick={dismiss}>
            <Link href="/usage?tab=cloud">Go Pro</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
