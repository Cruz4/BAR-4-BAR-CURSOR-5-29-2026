'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Check, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import { REFERRAL_INK_REWARD, MAX_REFERRAL_REWARDS } from '@/lib/referrals';
import { cn } from '@/lib/utils';

type ReferralInfo = {
  referralCode: string;
  referralLink: string;
  referralCount: number;
  maxReferrals: number;
  inkPerReferral: number;
  remaining: number;
};

export function ReferAFriendSection({ className }: { className?: string }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadReferral = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch(`/api/referrals/me?userId=${encodeURIComponent(user.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load referral link');
      setInfo(data);
    } catch (e) {
      console.warn('Referral load failed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  const copyLink = async () => {
    if (!info?.referralLink) return;
    try {
      await navigator.clipboard.writeText(info.referralLink);
      setCopied(true);
      toast({
        title: 'Referral link copied',
        description: `Eligible new members can receive up to ${REFERRAL_INK_REWARD} Ink. Your reward unlocks after they legitimately spend 50 Ink.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Select the link and copy manually.' });
    }
  };

  if (!user || authLoading || loading) {
    return (
      <Card
        className={cn(
          'border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-violet-500/[0.05] overflow-hidden',
          className
        )}
        aria-busy="true"
        aria-label="Loading referral section"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="space-y-2 min-w-0 flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </div>
            <Skeleton className="h-5 w-10 shrink-0 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-24 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-3 w-64" />
        </CardContent>
      </Card>
    );
  }

  const remaining = info?.remaining ?? MAX_REFERRAL_REWARDS;
  const exhausted = remaining <= 0;

  return (
    <Card className={cn('border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-violet-500/[0.05] overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-headline text-lg uppercase tracking-tight">Refer a Friend</CardTitle>
              <CardDescription className="text-xs font-code mt-1">
                Invite someone into the Scene. Eligible new members can receive up to {REFERRAL_INK_REWARD} Ink.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 border-primary/30 text-primary font-mono text-[10px]">
            {info?.referralCount ?? 0}/{MAX_REFERRAL_REWARDS}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {exhausted ? (
          <p className="text-xs text-muted-foreground font-code">
            You&apos;ve earned the maximum referral bonus. Thanks for spreading the studio!
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                readOnly
                value={info?.referralLink || ''}
                className="h-10 bg-black/40 border-white/10 font-code text-[11px]"
              />
              <Button type="button" onClick={copyLink} className="shrink-0 gap-2 font-bold uppercase text-[10px] tracking-wider h-10">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground font-code flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {remaining} referral{remaining === 1 ? '' : 's'} left · your reward unlocks after a referred member legitimately spends 50 Ink
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export async function claimPendingReferral(userId: string, referralCode: string): Promise<boolean> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) return false;
  const res = await fetch('/api/referrals/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, referralCode }),
  });
  const data = await res.json();
  return res.ok && data.rewarded === true;
}
