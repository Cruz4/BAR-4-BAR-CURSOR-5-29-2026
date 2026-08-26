'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Banknote, LogIn, Loader, ExternalLink, Wallet, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { auth } from '@/lib/firebase/client/firebase';
import { centsToUsdLabel, dropArtistShareLabel, dropPlatformFeeLabel, firstDropsFeeCashoutLine } from '@/lib/drop-commerce';
import {
  DROP_PAYOUT_COUNTRIES,
  EMPTY_DROP_CONNECT_STATUS,
  EMPTY_DROP_PAYOUT_TOTALS,
  dropSaleStatusLabel,
  type DropEarningsSummary,
} from '@/lib/drop-earnings';
import { cn } from '@/lib/utils';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to manage payouts.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function ConnectBadge({
  ready,
  submitted,
}: {
  ready: boolean;
  submitted: boolean;
}) {
  if (ready) {
    return (
      <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 uppercase text-[9px] tracking-widest">
        Payouts live
      </Badge>
    );
  }
  if (submitted) {
    return (
      <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-300 uppercase text-[9px] tracking-widest">
        Stripe reviewing
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="uppercase text-[9px] tracking-widest">
      Not connected
    </Badge>
  );
}

function EarningsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { enabled: firstDropsOn, loading: featureLoading } = useFirstDropsFeature();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<DropEarningsSummary>({
    connect: { ...EMPTY_DROP_CONNECT_STATUS },
    totals: { ...EMPTY_DROP_PAYOUT_TOTALS },
    sales: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [country, setCountry] = useState('US');
  const [busy, setBusy] = useState<'onboard' | 'dashboard' | 'release' | null>(null);
  const connectHandled = useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const headers = await authHeaders();
    const res = await fetch(`/api/drops/payouts/status?userId=${encodeURIComponent(user.id)}`, {
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load earnings.');
    setSummary({
      connect: data.connect || EMPTY_DROP_CONNECT_STATUS,
      totals: data.totals || EMPTY_DROP_PAYOUT_TOTALS,
      sales: Array.isArray(data.sales) ? data.sales : [],
    });
    if (typeof data.connect?.country === 'string' && data.connect.country) {
      setCountry(data.connect.country);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!firstDropsOn) {
      setLoaded(true);
      return;
    }
    if (!user?.id) {
      setLoaded(!authLoading);
      return;
    }
    void load()
      .catch((err: unknown) => {
        toast({
          variant: 'destructive',
          title: 'Earnings unavailable',
          description: err instanceof Error ? err.message : undefined,
        });
      })
      .finally(() => setLoaded(true));
  }, [user?.id, authLoading, firstDropsOn, load, toast]);

  useEffect(() => {
    const connect = searchParams.get('connect');
    if (!connect || !user?.id || connectHandled.current) return;
    connectHandled.current = true;
    void (async () => {
      try {
        await load();
        const headers = await authHeaders();
        const release = await fetch('/api/drops/payouts/release', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId: user.id }),
        });
        const released = await release.json().catch(() => ({}));
        if (release.ok && Number(released.released) > 0) {
          toast({
            title: 'Held sales sent',
            description: `${released.released} sale${released.released === 1 ? '' : 's'} moved to your Stripe balance.`,
          });
          await load();
        } else if (connect === 'return') {
          toast({
            title: 'Payouts updated',
            description: 'Stripe saved your payout details. Bank deposits follow Stripe’s schedule.',
          });
        }
      } catch {
        /* status refresh is enough */
      } finally {
        router.replace('/earnings');
      }
    })();
  }, [searchParams, user?.id, load, router, toast]);

  const startOnboard = async () => {
    if (!user) return;
    setBusy('onboard');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/drops/payouts/onboard', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id, email: user.email, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start payouts.');
      if (data.ready) {
        toast({ title: 'Payouts already live', description: 'New sales go to your Stripe balance automatically.' });
        await load();
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not connect payouts',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const openDashboard = async () => {
    if (!user) return;
    setBusy('dashboard');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/drops/payouts/dashboard', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open payouts.');
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Payouts dashboard',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const releaseHeld = async () => {
    if (!user) return;
    setBusy('release');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/drops/payouts/release', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send held sales.');
      toast({
        title: data.released ? 'Sent to Stripe' : 'Nothing held',
        description: data.released
          ? `${data.released} sale${data.released === 1 ? '' : 's'} moved to your Stripe balance.`
          : 'All caught up.',
      });
      await load();
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not cash out held sales',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || featureLoading || !loaded) {
    return <StudioLoader size="lg" fullscreen message="Opening earnings..." />;
  }

  if (!firstDropsOn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center border-2">
          <CardContent className="p-8 space-y-4">
            <Banknote className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="font-headline text-3xl font-bold uppercase">Earnings is off</h1>
            <p className="text-sm text-muted-foreground">
              Music releases are currently turned off. Sales stay saved if releases return.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Back to The Scene</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center border-2">
          <CardContent className="p-8 space-y-4">
            <Banknote className="h-10 w-10 text-primary mx-auto" />
            <h1 className="font-headline text-3xl font-bold uppercase">Earnings</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to connect payouts and cash out release sales.
            </p>
            <Button asChild className="w-full font-bold">
              <Link href="/login?next=/earnings">
                <LogIn className="mr-2 h-4 w-4" /> Sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { connect, totals, sales } = summary;
  const payoutsReady = connect.transfersActive && Boolean(connect.accountId);
  const countryLocked = Boolean(connect.accountId);
  const saleCount = sales.length;
  const avgGrossCents =
    saleCount > 0 ? Math.round(sales.reduce((sum, s) => sum + s.amountCents, 0) / saleCount) : 0;
  const lastSaleAt = sales[0]?.createdAt;

  return (
    <div className="container relative z-10 mx-auto max-w-4xl py-10 px-4 space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">Earnings</h1>
          <ConnectBadge ready={payoutsReady && connect.payoutsEnabled} submitted={connect.detailsSubmitted} />
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Fans buy releases once. {firstDropsFeeCashoutLine()} Stripe then pays your bank on its schedule
          (usually a few days after each sale clears).
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-muted/10 border-white/10">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Your share</p>
            <p className="text-2xl font-code font-bold tabular-nums">{centsToUsdLabel(totals.netCents)}</p>
            <p className="text-[10px] text-muted-foreground">After {dropPlatformFeeLabel()} platform fee · you keep {dropArtistShareLabel()}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/10 border-amber-500/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Held</p>
            <p className="text-2xl font-code font-bold tabular-nums text-amber-300">
              {centsToUsdLabel(totals.heldCents)}
            </p>
            <p className="text-[10px] text-muted-foreground">Waiting until payouts are connected</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/10 border-emerald-500/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Sent to Stripe</p>
            <p className="text-2xl font-code font-bold tabular-nums text-emerald-300">
              {centsToUsdLabel(totals.paidCents)}
            </p>
            <p className="text-[10px] text-muted-foreground">On the way to your bank</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/25">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Cash out
          </CardTitle>
          <CardDescription>
            Connect once. New sales land in Stripe automatically. Cash out is Stripe paying your bank — not Ink.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!connect.accountId ? (
            <div className="space-y-3">
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Payout country</Label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-code"
                >
                  {DROP_PAYOUT_COUNTRIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button className="h-12 font-bold uppercase text-xs tracking-widest" onClick={() => void startOnboard()} disabled={busy !== null}>
                {busy === 'onboard' ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
                Connect payouts
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              {!payoutsReady ? (
                <Button className="h-12 font-bold uppercase text-xs tracking-widest" onClick={() => void startOnboard()} disabled={busy !== null}>
                  {busy === 'onboard' ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                  Finish payouts setup
                </Button>
              ) : null}
              {connect.detailsSubmitted ? (
                <Button
                  variant="outline"
                  className="h-12 font-bold uppercase text-xs tracking-widest"
                  onClick={() => void openDashboard()}
                  disabled={busy !== null}
                >
                  {busy === 'dashboard' ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open Stripe payouts
                </Button>
              ) : null}
              {totals.heldCents > 0 && payoutsReady ? (
                <Button
                  variant="secondary"
                  className="h-12 font-bold uppercase text-xs tracking-widest"
                  onClick={() => void releaseHeld()}
                  disabled={busy !== null}
                >
                  {busy === 'release' ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send held sales
                </Button>
              ) : null}
            </div>
          )}
          {countryLocked ? (
            <p className="text-[11px] text-muted-foreground font-code">
              Payout country locked to {connect.country || country}. Bank details live in Stripe.
            </p>
          ) : null}
          {connect.currentlyDue.length > 0 ? (
            <p className="text-[11px] text-amber-300/90">
              Stripe still needs: {connect.currentlyDue.slice(0, 4).join(', ')}
              {connect.currentlyDue.length > 4 ? '…' : ''}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="font-headline text-xl">Sales track</CardTitle>
              <CardDescription>
                Lifetime sold {centsToUsdLabel(totals.grossCents)} · fee {centsToUsdLabel(totals.feeCents)}
              </CardDescription>
            </div>
            {saleCount > 0 ? (
              <div className="flex flex-wrap gap-2 text-[10px] font-code uppercase tracking-widest text-muted-foreground">
                <span className="rounded-md border border-white/10 bg-muted/20 px-2 py-1">
                  {saleCount} sale{saleCount === 1 ? '' : 's'}
                </span>
                <span className="rounded-md border border-white/10 bg-muted/20 px-2 py-1">
                  avg {centsToUsdLabel(avgGrossCents)}
                </span>
                {lastSaleAt ? (
                  <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-emerald-300/90">
                    last {new Date(lastSaleAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No release sales yet. Open New release, set a price, and publish the music link.
            </p>
          ) : (
            <div className="divide-y divide-white/10 rounded-lg border border-white/10 overflow-hidden">
              {sales.map((sale) => {
                const when = new Date(sale.createdAt);
                const stamp = Number.isFinite(when.getTime())
                  ? when.toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : sale.createdAt;
                return (
                  <div
                    key={sale.id}
                    className="grid gap-2 bg-muted/10 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-sm font-bold">{sale.title}</p>
                        <Badge variant="outline" className="text-[8px] uppercase tracking-widest text-fuchsia-200">
                          {sale.scope === 'album' ? 'Album sale' : 'Song sale'}
                        </Badge>
                        {sale.shareId ? (
                          <Link
                            href={`/${sale.scope === 'album' ? 'share' : 'song'}/${sale.shareId}`}
                            className="inline-flex items-center gap-1 text-[10px] font-code uppercase tracking-widest text-primary/90 hover:text-primary"
                          >
                            <Link2 className="h-3 w-3" />
                            Origin · Release {sale.shareId}
                          </Link>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {sale.buyerName?.trim() || 'Fan'}
                        </span>
                        <span className="mx-1.5 text-white/20">·</span>
                        <span className="font-code tabular-nums">{stamp}</span>
                      </p>
                      <p className="text-[10px] font-code uppercase tracking-widest text-muted-foreground">
                        Sale {centsToUsdLabel(sale.amountCents)}
                        <span className="mx-1 text-white/20">·</span>
                        Fee {centsToUsdLabel(sale.feeCents)}
                        <span className="mx-1 text-white/20">·</span>
                        You {centsToUsdLabel(sale.netCents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <p className="font-code text-base font-bold tabular-nums text-emerald-300">
                        {centsToUsdLabel(sale.netCents)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] uppercase tracking-widest',
                          sale.status === 'paid' && 'border-emerald-500/40 text-emerald-300',
                          sale.status === 'held' && 'border-amber-500/40 text-amber-300'
                        )}
                      >
                        {dropSaleStatusLabel(sale.status)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EarningsPage() {
  return (
    <Suspense fallback={<StudioLoader size="lg" fullscreen message="Opening earnings..." />}>
      <EarningsPageContent />
    </Suspense>
  );
}
