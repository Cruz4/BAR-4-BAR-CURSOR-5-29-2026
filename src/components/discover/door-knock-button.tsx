'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { doorKnockBlockMessage, type DoorKnockQuota } from '@/lib/door-knock';
import { DOOR_KNOCK_PUNCH_ANIM_MS, playDoorKnockSound } from '@/lib/door-knock-sound';
import {
  fetchDoorKnockQuota,
  knockArtistHomeDoorClient,
} from '@/lib/door-knock-client';

export function DoorKnockButton({
  targetUserId,
  targetName,
  targetSlug,
  knockerSlug,
  className,
  compact = false,
}: {
  targetUserId: string;
  targetName: string;
  targetSlug?: string;
  knockerSlug?: string;
  className?: string;
  /** Inline on Recently live card — sits beside Visit. */
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [punching, setPunching] = useState(false);
  const [quota, setQuota] = useState<DoorKnockQuota | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user?.id || user.id === targetUserId) return;
    void fetchDoorKnockQuota(targetUserId).then((next) => {
      setQuota(next);
      if (next && !next.canKnock) setSent(true);
    });
  }, [user?.id, targetUserId]);

  if (!user?.id || user.id === targetUserId) return null;

  const canKnock = !sent && (quota?.canKnock ?? true);

  const knock = async () => {
    if (!canKnock || punching) return;
    setPunching(true);
    playDoorKnockSound();
    try {
      const result = await knockArtistHomeDoorClient({
        targetUserId,
        targetName,
        targetSlug,
        knockerName: user.displayName || 'Artist',
        knockerSlug,
      });
      if (!result.ok) {
        setPunching(false);
        toast({
          variant: 'destructive',
          title: 'Knock not sent',
          description: result.error || doorKnockBlockMessage(result.quota?.blockReason),
        });
        if (result.quota) setQuota(result.quota);
        return;
      }
      setSent(true);
      if (result.quota) setQuota(result.quota);
      window.setTimeout(() => setPunching(false), DOOR_KNOCK_PUNCH_ANIM_MS);
    } catch (error) {
      setPunching(false);
      toast({
        variant: 'destructive',
        title: 'Knock not sent',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const label = sent ? 'Knocked' : 'Knock';

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!canKnock}
      className={cn(
        'shrink-0 gap-1.5 border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/5 font-bold uppercase text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.12)] transition-all hover:border-amber-300/55 hover:from-amber-500/25 hover:to-orange-500/15 hover:shadow-[0_0_22px_rgba(251,191,36,0.2)] disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-muted-foreground/60 disabled:shadow-none',
        compact ? 'h-8 px-2.5 text-[10px] tracking-wide' : 'h-9 px-3 text-[11px]',
        className
      )}
      onClick={() => void knock()}
      aria-label={sent ? `Already knocked on ${targetName}'s door today` : `Knock on ${targetName}'s door`}
    >
      <span
        className={cn(
          'inline-block origin-[72%_78%] text-base leading-none',
          punching && `animate-[door-knock-punch_${DOOR_KNOCK_PUNCH_ANIM_MS}ms_ease-in-out]`,
          sent && 'grayscale opacity-60'
        )}
        aria-hidden
      >
        ✊
      </span>
      {label}
    </Button>
  );
}
