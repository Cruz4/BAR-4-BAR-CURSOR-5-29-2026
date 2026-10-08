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
import { waitForAuthUser } from '@/lib/firebase/client/auth-ready';
import { REFERRAL_INK_REWARD, MAX_REFERRAL_REWARDS, buildReferralLink } from '@/lib/referrals';
import { REFERRAL_INK_SPEND_THRESHOLD, SIGNUP_INK } from '@/lib/subscription';
import { cn } from '@/lib/utils';

type ReferralInfo = {
  referralCode: string;
  referralLink: string;
  referralCount: number;
  maxReferrals: number;
  inkPerReferral: number;
  remaining: number;
};

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    if (ok) return true;
  } catch {
    /* fall through */
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url: value, text: value });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function ReferAFriendSection({
  className,
  compact = false,
}: {
  className?: string;
  /** Tighter single-row layout for Scene footers. */
  compact?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReferral = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const firebaseUser = await waitForAuthUser();
      const token = await firebaseUser?.getIdToken();
      if (!token) throw new Error('Sign in again to load your referral link.');
      const res = await fetch(`/api/referrals/me?userId=${encodeURIComponent(user.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as ReferralInfo & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not load referral link');
      const fallbackLink =
        typeof window !== 'undefined' && data.referralCode
          ? buildReferralLink(window.location.origin, data.referralCode)
          : '';
      setInfo({
        ...data,
        referralLink: data.referralLink || fallbackLink,
      });
    } catch (e) {
      setInfo(null);
      setError(e instanceof Error ? e.message : 'Could not load referral link');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  const copyLink = async () => {
    const link = info?.referralLink;
    if (!link) {
      toast({
        variant: 'destructive',
        title: 'No referral link yet',
        description: error || 'Load your link first, then copy.',
      });
      return;
    }
    const ok = await copyText(link);
    if (!ok) {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Select the link and copy it manually.',
      });
      return;
    }
    setCopied(true);
    toast({
      title: 'Referral link copied',
      description: `Your friend gets ${SIGNUP_INK} welcome Ink plus up to ${REFERRAL_INK_REWARD} extra referral Ink. You can earn up to ${REFERRAL_INK_REWARD} Ink after they legitimately spend ${REFERRAL_INK_SPEND_THRESHOLD} Ink.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user || authLoading || loading) {
    if (compact) {
      return (
        <div
          id="refer-a-friend"
          className={cn(
            'rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5',
            className
          )}
          aria-busy="true"
        >
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      );
    }
    return (
      <Card
        id="refer-a-friend"
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

  if (exhausted) {
    return null;
  }

  if (compact) {
    return (
      <div
        id="refer-a-friend"
        className={cn(
          'rounded-lg border border-primary/20 bg-gradient-to-r from-primary/[0.05] via-card/30 to-violet-500/[0.04] px-3 py-2.5',
          className
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Gift className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-headline text-xs font-bold uppercase tracking-tight">Refer a friend</p>
              <p className="truncate text-[10px] text-muted-foreground font-code">
                Share Ink · {remaining} reward{remaining === 1 ? '' : 's'} left
              </p>
            </div>
            <Badge variant="outline" className="hidden shrink-0 border-primary/30 text-primary font-mono text-[9px] sm:inline-flex">
              {info?.referralCount ?? 0}/{MAX_REFERRAL_REWARDS}
            </Badge>
          </div>
          {info?.referralLink ? (
            <div className="flex gap-1.5 sm:max-w-[min(100%,22rem)] sm:flex-1">
              <Input
                readOnly
                value={info.referralLink}
                className="h-8 min-w-0 flex-1 bg-black/40 border-white/10 font-code text-[10px]"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => void copyLink()}
                className="h-8 shrink-0 gap-1 px-2.5 text-[9px] font-bold uppercase"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'OK' : 'Copy'}
              </Button>
            </div>
          ) : error && !info?.referralLink ? (
            <Button type="button" variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => void loadReferral()}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Card id="refer-a-friend" className={cn('border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-violet-500/[0.05] overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-headline text-lg uppercase tracking-tight">Refer a Friend</CardTitle>
              <CardDescription className="text-xs font-code mt-1">
                Invite someone into the Scene and both of you can receive Ink.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 border-primary/30 text-primary font-mono text-[10px]">
            {info?.referralCount ?? 0}/{MAX_REFERRAL_REWARDS}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && !info?.referralLink ? (
          <div className="space-y-2">
            <p className="text-xs text-destructive font-code">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadReferral()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.06] p-3">
                <p className="font-code text-[9px] font-bold uppercase tracking-widest text-cyan-300">Your friend gets</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                  {SIGNUP_INK} welcome Ink plus up to {REFERRAL_INK_REWARD} extra referral Ink.
                </p>
              </div>
              <div className="rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/[0.06] p-3">
                <p className="font-code text-[9px] font-bold uppercase tracking-widest text-fuchsia-300">You can earn</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                  Up to {REFERRAL_INK_REWARD} Ink after they legitimately spend {REFERRAL_INK_SPEND_THRESHOLD} Ink.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={info?.referralLink || ''}
                className="h-10 bg-black/40 border-white/10 font-code text-[11px]"
              />
              <Button
                type="button"
                onClick={() => void copyLink()}
                disabled={!info?.referralLink}
                className="shrink-0 gap-2 font-bold uppercase text-[10px] tracking-wider h-10"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground font-code flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              {remaining} rewarded referral{remaining === 1 ? '' : 's'} left · rewards are subject to eligibility and the Visitor residency-pool cap
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export async function claimPendingReferral(userId: string, referralCode: string): Promise<boolean> {
  const firebaseUser = await waitForAuthUser();
  const token = await firebaseUser?.getIdToken();
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
