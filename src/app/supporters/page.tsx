'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Download,
  Headphones,
  HeartHandshake,
  Network,
  Radio,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  TrendingUp,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StudioLoader } from '@/components/studio-loader';
import { profileHref } from '@/lib/profile/profile-slug';
import { fetchSupportDashboard, updateSupportRelationship } from '@/lib/relationships-client';
import { centsToUsdLabel } from '@/lib/drop-commerce';
import type {
  SupportAnalyticsWindow,
  SupportDashboard,
  SupportRelationshipRow,
} from '@/lib/relationships';

function ago(value: string): string {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
}

function sourceLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-white/10 bg-card/65">
      <CardContent className="p-4">
        <Icon className="mb-3 h-5 w-5 text-fuchsia-300" />
        <p className="font-code text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function RateBar({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3 text-xs">
        <span className="font-bold">{label}</span>
        <span className="font-code font-bold tabular-nums text-sky-300">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}

function PersonRow({ row, action }: { row: SupportRelationshipRow; action?: React.ReactNode }) {
  const href = row.profileSlug ? profileHref(row.profileSlug) : undefined;
  const name = href ? (
    <Link href={href} className="font-bold hover:text-primary">{row.displayName}</Link>
  ) : (
    <span className="font-bold">{row.displayName}</span>
  );
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
        {row.innerCircle ? <Star className="h-4 w-4 fill-amber-300 text-amber-300" /> : <HeartHandshake className="h-4 w-4 text-fuchsia-300" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{name}</p>
        <p className="flex flex-wrap gap-x-1.5 text-[9px] font-code uppercase tracking-wider text-muted-foreground">
          <span>{row.innerCircle ? 'Inner Circle' : 'Supporter'}</span>
          {row.mutual ? <span className="text-sky-300">· Mutual</span> : null}
          {row.engagement?.qualifiedListeningDays ? (
            <span>· {row.engagement.qualifiedListeningDays} listen day{row.engagement.qualifiedListeningDays === 1 ? '' : 's'}</span>
          ) : null}
          {row.engagement?.purchaseCount ? (
            <span>· {row.engagement.purchaseCount} purchase{row.engagement.purchaseCount === 1 ? '' : 's'}</span>
          ) : null}
          {row.engagement?.totalPaidCents ? (
            <span className="text-emerald-300">· {centsToUsdLabel(row.engagement.totalPaidCents)}</span>
          ) : null}
          {row.updatedAt ? <span>· {ago(row.updatedAt)}</span> : null}
        </p>
      </div>
      {action}
    </div>
  );
}

export default function SupportersPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<SupportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [days, setDays] = useState<SupportAnalyticsWindow>(30);
  const [supporterSearch, setSupporterSearch] = useState('');
  const [supporterSort, setSupporterSort] = useState<'recent' | 'listening' | 'support' | 'inner'>('recent');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setData(await fetchSupportDashboard(user.id, days));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Support circle unavailable',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [days, toast, user?.id]);

  useEffect(() => {
    if (!authLoading && user?.id) void load();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, load, user]);

  const change = async (
    row: SupportRelationshipRow,
    action: 'unfollow' | 'inner_circle_on' | 'inner_circle_off'
  ) => {
    if (!user?.id) return;
    setBusyId(row.userId);
    try {
      await updateSupportRelationship({ userId: user.id, targetUserId: row.userId, action });
      await load();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not update support',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId('');
    }
  };

  const filteredFollowers = useMemo(() => {
    const query = supporterSearch.trim().toLowerCase();
    const rows = (data?.followers || []).filter((row) =>
      !query || row.displayName.toLowerCase().includes(query)
    );
    return [...rows].sort((a, b) => {
      if (supporterSort === 'listening') {
        return (b.engagement?.qualifiedListeningDays || 0) - (a.engagement?.qualifiedListeningDays || 0);
      }
      if (supporterSort === 'support') {
        return (b.engagement?.totalPaidCents || 0) - (a.engagement?.totalPaidCents || 0);
      }
      if (supporterSort === 'inner') {
        return Number(b.innerCircle) - Number(a.innerCircle) || b.updatedAt.localeCompare(a.updatedAt);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [data?.followers, supporterSearch, supporterSort]);

  const maxGrowth = useMemo(
    () => Math.max(1, ...(data?.analytics.growth.map((row) => row.newFollowers) || [1])),
    [data?.analytics.growth]
  );

  const exportSupporters = () => {
    if (!data?.followers.length) return;
    const escapeCell = (value: string | number | boolean) => {
      const safe = String(value).replace(/^([=+@-])/, "'$1").replaceAll('"', '""');
      return `"${safe}"`;
    };
    const rows = [
      ['Name', 'Profile', 'Inner Circle', 'Mutual', 'Joined', 'Qualified listening days', 'Last qualified listen', 'Purchases', 'Gross support'],
      ...data.followers.map((row) => [
        row.displayName,
        row.profileSlug || '',
        row.innerCircle,
        row.mutual === true,
        row.createdAt,
        row.engagement?.qualifiedListeningDays || 0,
        row.engagement?.lastQualifiedAt || '',
        row.engagement?.purchaseCount || 0,
        (row.engagement?.totalPaidCents || 0) / 100,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bar4bar-support-circle-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (authLoading || loading) return <StudioLoader size="lg" fullscreen message="Reading your support circle..." />;
  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="max-w-md text-center"><CardContent className="space-y-4 p-8">
          <HeartHandshake className="mx-auto h-10 w-10 text-fuchsia-300" />
          <h1 className="font-headline text-3xl font-bold uppercase">Support Circle</h1>
          <p className="text-sm text-muted-foreground">Sign in to see who supports you and manage your Inner Circle.</p>
          <Button asChild><Link href="/login?next=/supporters">Sign in</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const analytics = data?.analytics;
  const maxSource = Math.max(1, ...(analytics?.sources.map((row) => row.supporters) || [1]));
  const funnelMax = Math.max(1, data?.totals.followers || 0);
  const metrics: Array<{ label: string; value: string | number; note: string; icon: LucideIcon }> = [
    { label: 'Current supporters', value: data?.totals.followers || 0, note: 'People following your live profile now.', icon: HeartHandshake },
    { label: `New in ${days} days`, value: analytics?.newFollowers || 0, note: 'Current supporters who joined during this window.', icon: TrendingUp },
    { label: 'Active listeners', value: analytics?.activeFollowerListeners || 0, note: `Supporters with a verified 80%+ listen in the last ${days} days.`, icon: Headphones },
    { label: 'Paid supporters', value: analytics?.periodFollowerBuyers || 0, note: `Current supporters who purchased in the last ${days} days.`, icon: ShoppingBag },
    { label: 'Gross support', value: centsToUsdLabel(analytics?.periodGrossCents || 0), note: `All successful First Drop support in the last ${days} days.`, icon: CircleDollarSign },
    { label: 'Inner Circle', value: data?.totals.innerCircleSupporters || 0, note: `${analytics?.rates.innerCirclePercent || 0}% of your supporter base.`, icon: Star },
    { label: 'Mutual support', value: analytics?.mutualSupporters || 0, note: 'Supporters you also intentionally follow.', icon: Network },
    { label: 'Lifetime purchases', value: analytics?.lifetimePurchases || 0, note: 'Successful First Drop purchases in your recorded sales history.', icon: Activity },
  ];

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-code text-[10px] font-bold uppercase tracking-[0.26em] text-fuchsia-300">Artist relationship intelligence</p>
          <h1 className="mt-1 font-headline text-4xl font-bold uppercase">Support Circle</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            See who follows, listens, returns, and financially supports your work. These are authenticated relationships,
            qualified listening signals, and successful First Drop purchases—not estimated social impressions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([7, 30, 90] as const).map((value) => (
            <Button key={value} size="sm" variant={days === value ? 'default' : 'outline'} onClick={() => setDays(value)}>
              {value}D
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={exportSupporters} disabled={!data?.followers.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Button size="sm" variant="outline" asChild><Link href="/insights"><BarChart3 className="mr-1.5 h-4 w-4" /> Listener Insights</Link></Button>
          <Button size="icon" variant="outline" onClick={() => void load()} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <Card className="border-sky-500/20 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-headline uppercase"><TrendingUp className="h-5 w-5 text-sky-300" /> Supporter growth</CardTitle>
            <p className="text-[10px] text-muted-foreground">Join dates for people who still support you now. Unfollows are not retained as historical people records.</p>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-1 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
              {analytics?.growth.map((row) => (
                <div key={row.day} className="group flex h-full min-w-0 flex-1 items-end gap-px" title={`${row.day}: ${row.newFollowers} new supporter${row.newFollowers === 1 ? '' : 's'} · ${row.newInnerCircle} Inner Circle`}>
                  <div className="w-2/3 min-h-0.5 rounded-t bg-gradient-to-t from-sky-700 to-sky-300 transition group-hover:brightness-125" style={{ height: `${Math.max(1, (row.newFollowers / maxGrowth) * 100)}%` }} />
                  <div className="w-1/3 min-h-0.5 rounded-t bg-gradient-to-t from-amber-700 to-amber-300 transition group-hover:brightness-125" style={{ height: `${Math.max(1, (row.newInnerCircle / maxGrowth) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[9px] font-code uppercase tracking-wider text-muted-foreground">
              <span>{analytics?.growth[0]?.day || ''}</span>
              <span><span className="text-sky-300">new</span> + <span className="text-amber-300">Inner Circle</span></span>
              <span>{analytics?.growth.at(-1)?.day || ''}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-fuchsia-500/20 bg-card/60">
          <CardHeader><CardTitle className="flex items-center gap-2 font-headline uppercase"><Network className="h-5 w-5 text-fuchsia-300" /> Support funnel</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Current supporters', value: data?.totals.followers || 0, color: 'from-fuchsia-600 to-fuchsia-300' },
              { label: `Active listeners · ${days}D`, value: analytics?.activeFollowerListeners || 0, color: 'from-sky-600 to-sky-300' },
              { label: `Paid supporters · ${days}D`, value: analytics?.periodFollowerBuyers || 0, color: 'from-emerald-600 to-emerald-300' },
              { label: 'Repeat buyers · lifetime', value: analytics?.repeatFollowerBuyers || 0, color: 'from-amber-600 to-amber-300' },
            ].map((row) => (
              <div key={row.label} className="space-y-1.5">
                <div className="flex justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>{row.label}</span><strong className="font-code text-foreground">{row.value}</strong></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full bg-gradient-to-r ${row.color}`} style={{ width: `${Math.max(row.value ? 3 : 0, (row.value / funnelMax) * 100)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-violet-500/20 bg-card/60">
          <CardHeader><CardTitle className="font-headline uppercase">Relationship strength</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <RateBar label="Active listener rate" value={analytics?.rates.activeListenerPercent || 0} note={`Current supporters who qualified on a stream in ${days} days.`} />
            <RateBar label="Supporter → buyer rate" value={analytics?.rates.supporterBuyerPercent || 0} note={`Current supporters who purchased during the window.`} />
            <RateBar label="Mutual support rate" value={analytics?.rates.mutualPercent || 0} note="Supporters whose work you also follow." />
            <RateBar label="Inner Circle rate" value={analytics?.rates.innerCirclePercent || 0} note="Supporters who intentionally keep you closest." />
            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Repeat listeners</p><strong className="mt-1 block font-code text-lg text-sky-300">{analytics?.repeatFollowerListeners || 0}</strong></div>
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Live profiles</p><strong className="mt-1 block font-code text-lg text-sky-300">{analytics?.rates.publicProfilePercent || 0}%</strong></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-card/60">
          <CardHeader><CardTitle className="flex items-center gap-2 font-headline uppercase"><CircleDollarSign className="h-5 w-5 text-emerald-300" /> Support value</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Last {days} days</p>
              <p className="mt-1 font-code text-3xl font-bold text-emerald-300">{centsToUsdLabel(analytics?.periodGrossCents || 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{analytics?.periodPurchases || 0} successful purchase{analytics?.periodPurchases === 1 ? '' : 's'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">From current circle</p><strong className="mt-1 block font-code text-lg text-sky-300">{centsToUsdLabel(analytics?.followerPeriodGrossCents || 0)}</strong></div>
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Circle share</p><strong className="mt-1 block font-code text-lg text-sky-300">{analytics?.rates.supporterRevenuePercent || 0}%</strong></div>
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Lifetime gross</p><strong className="mt-1 block font-code text-lg">{centsToUsdLabel(analytics?.lifetimeGrossCents || 0)}</strong></div>
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Repeat buyers</p><strong className="mt-1 block font-code text-lg">{analytics?.repeatFollowerBuyers || 0}</strong></div>
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Lifetime from circle</p><strong className="mt-1 block font-code text-lg">{centsToUsdLabel(analytics?.followerLifetimeGrossCents || 0)}</strong></div>
              <div className="rounded-lg border border-white/10 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Repeat buyer rate</p><strong className="mt-1 block font-code text-lg">{analytics?.rates.repeatBuyerPercent || 0}%</strong></div>
            </div>
            <Button variant="outline" className="w-full" asChild><Link href="/earnings">Open full earnings details</Link></Button>
          </CardContent>
        </Card>

        <Card className="border-sky-500/20 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline uppercase"><Radio className="h-5 w-5 text-sky-300" /> Discovery origins</CardTitle>
            <p className="text-[10px] text-muted-foreground">Most recent qualified-listen origin for active supporters in this window.</p>
          </CardHeader>
          <CardContent>
            {analytics?.sources.length ? (
              <div className="space-y-3">
                {analytics.sources.map((row) => (
                  <div key={row.source} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>{sourceLabel(row.source)}</span><strong className="font-code text-sky-300">{row.supporters}</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-sky-300" style={{ width: `${(row.supporters / maxSource) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm leading-relaxed text-muted-foreground">No current supporter reached a verified 80% listen during this window yet. Share a First Drop from Artist Home or The Scene to begin measuring acquisition.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-500/20 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline uppercase"><ShoppingBag className="h-5 w-5 text-emerald-300" /> Top financial supporters</CardTitle>
          <p className="text-[10px] text-muted-foreground">Ranked by support in the selected window, then lifetime support. Gross paid is shown here; fees, net, transfers, and payout status stay in Earnings.</p>
        </CardHeader>
        <CardContent className="p-0">
          {analytics?.topSupporters.length ? (
            <div className="divide-y divide-white/10">
              {analytics.topSupporters.map((supporter, index) => {
                const href = supporter.profileSlug ? profileHref(supporter.profileSlug) : undefined;
                return (
                  <div key={supporter.userId} className="grid gap-2 px-4 py-3 sm:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                    <span className="font-code text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <div className="min-w-0">
                      {href ? <Link href={href} className="truncate font-bold hover:text-primary">{supporter.displayName}</Link> : <p className="truncate font-bold">{supporter.displayName}</p>}
                      <p className="text-[9px] font-code uppercase tracking-wider text-muted-foreground">{supporter.innerCircle ? 'Inner Circle' : supporter.followsYou ? 'Supporter' : 'Buyer'}{supporter.mutual ? ' · Mutual' : ''}</p>
                    </div>
                    <div className="min-w-0 text-xs text-muted-foreground"><span className="block truncate">Top: {supporter.topTrackTitle || 'First Drop'}</span><span>{supporter.qualifiedListeningDays} qualified listen day{supporter.qualifiedListeningDays === 1 ? '' : 's'}</span></div>
                    <div className="text-xs text-muted-foreground"><strong className="font-code text-foreground">{supporter.purchaseCount}</strong> purchase{supporter.purchaseCount === 1 ? '' : 's'}<span className="block text-[9px]">last {ago(supporter.lastSupportedAt)}</span></div>
                    <div className="text-left sm:text-right"><strong className="block font-code text-emerald-300">{centsToUsdLabel(supporter.totalPaidCents)}</strong><span className="text-[9px] uppercase tracking-wider text-muted-foreground">{centsToUsdLabel(supporter.periodPaidCents)} · {days}D</span></div>
                  </div>
                );
              })}
            </div>
          ) : <p className="px-5 pb-6 text-sm text-muted-foreground">No successful First Drop support has been recorded yet.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <Card className="border-fuchsia-500/20 bg-card/60">
          <CardHeader className="space-y-3">
            <div><CardTitle className="font-headline uppercase">Supporter explorer</CardTitle><p className="mt-1 text-[10px] text-muted-foreground">Search and compare your current relationship, listening, and purchase signals.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={supporterSearch} onChange={(event) => setSupporterSearch(event.target.value)} className="pl-9" placeholder="Search supporters..." aria-label="Search supporters" /></label>
              <select value={supporterSort} onChange={(event) => setSupporterSort(event.target.value as typeof supporterSort)} className="h-10 rounded-md border border-input bg-background px-3 text-xs font-bold uppercase tracking-wider" aria-label="Sort supporters">
                <option value="recent">Recent activity</option><option value="listening">Listening</option><option value="support">Paid support</option><option value="inner">Inner Circle</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredFollowers.length ? (
              <div className="max-h-[34rem] divide-y divide-white/10 overflow-y-auto">{filteredFollowers.map((row) => <PersonRow key={row.userId} row={row} />)}</div>
            ) : <p className="px-5 pb-6 text-sm text-muted-foreground">{data?.followers.length ? 'No supporters match that search.' : 'No supporters yet. Share your live profile or First Drop to start the circle.'}</p>}
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-card/60">
          <CardHeader><CardTitle className="font-headline uppercase">People you support</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data?.following.length ? (
              <div className="divide-y divide-white/10">
                {data.following.map((row) => (
                  <PersonRow
                    key={row.userId}
                    row={row}
                    action={
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={busyId === row.userId}
                          aria-label={row.innerCircle ? 'Remove from Inner Circle' : 'Add to Inner Circle'}
                          onClick={() => void change(row, row.innerCircle ? 'inner_circle_off' : 'inner_circle_on')}
                        ><Star className={row.innerCircle ? 'h-4 w-4 fill-amber-300 text-amber-300' : 'h-4 w-4'} /></Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-300"
                          disabled={busyId === row.userId}
                          aria-label="Unfollow"
                          onClick={() => void change(row, 'unfollow')}
                        ><UserMinus className="h-4 w-4" /></Button>
                      </div>
                    }
                  />
                ))}
              </div>
            ) : <p className="px-5 pb-6 text-sm text-muted-foreground">Follow a profile to build your music support graph.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">How to read this:</strong> qualified listening means at least 80% of the available preview or full stream. Current-circle rates use people who follow you now; Bar4Bar does not retain deleted follow relationships as historical profiles. Successful purchase totals are read retroactively from your existing First Drop sale records. Detailed processing fees, artist net, Stripe status, and payouts remain private in Earnings.
      </div>
    </div>
  );
}
