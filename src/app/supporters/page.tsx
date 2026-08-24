'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { BarChart3, HeartHandshake, RefreshCw, Star, UserMinus, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudioLoader } from '@/components/studio-loader';
import { profileHref } from '@/lib/profile/profile-slug';
import { fetchSupportDashboard, updateSupportRelationship } from '@/lib/relationships-client';
import type { SupportDashboard, SupportRelationshipRow } from '@/lib/relationships';

function ago(value: string): string {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
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
        <p className="text-[9px] font-code uppercase tracking-wider text-muted-foreground">
          {row.innerCircle ? 'Inner Circle' : 'Following'} {row.updatedAt ? `· ${ago(row.updatedAt)}` : ''}
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

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setData(await fetchSupportDashboard(user.id));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Support circle unavailable',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

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

  const metrics: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Followers', value: data?.totals.followers || 0, icon: HeartHandshake },
    { label: 'Inner Circle supporters', value: data?.totals.innerCircleSupporters || 0, icon: Star },
    { label: 'You follow', value: data?.totals.following || 0, icon: Users },
    { label: 'Your Inner Circle', value: data?.totals.inMyInnerCircle || 0, icon: Star },
  ];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-code text-[10px] font-bold uppercase tracking-[0.26em] text-fuchsia-300">Music relationships</p>
          <h1 className="mt-1 font-headline text-4xl font-bold uppercase">Support Circle</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Follow is lightweight support. Inner Circle is the smaller set you intentionally want closest. Friends remains separate for mutual collaboration and Msgs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/insights"><BarChart3 className="mr-2 h-4 w-4" /> Listener Insights</Link></Button>
          <Button size="icon" variant="outline" onClick={() => void load()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-white/10 bg-card/65"><CardContent className="p-4">
            <Icon className="mb-3 h-5 w-5 text-fuchsia-300" />
            <p className="font-code text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-fuchsia-500/20 bg-card/60">
          <CardHeader><CardTitle className="font-headline uppercase">People supporting you</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data?.followers.length ? (
              <div className="divide-y divide-white/10">{data.followers.map((row) => <PersonRow key={row.userId} row={row} />)}</div>
            ) : <p className="px-5 pb-6 text-sm text-muted-foreground">No followers yet. Share your live profile or First Drop to start the circle.</p>}
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
    </div>
  );
}
