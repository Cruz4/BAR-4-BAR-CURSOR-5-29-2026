'use client';

import Link from 'next/link';
import { Droplets, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trackUpgradeClick } from '@/lib/conversion-analytics';
import { formatFreeMonthlyRefillLabel } from '@/lib/ink-grants';
import { isProUser, isYearlyPro } from '@/lib/subscription';
import type { User } from '@/lib/types';

type ZeroInkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  inkBalance: number;
  actionName?: string;
};

export function ZeroInkDialog({
  open,
  onOpenChange,
  user,
  inkBalance,
  actionName,
}: ZeroInkDialogProps) {
  const isPro = isProUser(user);
  const isYearly = isYearlyPro(user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Droplets className="h-6 w-6 text-primary" />
            Out of Ink
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            You need Ink to run AI tools — your balance is {inkBalance.toLocaleString()}.
            {actionName ? ` (${actionName})` : ''}
            {!isPro && user?.createdAt && (
              <span className="block mt-2 text-[11px] text-muted-foreground">
                {formatFreeMonthlyRefillLabel(user.createdAt)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button asChild className="w-full font-bold uppercase text-[10px] tracking-widest">
            <Link
              href="/usage?tab=buy-ink"
              onClick={() => {
                trackUpgradeClick('low_ink', { actionName, cta: 'ink_pack' });
                onOpenChange(false);
              }}
            >
              {isYearly ? 'Buy Ink Packs' : 'Buy Studio Pack'}
            </Link>
          </Button>
          {!isPro && (
            <Button asChild variant="outline" className="w-full font-bold uppercase text-[10px] tracking-widest">
              <Link
                href="/usage?tab=cloud"
                onClick={() => {
                  trackUpgradeClick('low_ink', { actionName, cta: 'upgrade' });
                  onOpenChange(false);
                }}
              >
                <Lock className="mr-2 h-3.5 w-3.5" />
                Keep My Vault — Go Pro
              </Link>
            </Button>
          )}
          {isPro && !isYearly && (
            <Button asChild variant="outline" className="w-full font-bold uppercase text-[10px] tracking-widest">
              <Link href="/usage?tab=cloud" onClick={() => onOpenChange(false)}>
                Upgrade to Yearly — 50% off packs
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
