'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  BarChart3,
  CircleDollarSign,
  Headphones,
  HeartHandshake,
  Music2,
  Radio,
  RefreshCw,
  Sparkles,
  Star,
  StickyNote,
  Timer,
  Users,
  Loader,
  type LucideIcon,
} from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StudioLoader } from '@/components/studio-loader';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import { ArtistHomeLink } from '@/components/profile/artist-home-link';
import { centsToUsdLabel } from '@/lib/drop-commerce';
import { updateSupportRelationship } from '@/lib/relationships-client';
import {
  SUPPORT_CRM_PRIORITY_LABELS,
  type ArtistIntelligencePerson,
  type ArtistIntelligenceSummary,
  type SupporterPriority,
} from '@/lib/support-crm';
import {
  dropInsightReleaseSubtitle,
  type DropInsightsResponse,
  type DropInsightTrack,
} from '@/lib/drop-insights';
import {
  DROP_PAYOUT_COUNTRIES,
  EMPTY_DROP_CONNECT_STATUS,
  EMPTY_DROP_PAYOUT_TOTALS,
  type DropEarningsSummary,
} from '@/lib/drop-earnings';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';

export type ArtistIntelligenceTab =
  | 'overview'
  | 'people'
  | 'earnings'
  | 'insights'
  | 'top-songs'
  | 'sources';

const TAB_DEFS: Array<{
  id: ArtistIntelligenceTab;
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { id: 'overview', label: 'Overview', href: '/supporters?tab=overview', icon: Sparkles },
  { id: 'people', label: 'People', href: '/supporters?tab=people', icon: Users },
  { id: 'earnings', label: 'Earnings', href: '/earnings', icon: CircleDollarSign },
  { id: 'insights', label: 'Insights', href: '/insights?tab=insights', icon: BarChart3 },
  { id: 'top-songs', label: 'Top Songs', href: '/insights?tab=top-songs', icon: Music2 },
  { id: 'sources', label: 'Sources', href: '/insights?tab=sources', icon: Radio },
];

function ago(value: string | null): string {
  if (!value) return '—';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '—';
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in required.');
  return {
    Authorization: `Bearer ${await current.getIdToken()}`,
    'Content-Type': 'application/json',
  };
}

function priorityTone(priority: SupporterPriority): string {
  switch (priority) {
    case 'hot':
      return 'border-rose-400/40 bg-rose-500/15 text-rose-200';
    case 'warm':
      return 'border-amber-400/40 bg-amber-500/15 text-amber-200';
    case 'nurture':
      return 'border-sky-400/40 bg-sky-500/15 text-sky-200';
    case 'snoozed':
      return 'border-white/15 bg-white/5 text-muted-foreground';
    default:
      return 'border-white/10 bg-black/20 text-muted-foreground';
  }
}

function resolveTabFromRoute(
  pathname: string,
  searchTab: string | null,
  fallback: ArtistIntelligenceTab
): ArtistIntelligenceTab {
  if (pathname.startsWith('/earnings')) return 'earnings';
  if (pathname.startsWith('/insights')) {
    if (searchTab === 'top-songs' || searchTab === 'sources' || searchTab === 'insights') {
      return searchTab;
    }
    return 'insights';
  }
  if (pathname.startsWith('/supporters')) {
    if (searchTab === 'overview' || searchTab === 'people') return searchTab;
    return fallback === 'overview' ? 'overview' : 'people';
  }
  return fallback;
}

function MetricTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/25 p-4">
      <p className="font-code text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-code text-2xl font-bold tabular-nums text-sky-200">{value}</p>
      {note ? <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function TopReleaseRow({ row }: { row: DropInsightTrack }) {
  const isAlbum = row.kind === 'album';
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        isAlbum ? 'border-fuchsia-400/25' : 'border-white/10'
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate font-bold">{row.title}</p>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 text-[9px] uppercase tracking-wider',
              isAlbum
                ? 'border-fuchsia-400/40 text-fuchsia-200'
                : row.albumShareId
                  ? 'border-sky-400/35 text-sky-200'
                  : 'border-white/20 text-muted-foreground'
            )}
          >
            {isAlbum ? 'Album' : row.albumShareId ? 'Album track' : 'Single'}
          </Badge>
        </div>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {dropInsightReleaseSubtitle(row)} · {row.qualifiedListeners} qualified · {row.repeatListeners}{' '}
          repeat · {row.purchases} purchases
        </p>
      </div>
      <p
        className={cn(
          'font-code text-sm tabular-nums',
          isAlbum ? 'text-fuchsia-200' : 'text-sky-200'
        )}
      >
        {row.lifetimeFullStarts + row.lifetimePreviewStarts} lifetime starts
      </p>
    </div>
  );
}

export function ArtistIntelligenceShell({
  initialTab = 'people',
}: {
  initialTab?: ArtistIntelligenceTab;
}) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { enabled: firstDropsOn } = useFirstDropsFeature();

  const searchTab = searchParams.get('tab');
  const activeTab = resolveTabFromRoute(pathname, searchTab, initialTab);

  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [summary, setSummary] = useState<ArtistIntelligenceSummary | null>(null);
  const [insights, setInsights] = useState<DropInsightsResponse | null>(null);
  const [earnings, setEarnings] = useState<DropEarningsSummary>({
    connect: { ...EMPTY_DROP_CONNECT_STATUS },
    totals: { ...EMPTY_DROP_PAYOUT_TOTALS },
    sales: [],
  });
  const [loading, setLoading] = useState(true);
  const [busyPeer, setBusyPeer] = useState('');
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const connectHandled = useRef(false);
  const refreshGen = useRef(0);

  const loadIntelligence = useCallback(async () => {
    if (!user?.id) return;
    const headers = await authHeaders();
    const res = await fetch(
      `/api/intelligence?userId=${encodeURIComponent(user.id)}&days=${days}`,
      { headers, cache: 'no-store' }
    );
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) return;
    if (!res.ok) throw new Error(data.error || 'Could not load Artist Intelligence.');
    setSummary(data as ArtistIntelligenceSummary);
  }, [days, user?.id]);

  const loadInsights = useCallback(async () => {
    if (!user?.id) return;
    const headers = await authHeaders();
    const res = await fetch(
      `/api/drops/insights?userId=${encodeURIComponent(user.id)}&days=${days}`,
      { headers, cache: 'no-store' }
    );
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) return;
    if (!res.ok) throw new Error(data.error || 'Could not load insights.');
    setInsights(data as DropInsightsResponse);
  }, [days, user?.id]);

  const loadEarnings = useCallback(async () => {
    if (!user?.id || !firstDropsOn) return;
    const headers = await authHeaders();
    const res = await fetch(`/api/drops/payouts/status?userId=${encodeURIComponent(user.id)}`, {
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) return;
    if (!res.ok) throw new Error(data.error || 'Could not load earnings.');
    setEarnings({
      connect: data.connect || EMPTY_DROP_CONNECT_STATUS,
      totals: data.totals || EMPTY_DROP_PAYOUT_TOTALS,
      sales: Array.isArray(data.sales) ? data.sales : [],
    });
  }, [firstDropsOn, user?.id]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const gen = ++refreshGen.current;
    setLoading(true);
    try {
      await Promise.all([
        loadIntelligence(),
        loadInsights().catch(() => setInsights(null)),
        loadEarnings().catch(() => undefined),
      ]);
    } catch (error) {
      if (gen !== refreshGen.current) return;
      toast({
        variant: 'destructive',
        title: 'Artist Intelligence unavailable',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      if (gen === refreshGen.current) setLoading(false);
    }
  }, [loadEarnings, loadInsights, loadIntelligence, toast, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [authLoading, refresh, user?.id]);

  useEffect(() => {
    const connect = searchParams.get('connect');
    if (!connect || !user?.id || connectHandled.current || activeTab !== 'earnings') return;
    connectHandled.current = true;
    void (async () => {
      try {
        await loadEarnings();
        const headers = await authHeaders();
        await fetch('/api/drops/payouts/release', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId: user.id }),
        });
        await loadEarnings();
        toast({ title: 'Payout connection updated' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Connect return failed',
          description: error instanceof Error ? error.message : undefined,
        });
      }
    })();
  }, [activeTab, loadEarnings, searchParams, toast, user?.id]);

  const goTab = (tab: ArtistIntelligenceTab) => {
    const def = TAB_DEFS.find((t) => t.id === tab);
    if (def) router.push(def.href);
  };

  const patchOverlay = async (
    peerId: string,
    patch: { notes?: string; tags?: string[]; snoozedUntil?: string | null }
  ) => {
    if (!user?.id) return;
    setBusyPeer(peerId);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/intelligence/crm/${encodeURIComponent(peerId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId: user.id, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save note.');
      await loadIntelligence();
      toast({ title: 'Saved privately' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not update CRM',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyPeer('');
    }
  };

  const runPersonAction = async (person: ArtistIntelligencePerson) => {
    if (!user?.id) return;
    const action = person.recommendedAction;
    if (action === 'open_profile' && person.profileSlug) {
      const href = profileHref(person.profileSlug);
      if (href) router.push(href);
      return;
    }
    if (action === 'inner_circle_on' || action === 'inner_circle_off') {
      setBusyPeer(person.peerId);
      try {
        await updateSupportRelationship({
          userId: user.id,
          targetUserId: person.peerId,
          action,
        });
        await loadIntelligence();
        toast({
          title: action === 'inner_circle_on' ? 'Added to Inner Circle' : 'Inner Circle updated',
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Could not update Inner Circle',
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setBusyPeer('');
      }
      return;
    }
    if (action === 'snooze') {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await patchOverlay(person.peerId, { snoozedUntil: until });
      return;
    }
    if (action === 'add_note') {
      setExpandedNote(person.peerId);
      setNoteDrafts((prev) => ({
        ...prev,
        [person.peerId]: prev[person.peerId] ?? person.overlay?.notes ?? '',
      }));
    }
  };

  const sourceEntries = useMemo(
    () => Object.entries(insights?.sources || {}).sort((a, b) => b[1] - a[1]),
    [insights?.sources]
  );
  const maxSource = Math.max(1, ...sourceEntries.map(([, n]) => n), 1);
  const topTracks = insights?.tracks?.slice(0, 8) || [];
  const topAlbums = insights?.albums?.slice(0, 6) || [];

  if (authLoading || (loading && !summary)) {
    return <StudioLoader size="lg" fullscreen message="Tuning Artist Intelligence…" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="max-w-md border-2 text-center">
          <CardContent className="space-y-4 p-8">
            <HeartHandshake className="mx-auto h-10 w-10 text-fuchsia-300" />
            <h1 className="font-headline text-3xl font-bold uppercase">Artist Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to see who supports you, what to do next, and private CRM notes.
            </p>
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent(pathname || '/supporters')}`}>Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = summary?.totals;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(232,121,249,0.1),_transparent_50%)]"
      />
      <div className="container relative z-10 mx-auto max-w-6xl space-y-5 px-4 py-6 sm:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-code text-[10px] font-bold uppercase tracking-[0.28em] text-fuchsia-300">
              Artist Intelligence · CRM
            </p>
            <h1 className="mt-1 font-headline text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              Your people desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Priority, why they matter, and one clear next step — notes stay private on your account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([7, 30, 90] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={days === value ? 'default' : 'outline'}
                onClick={() => setDays(value)}
              >
                {value}D
              </Button>
            ))}
            <Button size="icon" variant="outline" onClick={() => void refresh()} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </header>

        <nav
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
          aria-label="Artist Intelligence tabs"
        >
          {TAB_DEFS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => goTab(id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 font-code text-[10px] font-bold uppercase tracking-[0.14em] transition',
                activeTab === id
                  ? 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100'
                  : 'border-white/10 bg-black/20 text-muted-foreground hover:border-white/20 hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {activeTab === 'overview' ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile label="People" value={totals?.people || 0} note="Current supporters in your circle." />
              <MetricTile label="Hot" value={totals?.hot || 0} note="Paid or repeat support signals." />
              <MetricTile
                label="Gross · window"
                value={centsToUsdLabel(totals?.periodGrossCents || 0)}
                note={`Successful release support · ${days}D`}
              />
              <MetricTile
                label="Active listeners"
                value={totals?.qualifiedListeners || 0}
                note="Supporters with a verified 80%+ listen."
              />
            </div>
            <Card className="border-white/10 bg-card/55">
              <CardHeader className="pb-2">
                <CardTitle className="font-headline text-lg uppercase">What to do next</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Open <strong className="text-foreground">People</strong> for priority + one next action.
                  Earnings stays payout-focused. Insights / Top Songs / Sources mirror your listener desk.
                </p>
                <p className="text-[11px]">{summary?.copy.privacyNote}</p>
                <Button size="sm" onClick={() => goTab('people')}>
                  Open People
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {activeTab === 'people' ? (
          <section className="space-y-3">
            {!summary?.people.length ? (
              <Card className="border-white/10 bg-card/55">
                <CardContent className="space-y-3 p-6">
                  <Users className="h-8 w-8 text-fuchsia-300" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {summary?.copy.emptyPeople ||
                      'No supporters yet. Share a release — when people follow, they land here with a next step.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              summary.people.map((person) => {
                const href = person.profileSlug ? profileHref(person.profileSlug) : undefined;
                const drafting = expandedNote === person.peerId;
                return (
                  <div
                    key={person.peerId}
                    className="rounded-xl border border-white/10 bg-card/60 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'px-2 py-0 text-[9px] uppercase tracking-wider',
                              priorityTone(person.priority)
                            )}
                          >
                            {SUPPORT_CRM_PRIORITY_LABELS[person.priority]}
                          </Badge>
                          {person.innerCircle ? (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-300">
                              <Star className="h-3 w-3 fill-amber-300" /> Inner Circle
                            </span>
                          ) : null}
                          {person.mutual ? (
                            <span className="text-[10px] uppercase tracking-wider text-sky-300">Mutual</span>
                          ) : null}
                        </div>
                        <p className="truncate font-headline text-xl font-bold uppercase">
                          <ArtistHomeLink
                            userId={person.peerId}
                            slug={person.profileSlug}
                            className="hover:text-primary"
                          >
                            {person.displayName}
                          </ArtistHomeLink>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {person.lastActivityLabel}: {ago(person.lastActivityAt)}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {person.reasons.map((reason) => (
                            <li
                              key={reason}
                              className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-muted-foreground"
                            >
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <p className="font-code text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Next action
                        </p>
                        <Button
                          size="sm"
                          disabled={busyPeer === person.peerId || person.recommendedAction === 'none'}
                          onClick={() => void runPersonAction(person)}
                        >
                          {person.recommendedActionLabel}
                        </Button>
                        <div className="flex flex-wrap gap-1">
                          {href ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={href}>Profile</Link>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyPeer === person.peerId}
                            onClick={() =>
                              void updateSupportRelationship({
                                userId: user.id,
                                targetUserId: person.peerId,
                                action: person.innerCircle ? 'inner_circle_off' : 'inner_circle_on',
                              })
                                .then(() => loadIntelligence())
                                .catch((error) =>
                                  toast({
                                    variant: 'destructive',
                                    title: 'Inner Circle update failed',
                                    description: error instanceof Error ? error.message : undefined,
                                  })
                                )
                            }
                          >
                            <Star className={cn('mr-1 h-3.5 w-3.5', person.innerCircle && 'fill-amber-300 text-amber-300')} />
                            {person.innerCircle ? 'Inner on' : 'Inner'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyPeer === person.peerId}
                            onClick={() => {
                              const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                              void patchOverlay(person.peerId, { snoozedUntil: until });
                            }}
                          >
                            <Timer className="mr-1 h-3.5 w-3.5" /> Snooze
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setExpandedNote(drafting ? null : person.peerId);
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [person.peerId]: prev[person.peerId] ?? person.overlay?.notes ?? '',
                              }));
                            }}
                          >
                            <StickyNote className="mr-1 h-3.5 w-3.5" /> Note
                          </Button>
                        </div>
                      </div>
                    </div>
                    {drafting ? (
                      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                        <Textarea
                          value={noteDrafts[person.peerId] ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [person.peerId]: e.target.value }))
                          }
                          placeholder="Private note — only you see this"
                          className="min-h-[88px] text-sm"
                          maxLength={2000}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Input
                            placeholder="Tags (comma-separated)"
                            defaultValue={(person.overlay?.tags || []).join(', ')}
                            id={`tags-${person.peerId}`}
                            className="max-w-sm text-sm"
                          />
                          <Button
                            size="sm"
                            disabled={busyPeer === person.peerId}
                            onClick={() => {
                              const tagsRaw =
                                (document.getElementById(`tags-${person.peerId}`) as HTMLInputElement | null)
                                  ?.value || '';
                              const tags = tagsRaw
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean);
                              void patchOverlay(person.peerId, {
                                notes: noteDrafts[person.peerId] ?? '',
                                tags,
                                snoozedUntil: person.overlay?.snoozedUntil ?? null,
                              }).then(() => setExpandedNote(null));
                            }}
                          >
                            Save note
                          </Button>
                        </div>
                      </div>
                    ) : person.overlay?.notes ? (
                      <p className="mt-3 border-t border-white/5 pt-3 text-[11px] italic text-muted-foreground">
                        Note: {person.overlay.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
            <p className="text-[10px] leading-relaxed text-muted-foreground">{summary?.copy.privacyNote}</p>
          </section>
        ) : null}

        {activeTab === 'earnings' ? (
          <section className="space-y-4">
            {!firstDropsOn ? (
              <Card className="border-white/10 bg-card/55">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  First Drops payouts are offline right now. Your people desk still works.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile
                    label="Artist net"
                    value={centsToUsdLabel(earnings.totals.netCents || 0)}
                  />
                  <MetricTile label="Held" value={centsToUsdLabel(earnings.totals.heldCents || 0)} />
                  <MetricTile
                    label="Paid out"
                    value={centsToUsdLabel(earnings.totals.paidCents || 0)}
                  />
                </div>
                <Card className="border-emerald-500/20 bg-card/55">
                  <CardHeader>
                    <CardTitle className="font-headline uppercase">Payout connection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      Status:{' '}
                      <strong className="text-foreground">
                        {earnings.connect.payoutsEnabled
                          ? 'Payouts live'
                          : earnings.connect.detailsSubmitted
                            ? 'Stripe reviewing'
                            : 'Not connected'}
                      </strong>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                        defaultValue={earnings.connect.country || 'US'}
                        id="intel-payout-country"
                        aria-label="Payout country"
                        disabled={payoutBusy}
                      >
                        {DROP_PAYOUT_COUNTRIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={payoutBusy || !user?.id}
                        onClick={() => {
                          void (async () => {
                            if (!user?.id) throw new Error('Sign in required.');
                            setPayoutBusy(true);
                            const country =
                              (document.getElementById('intel-payout-country') as HTMLSelectElement | null)
                                ?.value || 'US';
                            const headers = await authHeaders();
                            const openDashboard = async () => {
                              const dash = await fetch('/api/drops/payouts/dashboard', {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({ userId: user.id }),
                              });
                              const dashData = await dash.json().catch(() => ({}));
                              if (!dash.ok) {
                                throw new Error(dashData.error || 'Could not open Stripe.');
                              }
                              if (dashData.url) {
                                window.location.href = dashData.url;
                                return;
                              }
                              throw new Error('Stripe did not return a dashboard URL.');
                            };

                            if (earnings.connect.payoutsEnabled) {
                              await openDashboard();
                              return;
                            }

                            const res = await fetch('/api/drops/payouts/onboard', {
                              method: 'POST',
                              headers,
                              body: JSON.stringify({
                                userId: user.id,
                                country,
                                email: user.email,
                              }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (res.status === 429) {
                              throw new Error('Too many requests — wait a few seconds and try again.');
                            }
                            if (!res.ok) throw new Error(data.error || 'Onboard failed');
                            if (data.url) {
                              window.location.href = data.url;
                              return;
                            }
                            if (data.ready) {
                              toast({
                                title: 'Payouts already live',
                                description: 'Opening your Stripe payouts dashboard.',
                              });
                              await openDashboard();
                              return;
                            }
                            throw new Error('Stripe did not return a setup link.');
                          })()
                            .catch((error) =>
                              toast({
                                variant: 'destructive',
                                title: 'Could not start payouts',
                                description: error instanceof Error ? error.message : undefined,
                              })
                            )
                            .finally(() => setPayoutBusy(false));
                        }}
                      >
                        {payoutBusy ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {earnings.connect.payoutsEnabled
                          ? 'Open Stripe'
                          : earnings.connect.detailsSubmitted
                            ? 'Continue Stripe'
                            : 'Connect Stripe'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </section>
        ) : null}

        {activeTab === 'insights' ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile label="Qualified listeners" value={insights?.totals.qualifiedListeners || 0} />
              <MetricTile label="Repeat listeners" value={insights?.totals.repeatListeners || 0} />
              <MetricTile label="Completion rate" value={`${insights?.rates.completionPercent || 0}%`} />
              <MetricTile
                label="Listener → buyer"
                value={`${insights?.rates.listenerToBuyerPercent || 0}%`}
              />
            </div>
            <Card className="border-sky-500/20 bg-card/55">
              <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
                <Headphones className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
                <p>
                  Qualified means at least 80% of the available stream. Your own plays are excluded. Use Top Songs and
                  Sources tabs for denser breakdowns.
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {activeTab === 'top-songs' ? (
          <section className="space-y-6">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Album-page listens and album purchases stay on the album. Song pages are counted on each song —
              including tracks that live inside an album. Those two never add into each other.
            </p>

            {topAlbums.length ? (
              <div className="space-y-3">
                <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-fuchsia-200/90">
                  Albums
                </h3>
                {topAlbums.map((album) => (
                  <TopReleaseRow key={album.shareId} row={album} />
                ))}
              </div>
            ) : null}

            <div className="space-y-3">
              <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-sky-200/90">
                Songs
              </h3>
              {topTracks.length ? (
                topTracks.map((track) => <TopReleaseRow key={track.shareId} row={track} />)
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tracked songs yet. Publish a single or album track release to start ranking attention.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === 'sources' ? (
          <section className="space-y-3">
            {sourceEntries.length ? (
              sourceEntries.map(([source, count]) => (
                <div key={source} className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>{source.replaceAll('_', ' ')}</span>
                    <strong className="font-code text-sky-300">{count}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-sky-300"
                      style={{ width: `${(count / maxSource) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No listen sources in this window yet. Share from Artist Home or The Scene to attribute discovery.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
