'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/client/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp,
  Users,
  Zap,
  DollarSign,
  RefreshCw,
  Target,
  Activity,
  BarChart3,
  ArrowRight,
  Megaphone,
  Save,
  Link2,
} from 'lucide-react';
import type { AdminMetricsResponse } from '@/lib/admin-metrics-types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function MetricCard({
  label,
  value,
  sub,
  accent = 'text-primary',
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="bg-card/60 border border-white/10">
      <CardContent className="pt-5 pb-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-2">{label}</p>
        <p className={cn('text-2xl font-headline font-bold', accent)}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function RateBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wider">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-white">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 h-24 mt-4">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full bg-primary/70 rounded-t-sm min-h-[2px] transition-all"
            style={{ height: `${(d.count / max) * 100}%` }}
            title={`${d.date}: ${d.count}`}
          />
          <span className="text-[7px] text-muted-foreground rotate-0 truncate w-full text-center">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
      {data.length === 0 && (
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest w-full text-center py-8">
          No signup data yet — chart fills as artists join
        </p>
      )}
    </div>
  );
}

export function AdminMetricsTab() {
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adSpend30d, setAdSpend30d] = useState('0');
  const [adSpend90d, setAdSpend90d] = useState('0');
  const [notes, setNotes] = useState('');
  const [savingMarketing, setSavingMarketing] = useState(false);

  const fetchMetrics = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in required');
      const token = await user.getIdToken();
      const qs = forceRefresh ? '?refresh=1' : '';
      const res = await fetch(`/api/admin/metrics${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as AdminMetricsResponse;
      setMetrics(data);
      setAdSpend30d(String(data.acquisition.adSpend30d || 0));
      setAdSpend90d(String(data.acquisition.adSpend90d || 0));
      setNotes(data.acquisition.notes || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const saveMarketing = async () => {
    setSavingMarketing(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adSpend30d: parseFloat(adSpend30d) || 0,
          adSpend90d: parseFloat(adSpend90d) || 0,
          notes,
        }),
      });
      await fetchMetrics();
    } finally {
      setSavingMarketing(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="py-20 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground animate-pulse">
        Aggregating studio metrics…
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="py-10 text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="outline" onClick={() => fetchMetrics(true)} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const { funnel, retention, monetization, freeTierPressure, acquisition, gamification, signupAttribution, guestTryFunnel } =
    metrics;
  const attribution = signupAttribution ?? {
    taggedSignups: 0,
    organicSignups: 0,
    totalLandingHits: 0,
    landingHitsLast30Days: 0,
    byRef: [],
  };
  const guestFunnel = guestTryFunnel ?? {
    opens: 0,
    opensLast7Days: 0,
    opensLast30Days: 0,
    wroteBar: 0,
    demoAiRequests: 0,
    demoAiSuccesses: 0,
    demoAiLimits: 0,
    demoAiErrors: 0,
    optionAccepts: 0,
    optionDismisses: 0,
    lockedFeatureTaps: 0,
    signupCtaClicks: 0,
    guestTrySignups: 0,
    openToWrotePercent: 0,
    wroteToAiPercent: 0,
    aiToAcceptPercent: 0,
    openToCtaPercent: 0,
    openToSignupPercent: 0,
  };

  const cacheLabel = metrics.cache
    ? `${metrics.cache.fromCache ? 'Cached' : 'Live'} · ${format(new Date(metrics.cache.computedAt), 'MMM d, yyyy · h:mm a')}${
        metrics.cache.stale ? ' (stale — refreshing in background)' : ''
      }`
    : format(new Date(metrics.generatedAt), 'MMM d, yyyy · h:mm a');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-headline font-bold uppercase text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> 90-Day Growth Metrics
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            {cacheLabel}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMetrics(true)}
          disabled={loading}
          className="gap-2 text-[10px] uppercase tracking-widest"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> Recompute
        </Button>
      </div>

      {/* Top funnel KPIs */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Users className="h-3 w-3" /> Top of funnel
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total signups" value={funnel.totalSignups} sub="All-time roster" />
          <MetricCard label="Last 7 days" value={funnel.signupsLast7Days} accent="text-sky-400" />
          <MetricCard label="Last 30 days" value={funnel.signupsLast30Days} accent="text-sky-400" />
          <MetricCard label="Last 90 days" value={funnel.signupsLast90Days} accent="text-sky-400" />
        </div>
        <Card className="mt-4 bg-card/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest">Signups — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupsChart data={funnel.signupsByDay} />
          </CardContent>
        </Card>
      </section>

      {/* Signup link attribution */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Link2 className="h-3 w-3" /> Signup link refs (?ref=)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard
            label="Landing hits (90d)"
            value={attribution.totalLandingHits}
            sub="Tagged ?ref= visits"
            accent="text-amber-400"
          />
          <MetricCard
            label="Landing hits (30d)"
            value={attribution.landingHitsLast30Days}
            sub="Recent ad / bio traffic"
            accent="text-amber-400"
          />
          <MetricCard
            label="Tagged signups"
            value={attribution.taggedSignups}
            sub="Arrived with ?ref= at signup"
            accent="text-sky-400"
          />
          <MetricCard
            label="Organic / direct"
            value={attribution.organicSignups}
            sub="No ref captured at signup"
          />
        </div>
        <Card className="bg-card/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest">Funnel by referral link</CardTitle>
            <CardDescription className="text-[10px]">
              Landing hits vs signups from{' '}
              <span className="font-mono">bar4bar.ink/login?mode=signup&amp;ref=tiktok</span>, etc.
              Use that URL in TikTok Promote and bios.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">Landings</TableHead>
                  <TableHead className="text-right">Land 30d</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                  <TableHead className="text-right">Conv %</TableHead>
                  <TableHead className="text-right">Activated</TableHead>
                  <TableHead className="text-right">Act %</TableHead>
                  <TableHead className="text-right">Pro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attribution.byRef.length > 0 ? (
                  attribution.byRef.map((row) => (
                    <TableRow key={row.ref} className="border-white/5">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold uppercase">{row.label}</span>
                          {row.ref !== 'organic' && (
                            <span className="text-[10px] font-mono text-muted-foreground">?ref={row.ref}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-amber-400/90">
                        {row.landingHitsTotal}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {row.landingHitsLast30Days}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.signupsTotal}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-sky-400">
                        {row.landingHitsTotal > 0 ? `${row.signupConversionRatePercent}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{row.activated}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-400">
                        {row.signupsTotal > 0 ? `${row.activationRatePercent}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-primary">{row.proActive}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      No ref traffic yet — use Promote URL <span className="font-mono">?ref=tiktok</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Guest try-sheet funnel */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Target className="h-3 w-3" /> Guest try sheet (pre-signup)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Opens (90d)" value={guestFunnel.opens} sub={`${guestFunnel.opensLast7Days} last 7d`} accent="text-emerald-400" />
          <MetricCard label="Wrote a bar" value={guestFunnel.wroteBar} sub={`${guestFunnel.openToWrotePercent}% of opens`} />
          <MetricCard label="Demo AI success" value={guestFunnel.demoAiSuccesses} sub={`${guestFunnel.demoAiLimits} hit limit · ${guestFunnel.demoAiErrors} errors`} accent="text-sky-400" />
          <MetricCard label="Accepted a line" value={guestFunnel.optionAccepts} sub={`${guestFunnel.aiToAcceptPercent}% of AI wins`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Signup CTA clicks" value={guestFunnel.signupCtaClicks} sub={`${guestFunnel.openToCtaPercent}% of opens`} accent="text-amber-400" />
          <MetricCard label="Guest → signup" value={guestFunnel.guestTrySignups} sub={`${guestFunnel.openToSignupPercent}% of opens`} accent="text-emerald-400" />
          <MetricCard label="Locked feature taps" value={guestFunnel.lockedFeatureTaps} sub="Wanted Ink tools before signup" />
          <MetricCard label="Dismissed AI" value={guestFunnel.optionDismisses} sub="Generated then skipped" />
        </div>
        <Card className="bg-card/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest">Try-sheet conversion ladder</CardTitle>
            <CardDescription className="text-[10px]">
              Anonymous funnel — where guests drop before creating an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <RateBar label="Open → wrote bar" value={guestFunnel.openToWrotePercent} />
            <RateBar label="Wrote → demo AI success" value={guestFunnel.wroteToAiPercent} />
            <RateBar label="AI success → accepted line" value={guestFunnel.aiToAcceptPercent} />
            <RateBar label="Open → signup CTA" value={guestFunnel.openToCtaPercent} />
            <RateBar label="Open → signup" value={guestFunnel.openToSignupPercent} />
          </CardContent>
        </Card>
      </section>

      {/* Activation */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Zap className="h-3 w-3" /> Activation (1+ AI action)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Activated users"
            value={funnel.activatedUsers}
            sub="Used AI at least once"
          />
          <MetricCard
            label="Activation rate"
            value={`${funnel.activationRatePercent}%`}
            sub="Target: 40–60% early"
            accent="text-emerald-400"
          />
          <MetricCard
            label="Avg hrs → first AI"
            value={funnel.avgHoursToFirstAi ?? '—'}
            sub="Lower is better"
          />
          <MetricCard
            label="Avg hrs → first bar"
            value={funnel.avgHoursToFirstGenerateNextLine ?? '—'}
            sub="Generate Next Line"
            accent="text-amber-400"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <MetricCard label="Track editor opens" value={funnel.trackEditorOpens} sub="Opened a track workstation" />
          <MetricCard label="Upgrade clicks" value={freeTierPressure.upgradeClickEvents} sub="From pricing / CTAs" />
        </div>
      </section>

      {/* Monetization funnel */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Target className="h-3 w-3" /> Pricing → checkout → paid
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Pricing views" value={funnel.pricingPageViews} />
          <MetricCard label="Checkout starts" value={funnel.checkoutStarts} accent="text-sky-400" />
          <MetricCard label="Checkouts paid" value={funnel.checkoutCompletions} accent="text-emerald-400" />
          <MetricCard label="Signup → paid" value={`${funnel.signupToPaidRatePercent}%`} accent="text-primary" />
        </div>
        <Card className="bg-card/40 border-white/10">
          <CardContent className="pt-6 space-y-4">
            <RateBar label="Pricing → checkout start" value={funnel.pricingToCheckoutRatePercent} />
            <RateBar label="Checkout start → paid" value={funnel.checkoutToPaidRatePercent} />
          </CardContent>
        </Card>
      </section>

      {/* Revenue */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <DollarSign className="h-3 w-3" /> Revenue & MRR
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Est. MRR" value={`$${monetization.estimatedMrr}`} sub="Active subs × tier price" accent="text-emerald-400" />
          <MetricCard label="Pro monthly" value={monetization.activeProMonthly} />
          <MetricCard label="Pro yearly" value={monetization.activeProYearly} accent="text-accent" />
          <MetricCard label="Rev / paying user" value={`$${monetization.avgRevenuePerPayingUser}`} sub="90d avg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <MetricCard label="Sub revenue (30d)" value={`$${monetization.subscriptionRevenue30d}`} />
          <MetricCard label="Ink packs (30d)" value={`$${monetization.inkPackRevenue30d}`} />
          <MetricCard label="Total (30d)" value={`$${monetization.totalRevenue30d}`} accent="text-primary" />
        </div>
      </section>

      {/* Retention */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Activity className="h-3 w-3" /> Retention
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="7-day return rate" value={`${retention.sevenDayReturnRatePercent}%`} sub="Came back within 7 days of signup" accent="text-sky-400" />
          <MetricCard label="Users returned (7d)" value={retention.usersWith7DayReturn} />
          <MetricCard label="Active last 7d" value={retention.activeLast7Days} />
          <MetricCard label="Active last 30d" value={retention.activeLast30Days} />
        </div>
      </section>

      {/* Gamification */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-3 w-3" /> Gamification
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Users w/ badges" value={gamification.usersWithAchievements} accent="text-primary" />
          <MetricCard label="Achievement unlocks" value={gamification.achievementUnlockEvents} sub="Recent events" />
          <MetricCard label="Avg streak (active)" value={gamification.avgStreakActiveUsers} sub="Days" accent="text-amber-400" />
          <MetricCard label="Leaderboard views" value={gamification.leaderboardViews} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          <MetricCard label="Share cards made" value={gamification.shareCardGenerated} />
          <MetricCard label="Share cards opened" value={gamification.shareCardOpened} />
          <MetricCard label="Streak milestones" value={gamification.streakMilestoneEvents} />
        </div>
      </section>

      {/* Free tier pressure */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-3 w-3" /> Free tier upgrade triggers
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="At album limit" value={freeTierPressure.usersAtAlbumLimit} sub={`${1} album free`} />
          <MetricCard label="At track limit" value={freeTierPressure.usersAtTrackLimit} sub={`${2} tracks free`} />
          <MetricCard label="Low ink (balance)" value={freeTierPressure.usersLowInk} sub="Near empty balance" accent="text-orange-400" />
          <MetricCard label="Low ink hits" value={freeTierPressure.lowInkHitEvents} sub="Blocked AI actions" accent="text-orange-400" />
          <MetricCard label="Ink depleted" value={freeTierPressure.usersInkDepleted} sub={`${freeTierPressure.inkDepletedChurned30d} churned 30d`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          <MetricCard label="Slot limit hits" value={freeTierPressure.freeLimitHitEvents} sub={`Album ${freeTierPressure.freeLimitHitsByType.album} · Track ${freeTierPressure.freeLimitHitsByType.track}`} />
          <MetricCard label="Trial quest done" value={freeTierPressure.trialQuestCompleteEvents} sub="DNA vault save" accent="text-sky-400" />
          <MetricCard label="Depletion events" value={freeTierPressure.inkDepletionEvents} sub="Balance hit zero" />
          <MetricCard label="Upgrade clicks" value={freeTierPressure.upgradeClickEvents} sub="Recent events" />
          <MetricCard
            label="Clicks: slot / ink"
            value={`${freeTierPressure.upgradeClicksByTrigger.slot_limit} / ${freeTierPressure.upgradeClicksByTrigger.low_ink}`}
            sub={`Quest ${freeTierPressure.upgradeClicksByTrigger.trial_quest} · Pricing ${freeTierPressure.upgradeClicksByTrigger.pricing}`}
          />
        </div>
      </section>

      {/* Acquisition / ad spend */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Megaphone className="h-3 w-3" /> Paid acquisition (manual entry)
        </h3>
        <Card className="bg-card/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm uppercase">Ad spend & CPS</CardTitle>
            <CardDescription className="text-[10px]">
              Enter TikTok / Meta spend to calculate cost per signup and cost per activated user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest">Ad spend — last 30 days ($)</Label>
                <Input type="number" min="0" step="0.01" value={adSpend30d} onChange={(e) => setAdSpend30d(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest">Ad spend — last 90 days ($)</Label>
                <Input type="number" min="0" step="0.01" value={adSpend90d} onChange={(e) => setAdSpend90d(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest">Campaign notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hook A: stuck on next bar · $12/day TikTok…" className="min-h-[80px] text-xs" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <MetricCard
                label="Cost per signup (30d)"
                value={acquisition.costPerSignup != null ? `$${acquisition.costPerSignup}` : '—'}
                sub={funnel.signupsLast30Days > 0 ? `${funnel.signupsLast30Days} signups` : 'No signups yet'}
              />
              <MetricCard
                label="Cost per activated (30d)"
                value={acquisition.costPerActivatedUser != null ? `$${acquisition.costPerActivatedUser}` : '—'}
                sub={`${funnel.activatedUsers} activated total`}
              />
            </div>
            <Button onClick={saveMarketing} disabled={savingMarketing} className="gap-2 uppercase text-[10px] tracking-widest">
              <Save className="h-3 w-3" /> {savingMarketing ? 'Saving…' : 'Save ad spend'}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Recent events */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <ArrowRight className="h-3 w-3" /> Recent analytics events
        </h3>
        <Card className="bg-card/40 border-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentEvents.length > 0 ? (
                  metrics.recentEvents.map((ev, i) => (
                    <TableRow key={`${ev.timestamp}-${i}`} className="border-white/5">
                      <TableCell className="text-[10px] font-code text-muted-foreground">
                        {ev.timestamp ? format(new Date(ev.timestamp), 'MM/dd HH:mm') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[8px] uppercase">{ev.event}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold uppercase">{ev.userName || ev.userId.slice(0, 8)}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-code truncate max-w-[200px]">
                        {Object.keys(ev.metadata).length > 0 ? JSON.stringify(ev.metadata) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      No events yet — tracking starts as users sign up and use the studio
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
