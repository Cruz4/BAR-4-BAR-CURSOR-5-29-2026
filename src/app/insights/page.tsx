'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Headphones, HeartHandshake, Play, RefreshCw, Repeat2, ShoppingBag, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudioLoader } from '@/components/studio-loader';
import type { DropInsightsResponse } from '@/lib/drop-insights';
import { centsToUsdLabel } from '@/lib/drop-commerce';

async function authHeaders(): Promise<HeadersInit> {
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in to view listener insights.');
  return { Authorization: `Bearer ${await current.getIdToken()}` };
}

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <Card className="border-white/10 bg-card/65">
      <CardContent className="space-y-1 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="font-code text-2xl font-bold tabular-nums text-sky-300">{value}</p>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

export default function ListenerInsightsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<DropInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/drops/insights?userId=${encodeURIComponent(user.id)}&days=${days}`, {
        headers,
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load insights.');
      setData(payload as DropInsightsResponse);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Insights unavailable',
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

  const maxDaily = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.timeline.flatMap((row) => [row.qualifiedListeners, row.recordedStarts]) || [1])
      ),
    [data?.timeline]
  );

  if (authLoading || loading) {
    return <StudioLoader size="lg" fullscreen message="Reading real listener signals..." />;
  }
  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="max-w-md border-2 text-center">
          <CardContent className="space-y-4 p-8">
            <Headphones className="mx-auto h-10 w-10 text-sky-300" />
            <h1 className="font-headline text-3xl font-bold uppercase">Listener Insights</h1>
            <p className="text-sm text-muted-foreground">Sign in to see who is truly listening and returning.</p>
            <Button asChild><Link href="/login?next=/insights">Sign in</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = data?.totals;
  const lifetime = data?.lifetime;
  const lifetimeStarts = (lifetime?.previewStarts || 0) + (lifetime?.fullStarts || 0);
  const sourceEntries = Object.entries(data?.sources || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="container mx-auto max-w-6xl space-y-7 px-4 py-8 sm:py-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sky-300">
            <BarChart3 className="h-6 w-6" />
            <p className="font-code text-[10px] font-bold uppercase tracking-[0.28em]">Qualified relationships</p>
          </div>
          <h1 className="font-headline text-4xl font-bold uppercase">Listener Insights</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Attention that lasted: qualified listeners reach at least 80% of the available preview or full stream.
            Your historical starts and sales are included separately; your own verified plays and repeated refreshes are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/supporters"><HeartHandshake className="mr-1.5 h-4 w-4" /> Support Circle</Link>
          </Button>
          {([7, 30, 90] as const).map((value) => (
            <Button key={value} size="sm" variant={days === value ? 'default' : 'outline'} onClick={() => setDays(value)}>
              {value}D
            </Button>
          ))}
          <Button size="icon" variant="outline" onClick={() => void load()} aria-label="Refresh insights">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Qualified listeners" value={totals?.qualifiedListeners || 0} note="Distinct people who reached the qualification point." />
        <Metric label="Repeat listeners" value={totals?.repeatListeners || 0} note="People who qualified on more than one day." />
        <Metric label="Completion rate" value={`${data?.rates.completionPercent || 0}%`} note="Completed available streams from engaged starts." />
        <Metric label="Listener → buyer" value={`${data?.rates.listenerToBuyerPercent || 0}%`} note="Purchases compared with qualified listeners." />
      </div>

      <Card className="border-fuchsia-500/25 bg-gradient-to-r from-fuchsia-500/10 via-card/70 to-sky-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-headline uppercase">
            <Play className="h-5 w-5 text-fuchsia-300" /> Lifetime First Drop activity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Total starts" value={lifetimeStarts} note="Historical preview and full-stream starts already recorded on your Drops." />
          <Metric label="Preview starts" value={lifetime?.previewStarts || 0} note="Preview playback starts, including activity from before verified milestones." />
          <Metric label="Full starts" value={lifetime?.fullStarts || 0} note="Full-stream playback starts recorded on published Drops." />
          <Metric label="Purchases" value={lifetime?.purchases || 0} note="Historical sales recovered from sale records and Drop counters." />
          <Metric label="Gross sold" value={centsToUsdLabel(lifetime?.grossCents || 0)} note={`${lifetime?.trackedDrops || 0} published Drop${lifetime?.trackedDrops === 1 ? '' : 's'} inspected.`} />
        </CardContent>
        <div className="border-t border-white/10 px-6 py-3 text-[10px] leading-relaxed text-muted-foreground">
          Historical starts are real recorded starts, but they are not relabeled as qualified listens because older playback did not capture proof of reaching 80%. New verified milestones appear above as they arrive.
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.7fr)]">
        <Card className="border-sky-500/20 bg-card/60">
          <CardHeader><CardTitle className="font-headline uppercase">Listening pulse</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-1 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
              {data?.timeline.map((row) => (
                <div key={row.day} className="group flex h-full min-w-0 flex-1 items-end gap-px" title={`${row.day}: ${row.recordedStarts} recorded starts · ${row.qualifiedListeners} qualified`}>
                  <div
                    className="w-1/2 min-h-0.5 rounded-t bg-gradient-to-t from-fuchsia-700 to-fuchsia-300 transition group-hover:brightness-125"
                    style={{ height: `${Math.max(1, (row.recordedStarts / maxDaily) * 100)}%` }}
                  />
                  <div
                    className="w-1/2 min-h-0.5 rounded-t bg-gradient-to-t from-sky-700 to-sky-300 transition group-hover:brightness-125"
                    style={{ height: `${Math.max(1, (row.qualifiedListeners / maxDaily) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-code uppercase tracking-wider text-muted-foreground">
              <span>{data?.timeline[0]?.day || ''}</span><span><span className="text-fuchsia-300">starts</span> + <span className="text-sky-300">qualified</span> per day</span><span>{data?.timeline.at(-1)?.day || ''}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-card/60">
          <CardHeader><CardTitle className="flex items-center gap-2 font-headline uppercase"><ShieldCheck className="h-5 w-5 text-emerald-300" /> Integrity</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>Qualified at <strong className="text-foreground">80%</strong> of the available stream.</p>
            <p>Owner activity and same-day repeat qualification are excluded.</p>
            <p>Older starts and sales are visible, but never promoted into qualified counts without playback proof.</p>
            <p>Purchase <em>amount</em>, Pro, Ink, ads, and sponsorship never add organic rank.</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-lg border border-white/10 p-3"><ShoppingBag className="mb-2 h-4 w-4 text-amber-300" /><strong>{totals?.purchases || 0}</strong><br />purchases</div>
              <div className="rounded-lg border border-white/10 p-3"><Repeat2 className="mb-2 h-4 w-4 text-fuchsia-300" /><strong>{totals?.repeatBuyers || 0}</strong><br />repeat buyers</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-sky-500/20 bg-card/60">
        <CardHeader><CardTitle className="font-headline uppercase">Qualified-listen origins</CardTitle></CardHeader>
        <CardContent>
          {sourceEntries.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sourceEntries.map(([source, value]) => (
                <div key={source} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{source.replaceAll('_', ' ')}</span>
                  <strong className="font-code text-sky-300">{value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Historical starts did not store an origin. New qualified listens will identify Artist Home, Scene, Discover, shared page, Library, or direct traffic here.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/60">
        <CardHeader><CardTitle className="font-headline uppercase">Tracks creating relationships</CardTitle></CardHeader>
        <CardContent>
          {data?.tracks.length ? (
            <div className="divide-y divide-white/10 rounded-xl border border-white/10">
              {data.tracks.map((track) => (
                <div key={track.shareId} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)] sm:items-center sm:gap-5">
                  <Link href={`/share/${track.shareId}`} className="min-w-0 truncate font-bold hover:text-primary">{track.title}</Link>
                  <span className="text-xs text-muted-foreground"><strong className="text-foreground">{track.lifetimePreviewStarts + track.lifetimeFullStarts}</strong> starts</span>
                  <span className="text-xs text-muted-foreground"><strong className="text-foreground">{track.qualifiedListeners}</strong> qualified</span>
                  <span className="text-xs text-muted-foreground"><strong className="text-foreground">{track.completions}</strong> complete</span>
                  <span className="text-xs text-muted-foreground"><strong className="text-foreground">{track.lifetimePurchases}</strong> bought</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No First Drop starts, sales, or verified listening have been recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
