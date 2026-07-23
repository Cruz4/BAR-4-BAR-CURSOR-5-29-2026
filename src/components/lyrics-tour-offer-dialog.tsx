'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Compass, HelpCircle } from 'lucide-react';

type LyricsTourOfferDialogProps = {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
};

/** Opt-in prompt for the workstation tour on first sheet open after signup. */
export function LyricsTourOfferDialog({ open, onStart, onSkip }: LyricsTourOfferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onSkip()}>
      <DialogContent className="sm:max-w-md border-primary/25 max-h-[min(90dvh,36rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Quick studio tour?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-left">
            A short walkthrough of your lyrics sheet, Generate Next, and the Bar Workstation.
            Takes about a minute — or skip and explore on your own.
          </DialogDescription>
        </DialogHeader>
        <p className="text-[11px] text-muted-foreground leading-snug flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Replay anytime from the header <strong className="text-foreground">?</strong> (Studio Manual) →{' '}
            <strong className="text-foreground">Replay Workstation Tour</strong>.
          </span>
        </p>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" className="w-full sm:w-auto order-2 sm:order-1" onClick={onSkip}>
            Skip for now
          </Button>
          <Button className="w-full sm:flex-1 font-bold uppercase order-1 sm:order-2" onClick={onStart}>
            Start tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
