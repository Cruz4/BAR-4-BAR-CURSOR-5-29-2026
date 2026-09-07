'use client';

import React, { useEffect, useState } from 'react';
import { HandMetal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  doorKnockBlockMessage,
  doorKnockLedgerLines,
  type DoorKnockQuota,
} from '@/lib/door-knock';
import {
  fetchDoorKnockQuota,
  knockArtistHomeDoorClient,
} from '@/lib/door-knock-client';

function KnockDots({
  used,
  max,
  className,
}: {
  used: number;
  max: number;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex gap-0.5', className)} aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i < used ? 'bg-sky-300' : 'bg-sky-500/25'
          )}
        />
      ))}
    </span>
  );
}

function DoorKnockLedger({ quota }: { quota: DoorKnockQuota }) {
  const { doorLine, youLine } = doorKnockLedgerLines(quota);
  return (
    <div
      className="mt-2 space-y-1 rounded-lg border border-sky-500/15 bg-sky-500/[0.04] px-2.5 py-2 font-code text-[9px] leading-relaxed tracking-wide text-sky-100/75"
      aria-label="Door knock tally for today"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{doorLine}</span>
        <KnockDots
          used={quota.visitorsAtDoor}
          max={5}
          className="hidden sm:inline-flex"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sky-200/60">
        <span>{youLine}</span>
        <KnockDots used={quota.yourKnocksHere} max={3} className="inline-flex" />
      </div>
    </div>
  );
}

export function DoorKnockButton({
  targetUserId,
  targetName,
  targetSlug,
  knockerSlug,
  className,
}: {
  targetUserId: string;
  targetName: string;
  targetSlug?: string;
  knockerSlug?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<DoorKnockQuota | null>(null);

  useEffect(() => {
    if (!user?.id || user.id === targetUserId) return;
    void fetchDoorKnockQuota(targetUserId).then(setQuota);
  }, [user?.id, targetUserId]);

  if (!user?.id || user.id === targetUserId) return null;

  const canKnock = quota?.canKnock ?? true;

  const knock = async () => {
    if (busy || !canKnock) return;
    setBusy(true);
    try {
      const result = await knockArtistHomeDoorClient({
        targetUserId,
        targetName,
        targetSlug,
        knockerName: user.displayName || 'Artist',
        knockerSlug,
      });
      if (!result.ok) {
        toast({
          variant: 'destructive',
          title: 'Knock not sent',
          description: result.error || doorKnockBlockMessage(result.quota?.blockReason),
        });
        if (result.quota) setQuota(result.quota);
        return;
      }
      if (result.quota) setQuota(result.quota);
      toast({
        title: result.live ? 'Knock sent' : 'Knock logged',
        description: result.live
          ? `${targetName} is home — they may answer from Msgs.`
          : `${targetName} will see it when they open their Artist Home.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Knock not sent',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !canKnock}
          className="h-8 shrink-0 gap-1.5 border-sky-400/35 bg-sky-500/10 font-bold uppercase text-sky-100 hover:bg-sky-500/20"
          onClick={() => void knock()}
          aria-label={`Knock on ${targetName}'s door`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandMetal className="h-3.5 w-3.5" />}
          Knock
        </Button>
        {quota && !quota.canKnock ? (
          <span className="font-code text-[9px] text-sky-200/55">
            {doorKnockBlockMessage(quota.blockReason)}
          </span>
        ) : null}
      </div>
      {quota ? <DoorKnockLedger quota={quota} /> : null}
    </div>
  );
}
