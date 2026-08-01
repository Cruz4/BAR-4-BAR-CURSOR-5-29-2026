'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SIGNUP_INK } from '@/lib/subscription';
import { GUEST_DEMO_MAX_USES } from '@/lib/guest-try';
import { prepareGuestTrackForSignup } from '@/lib/guest-track-session';
import {
  getGuestSignupHref,
  trackGuestSignupCta,
} from '@/lib/guest-funnel-client';

type GuestDemoSignupRequiredDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Hard gate after free demo Generate Next assists are used.
 * Writing stays free; more AI requires signup.
 */
export function GuestDemoSignupRequiredDialog({
  open,
  onOpenChange,
}: GuestDemoSignupRequiredDialogProps) {
  const signupHref = getGuestSignupHref({ next: '/' });

  const onSignup = () => {
    trackGuestSignupCta('demo_exhausted_modal');
    prepareGuestTrackForSignup();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border-amber-500/40 bg-card/95 z-[3100]"
        overlayClassName="z-[3050]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/35">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <DialogTitle className="font-headline text-xl uppercase tracking-wide text-white">
            Demo assists used
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed font-code">
            You used both free Generate Next assists on this browser ({GUEST_DEMO_MAX_USES} max — not
            real Ink). Sign up free to save this sheet and unlock {SIGNUP_INK} Ink for the full
            Co-Writer. You can keep writing bars without an account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            asChild
            className="w-full h-11 font-bold uppercase tracking-wide bg-amber-400 hover:bg-amber-300 text-amber-950"
          >
            <Link href={signupHref} onClick={onSignup}>
              Sign up to save &amp; keep generating
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-9 text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Keep writing without AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
