'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { adminApiFetch } from '@/lib/admin-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  Users,
  Zap,
  DollarSign,
  RefreshCw,
  Target,
  Activity,
  BarChart3,
  Megaphone,
  Save,
  Link2,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import type { AdminMetricsResponse } from '@/lib/admin-metrics-types';
import {
  DEFAULT_METRICS_RANGE,
  METRICS_RANGES,
  type MetricsRangeKey,
} from '@/lib/admin-metrics-range';
import { formatAdminMetricsJson, formatAdminMetricsMarkdown } from '@/lib/admin-metrics-export';
import { AdminActivitySheet } from '@/components/admin-activity-sheet';
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

export function AdminMetricsTab({ embedded = false }: { embedded?: boolean }) {
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<MetricsRangeKey>(DEFAULT_METRICS_RANGE);
  const [adSpend30d, setAdSpend30d] = useState('0');
  const [adSpend90d, setAdSpend90d] = useState('0');
  const [notes, setNotes] = useState('');
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchMetrics = useCallback(async (forceRefresh = false, rangeKey: MetricsRangeKey = range) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('range', rangeKey);
      if (forceRefresh) params.set('refresh', '1');
      const res = await adminApiFetch(`/api/admin/metrics?${params.toString()}`);
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
  }, [range]);

  useEffect(() => {
    fetchMetrics(false, range);
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps -- reload when range changes

  const downloadText = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportStamp = () => {
    const key = metrics?.period?.key || range;
    const day = format(new Date(), 'yyyy-MM-dd');
    return `akasheet-growth-metrics-${key}-${day}`;
  };

  const handleCopyMarkdown = async () => {
    if (!metrics) return;
    const md = formatAdminMetricsMarkdown(metrics);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!metrics) return;
    downloadText(`${exportStamp()}.md`, formatAdminMetricsMarkdown(metrics), 'text/markdown;charset=utf-8');
  };

  const handleDownloadJson = () => {
    if (!metrics) return;
    downloadText(`${exportStamp()}.json`, formatAdminMetricsJson(metrics), 'application/json;charset=utf-8');
  };

  const saveMarketing = async () => {
    setSavingMarketing(true);
    try {
      await adminApiFetch('/api/admin/marketing', {
        method: 'POST',
        body: JSON.stringify({
          adSpend30d: parseFloat(adSpend30d) || 0,
          adSpend90d: parseFloat(adSpend90d) || 0,
          notes,
        }),
      });
      await fetchMetrics(true, range);
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
          <Button variant="outline" onClick={() => fetchMetrics(true, range)} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const { funnel, retention, monetization, freeTierPressure, acquisition, gamification, signupAttribution, guestTryFunnel, lockFunnel } =
    metrics;
  const attribution = signupAttribution ?? {
    taggedSignups: 0,
    organicSignups: 0,
    totalLandingHits: 0,
    landingHitsLast30Days: 0,
    landingHitsLast90Days: 0,
    byRef: [],
  };
  const guestFunnel = guestTryFunnel ?? {
    opens: 0,
    opensLast7Days: 0,
    opensLast30Days: 0,
    opensLast90Days: 0,
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
  const lockStats = lockFunnel ?? {
    opens: 0,
    opensLast7Days: 0,
    opensLast30Days: 0,
    opensLast90Days: 0,
    typed: 0,
    submits: 0,
    branches: 0,
    shareCards: 0,
    nameCtas: 0,
    whereNext: 0,
    studioOpens: 0,
    writeAnother: 0,
    bloodlineOpens: 0,
    signupCtas: 0,
    openToTypedPercent: 0,
    typedToSubmitPercent: 0,
    openToSubmitPercent: 0,
    branchOfSubmitPercent: 0,
    openToNameCtaPercent: 0,
    openToSignupCtaPercent: 0,
  };

  const cacheLabel = metrics.cache
    ? `${metrics.cache.fromCache ? 'Cached' : 'Live'} · ${format(new Date(metrics.cache.computedAt), 'MMM d, yyyy · h:mm a')}${
        metrics.cache.stale ? ' (stale — refreshing in background)' : ''
      }`
    : format(new Date(metrics.generatedAt), 'MMM d, yyyy · h:mm a');

  const period = metrics.period ?? {
    key: range,
    label: METRICS_RANGES.find((r) => r.key === range)?.label || 'All time',
    days: null as number | null,
    startAt: null as string | null,
    endAt: metrics.generatedAt,
  };
  const periodDays = period.days;
  const show7 = periodDays == null || periodDays >= 7;
  const show30 = periodDays == null || periodDays >= 30;
  const show90 = periodDays == null || periodDays >= 90;
  const periodSub =
    periodDays == null
      ? 'All-time (day 1 → now)'
      : `${period.label} · through ${format(new Date(period.endAt), 'MMM d, yyyy')}`;

  return (
    <div className={cn('space-y-8', embedded && 'pt-2')}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3 min-w-0">
          <div>
            {embedded ? (
              <h3 className="text-lg font-headline font-bold uppercase text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Growth Metrics
              </h3>
            ) : (
              <h2 className="text-xl font-headline font-bold uppercase text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Growth Metrics
              </h2>
            )}
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
              {periodSub} · {cacheLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Time range</Label>
            <Select
              value={range}
              onValueChange={(v) => setRange(v as MetricsRangeKey)}
            >
              <SelectTrigger className="w-[180px] h-9 text-[11px] uppercase tracking-wider">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {METRICS_RANGES.map((r) => (
                  <SelectItem key={r.key} value={r.key} className="text-[11px] uppercase tracking-wider">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            disabled={!metrics}
            className="gap-2 text-[10px] uppercase tracking-widest"
            title="Copy full Markdown dump for AI analysis"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy for AI'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
            disabled={!metrics}
            className="gap-2 text-[10px] uppercase tracking-widest"
          >
            <Download className="h-3 w-3" /> MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            disabled={!metrics}
            className="gap-2 text-[10px] uppercase tracking-widest"
          >
            <Download className="h-3 w-3" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics(true, range)}
            disabled={loading}
            className="gap-2 text-[10px] uppercase tracking-widest"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> Recompute
          </Button>
        </div>
      </div>

      {/* Top funnel KPIs */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Users className="h-3 w-3" /> Top of funnel
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Signups in period" value={funnel.totalSignups} sub={period.label} />
          {show7 && <MetricCard label="Last 7 days" value={funnel.signupsLast7Days} accent="text-sky-400" />}
          {show30 && <MetricCard label="Last 30 days" value={funnel.signupsLast30Days} accent="text-sky-400" />}
          {show90 && <MetricCard label="Last 90 days" value={funnel.signupsLast90Days} accent="text-sky-400" />}
        </div>
        <Card className="mt-4 bg-card/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest">
              Signups by day{periodDays != null && periodDays <= 90 ? ` — ${period.label}` : ' — chart window'}
            </CardTitle>
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
            label="Landing hits (period)"
            value={attribution.totalLandingHits}
            sub="Tagged ?ref= visits"
            accent="text-amber-400"
          />
          {show90 && (
            <MetricCard
              label="Landing hits (90d)"
              value={attribution.landingHitsLast90Days}
              sub="Recent ad / bio traffic"
              accent="text-amber-400"
            />
          )}
          {show30 && (
            <MetricCard
              label="Landing hits (30d)"
              value={attribution.landingHitsLast30Days}
              sub="This month’s window"
              accent="text-amber-400"
            />
          )}
          <MetricCard
            label="Tagged signups"
            value={attribution.taggedSignups}
            sub={`${attribution.organicSignups} organic / direct`}
            accent="text-sky-400"
          />
        </div>
        <Card className="bg-card/40 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest">Funnel by referral link</CardTitle>
            <CardDescription className="text-[10px]">
              Landing hits vs signups from{' '}
              <span className="font-mono">akasheet.com/login?mode=signup&amp;ref=tiktok</span>, etc.
              Use that URL in TikTok Promote and bios.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">Land all</TableHead>
                  <TableHead className="text-right">Land 90d</TableHead>
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
                        {row.landingHitsLast90Days}
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
                    <TableCell colSpan={9} className="h-20 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
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
          <MetricCard
            label="Opens (period)"
            value={guestFunnel.opens}
            sub={
              [
                show90 ? `${guestFunnel.opensLast90Days} last 90d` : null,
                show7 ? `${guestFunnel.opensLast7Days} last 7d` : null,
              ]
                .filter(Boolean)
                .join(' · ') || period.label
            }
            accent="text-emerald-400"
          />
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

      {/* LOCK / finish-the-bar funnel */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground mb-4 flex items-center gap-2">
          <Target className="h-3 w-3 text-emerald-400" /> Finish-the-bar funnel
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard
            label="Opens (period)"
            value={lockStats.opens}
            sub={
              [
                show90 ? `${lockStats.opensLast90Days} last 90d` : null,
                show7 ? `${lockStats.opensLast7Days} last 7d` : null,
              ]
                .filter(Boolean)
                .join(' · ') || period.label
            }
            accent="text-emerald-400"
          />
          <MetricCard label="Typed a bar" value={lockStats.typed} sub={`${lockStats.openToTypedPercent}% of opens`} />
          <MetricCard label="Locked (submit)" value={lockStats.submits} sub={`${lockStats.openToSubmitPercent}% of opens`} accent="text-sky-400" />
          <MetricCard
            label="Answered after someone"
            value={lockStats.branches}
            sub={`${lockStats.branchOfSubmitPercent}% of submits`}
            accent="text-amber-300"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Name echo CTA" value={lockStats.nameCtas} sub={`${lockStats.openToNameCtaPercent}% of opens`} />
          <MetricCard label="Signup CTA" value={lockStats.signupCtas} sub={`${lockStats.openToSignupCtaPercent}% of opens`} accent="text-amber-400" />
          <MetricCard label="Where next taps" value={lockStats.whereNext} sub={`${lockStats.bloodlineOpens} all replies · ${lockStats.studioOpens} studio`} />
          <MetricCard label="Share card" value={lockStats.shareCards} sub={`${lockStats.writeAnother} write another`} />
        </div>
        <Card className="bg-card/40 border-emerald-500/15">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-widest">LOCK drop-off ladder</CardTitle>
            <CardDescription className="text-[10px]">
              Where visitors fall off before naming / signup. Telegram fires on opens, locks, branches, name CTA, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <RateBar label="Open → typed" value={lockStats.openToTypedPercent} />
            <RateBar label="Typed → locked" value={lockStats.typedToSubmitPercent} />
            <RateBar label="Open → locked" value={lockStats.openToSubmitPercent} />
            <RateBar label="Submit → branched (answered someone)" value={lockStats.branchOfSubmitPercent} />
            <RateBar label="Open → name CTA" value={lockStats.openToNameCtaPercent} />
            <RateBar label="Open → signup CTA" value={lockStats.openToSignupCtaPercent} />
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

      <AdminActivitySheet />
    </div>
  );
}
