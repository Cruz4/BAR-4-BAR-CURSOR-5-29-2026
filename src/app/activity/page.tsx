'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  Import,
  Lock,
  MessageCircle,
  Repeat2,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudioLoader } from '@/components/studio-loader';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/context/gamification-context';
import { cn } from '@/lib/utils';
import {
  fetchActivityFeed,
  FRIENDSHIP_CHANGED_EVENT,
  clearFriendRequestActivityFromPeer,
  markActivityEventsRead,
  markAllActivityEventsRead,
  type FriendshipChangedDetail,
} from '@/lib/activity/client';
import { activityVerb, type ActivityEvent, type ActivityType } from '@/lib/activity/types';
import {
  acceptFriendRequest,
  fetchFriendships,
  friendshipIdFor,
  removeFriendship,
  fetchPublicArtistMetas,
} from '@/lib/profile/social-client';
import { looksLikeNeomaiyaSol } from '@/lib/profile/neomaiya-sol';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';

type TabId = 'inbox' | 'requests' | 'sent';

async function withResolvedProfileLinks(events: ActivityEvent[]): Promise<ActivityEvent[]> {
  const lookups: Array<{ userId: string; slug?: string }> = [];
  for (const event of events) {
    if (event.direction === 'received' && !event.actorSlug && event.actorId) {
      lookups.push({ userId: event.actorId });
    }
    if (event.direction === 'given' && !event.targetSlug && event.targetUserId) {
      lookups.push({ userId: event.targetUserId });
    }
  }
  if (!lookups.length) return events;
  const metas = await fetchPublicArtistMetas(lookups);
  return events.map((event) => {
    if (event.direction === 'received' && !event.actorSlug) {
      const slug = metas.get(event.actorId)?.slug;
      return slug ? { ...event, actorSlug: slug } : event;
    }
    if (event.direction === 'given' && !event.targetSlug && event.targetUserId) {
      const slug = metas.get(event.targetUserId)?.slug;
      return slug ? { ...event, targetSlug: slug } : event;
    }
    return event;
  });
}

function TypeIcon({ type }: { type: ActivityType }) {
  const className = 'h-4 w-4 shrink-0';
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <UserPlus className={cn(className, 'text-emerald-400')} />;
    case 'post_love':
      return <Heart className={cn(className, 'text-rose-400')} />;
    case 'post_reply':
      return <MessageCircle className={cn(className, 'text-sky-400')} />;
    case 'post_reverb':
      return <Repeat2 className={cn(className, 'text-violet-400')} />;
    case 'dna_import':
      return <Import className={cn(className, 'text-amber-400')} />;
    case 'lock_answered':
      return <Lock className={cn(className, 'text-emerald-400')} />;
    case 'artist_pick':
      return <Star className={cn(className, 'text-amber-400')} />;
    case 'lock_clear_offer':
      return <Lock className={cn(className, 'text-sky-400')} />;
    default:
      return <Bell className={className} />;
  }
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function activityOpenHref(event: ActivityEvent, viewerSlug?: string): string {
  if (event.lockId) return `/lock/${event.lockId}`;
  if (event.href?.startsWith('/lock/')) return event.href;
  if (event.shareId) return `/share/${event.shareId}`;
  if (event.postId) {
    if (event.href?.includes('#post-')) return event.href;
    if (event.direction === 'received' && viewerSlug) {
      return `/profile/${viewerSlug}#post-${event.postId}`;
    }
    if (event.href && event.href !== '/activity') return event.href;
  }
  if (event.href) return event.href;
  if (event.type === 'friend_accepted' && event.actorSlug) return `/profile/${event.actorSlug}`;
  if (event.type === 'friend_request') return '/activity?tab=requests';
  return '/activity';
}

function ActivityRow({
  event,
  onRespondRequest,
  busyId,
  requestResolved,
  viewerSlug,
}: {
  event: ActivityEvent;
  onRespondRequest?: (event: ActivityEvent, accept: boolean) => void;
  busyId?: string | null;
  /** Friend request already accepted/declined — hide Accept/Decline. */
  requestResolved?: boolean;
  viewerSlug?: string;
}) {
  const unread = event.direction === 'received' && !event.readAt;
  const primaryName =
    event.direction === 'received' ? event.actorName : event.targetName || event.actorName;
  const primarySlug =
    event.direction === 'received' ? event.actorSlug : event.targetSlug || undefined;
  const href = activityOpenHref(event, viewerSlug);
  const showRequestActions =
    event.direction === 'received' &&
    event.type === 'friend_request' &&
    onRespondRequest &&
    !requestResolved;

  const nameLink = (label: string, slug?: string) =>
    slug ? (
      <Link href={`/profile/${slug}`} className="font-bold text-foreground hover:underline">
        {label}
      </Link>
    ) : (
      <span className="font-bold text-foreground">{label}</span>
    );

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-3 transition-colors',
        unread ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-white/10 bg-card/40'
      )}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40">
        <TypeIcon type={event.type} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm leading-snug">
          {event.direction === 'received' ? (
            <>
              {nameLink(primaryName, primarySlug)}{' '}
              <span className="text-muted-foreground">{activityVerb(event.type, event.direction)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {activityVerb(event.type, event.direction)}{' '}
              {nameLink(primaryName, primarySlug)}
            </span>
          )}
        </p>
        {event.preview ? (
          <p className="line-clamp-2 font-code text-[11px] text-muted-foreground/90">
            “{event.preview}”
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {timeAgo(event.createdAt)}
          </span>
          {event.type !== 'friend_request' || event.direction === 'given' ? (
            <Link
              href={href}
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Open
            </Link>
          ) : null}
        </div>
        {showRequestActions ? (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-8 px-3 text-[10px] font-bold uppercase"
              disabled={busyId === event.id}
              onClick={() => onRespondRequest?.(event, true)}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-[10px] font-bold uppercase"
              disabled={busyId === event.id}
              onClick={() => onRespondRequest?.(event, false)}
            >
              Decline
            </Button>
          </div>
        ) : null}
      </div>
      {unread ? (
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-label="Unread" />
      ) : null}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-black/20 px-4 py-12 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="font-headline text-sm font-bold uppercase tracking-wide">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ActivityPageInner() {
  const { user, authReady } = useAuth();
  const { summary } = useGamification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const viewerSlug = summary?.profileSlug || undefined;
  const initialTab = (searchParams.get('tab') as TabId) || 'inbox';
  const [tab, setTab] = useState<TabId>(
    initialTab === 'requests' || initialTab === 'sent' ? initialTab : 'inbox'
  );
  const [inbox, setInbox] = useState<ActivityEvent[]>([]);
  const [sent, setSent] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Actor user ids whose incoming friend request is still pending in Firestore. */
  const [pendingRequesterIds, setPendingRequesterIds] = useState<Set<string>>(() => new Set());
  const [resolvedRequestIds, setResolvedRequestIds] = useState<Set<string>>(() => new Set());
  const markedOnOpenRef = React.useRef(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    markedOnOpenRef.current = false;
    try {
      const [received, given, pendingFriends, acceptedFriends] = await Promise.all([
        fetchActivityFeed('received'),
        fetchActivityFeed('given'),
        fetchFriendships(user.id, 'pending').catch(() => []),
        fetchFriendships(user.id, 'accepted').catch(() => []),
      ]);
      const [inboxResolved, sentResolved] = await Promise.all([
        withResolvedProfileLinks(received),
        withResolvedProfileLinks(given),
      ]);
      setInbox(inboxResolved);
      setSent(sentResolved);

      const acceptedPeerIds = new Set(
        acceptedFriends
          .filter((f) => f.status === 'accepted')
          .map((f) => f.uids.find((u) => u !== user.id) || '')
          .filter(Boolean)
      );

      // Auto-heal: Neo (or anyone) already accepted — drop Accept UI + clear activity.
      const staleRequestActors = inboxResolved
        .filter(
          (e) =>
            e.type === 'friend_request' &&
            e.direction === 'received' &&
            acceptedPeerIds.has(e.actorId)
        )
        .map((e) => e.actorId);
      for (const actorId of [...new Set(staleRequestActors)]) {
        void clearFriendRequestActivityFromPeer(actorId).catch(() => undefined);
      }

      // Auto-heal Neo pending invites still sitting as Accept.
      const healedNeoRequesters = new Set<string>();
      const neoPending = pendingFriends.filter(
        (f) =>
          f.status === 'pending' &&
          f.requestedBy !== user.id &&
          looksLikeNeomaiyaSol(
            f.profiles[f.requestedBy]?.name,
            f.profiles[f.requestedBy]?.slug
          )
      );
      for (const f of neoPending) {
        try {
          await acceptFriendRequest(f.id);
          acceptedPeerIds.add(f.requestedBy);
          healedNeoRequesters.add(f.requestedBy);
        } catch {
          /* leave actionable */
        }
      }

      if (healedNeoRequesters.size || staleRequestActors.length) {
        const clearActors = new Set([...healedNeoRequesters, ...staleRequestActors]);
        setInbox(
          inboxResolved.map((e) =>
            e.type === 'friend_request' && clearActors.has(e.actorId)
              ? { ...e, readAt: e.readAt || new Date().toISOString() }
              : e
          )
        );
      }

      setPendingRequesterIds(
        new Set(
          pendingFriends
            .filter(
              (f) =>
                f.status === 'pending' &&
                f.requestedBy !== user.id &&
                !acceptedPeerIds.has(f.requestedBy) &&
                !healedNeoRequesters.has(f.requestedBy)
            )
            .map((f) => f.requestedBy)
        )
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) {
      router.replace('/login?next=/activity');
      return;
    }
    void load();
  }, [authReady, user?.id, router, load]);

  // Accept/decline from Scene, profile, or elsewhere — drop Accept/Decline here too.
  useEffect(() => {
    const onFriendshipChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<FriendshipChangedDetail>).detail;
      if (!detail) return;
      if (detail.action !== 'accepted' && detail.action !== 'removed') return;

      if (detail.peerUserId) {
        const peer = detail.peerUserId;
        setPendingRequesterIds((prev) => {
          if (!prev.has(peer)) return prev;
          const next = new Set(prev);
          next.delete(peer);
          return next;
        });
        setInbox((prev) =>
          prev.map((e) =>
            e.type === 'friend_request' && e.actorId === peer
              ? { ...e, readAt: e.readAt || new Date().toISOString() }
              : e
          )
        );
        setResolvedRequestIds((prev) => {
          const next = new Set(prev);
          if (detail.clearedActivityIds?.length) {
            detail.clearedActivityIds.forEach((id) => next.add(id));
          }
          return next;
        });
      } else if (detail.clearedActivityIds?.length) {
        const cleared = new Set(detail.clearedActivityIds);
        setResolvedRequestIds((prev) => {
          const next = new Set(prev);
          cleared.forEach((id) => next.add(id));
          return next;
        });
        setInbox((prev) =>
          prev.map((e) =>
            cleared.has(e.id) ? { ...e, readAt: e.readAt || new Date().toISOString() } : e
          )
        );
      }
    };
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
  }, []);

  useEffect(() => {
    if (!user?.id || loading || markedOnOpenRef.current) return;
    const unreadIds = inbox.filter((e) => !e.readAt).map((e) => e.id);
    if (!unreadIds.length) {
      markedOnOpenRef.current = true;
      return;
    }
    markedOnOpenRef.current = true;
    const t = window.setTimeout(() => {
      void markActivityEventsRead(unreadIds).then(() => {
        setInbox((prev) =>
          prev.map((e) => (e.readAt ? e : { ...e, readAt: new Date().toISOString() }))
        );
        refreshActivityAlerts();
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [user?.id, loading, inbox]);

  const isRequestActionable = useCallback(
    (event: ActivityEvent) =>
      event.type === 'friend_request' &&
      event.direction === 'received' &&
      pendingRequesterIds.has(event.actorId) &&
      !resolvedRequestIds.has(event.id),
    [pendingRequesterIds, resolvedRequestIds]
  );

  const requestRows = useMemo(
    () => inbox.filter((e) => isRequestActionable(e)),
    [inbox, isRequestActionable]
  );
  const unreadRequestCount = requestRows.filter((e) => !e.readAt).length;

  const handleMarkAll = async () => {
    await markAllActivityEventsRead();
    setInbox((prev) =>
      prev.map((e) => ({ ...e, readAt: e.readAt || new Date().toISOString() }))
    );
    refreshActivityAlerts();
    toast({ title: 'All caught up' });
  };

  const handleRespond = async (event: ActivityEvent, accept: boolean) => {
    if (!user) return;
    setBusyId(event.id);
    try {
      const friendshipId = friendshipIdFor(user.id, event.actorId);
      if (accept) {
        await acceptFriendRequest(friendshipId);
        toast({ title: `You and ${event.actorName} are friends now` });
      } else {
        await removeFriendship(friendshipId);
        toast({ title: 'Request declined' });
      }
      setResolvedRequestIds((prev) => new Set(prev).add(event.id));
      setPendingRequesterIds((prev) => {
        const next = new Set(prev);
        next.delete(event.actorId);
        return next;
      });
      setInbox((prev) =>
        prev.map((e) =>
          e.id === event.id || (e.type === 'friend_request' && e.actorId === event.actorId)
            ? { ...e, readAt: new Date().toISOString() }
            : e
        )
      );
    } catch (e) {
      toast({
        variant: 'destructive',
        title: accept ? 'Could not accept' : 'Could not decline',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!authReady || !user) {
    return <StudioLoader size="lg" fullscreen message="Loading activity…" />;
  }

  return (
    <div className="container relative z-10 mx-auto max-w-2xl px-4 py-8 font-code">
      <Card className="border-2 border-primary/20 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-headline text-2xl uppercase">
                <Bell className="h-6 w-6 text-emerald-400" /> Activity
              </CardTitle>
              <CardDescription className="mt-1 text-sm leading-relaxed">
                Loves, replies, friend requests, and DNA Drop imports — received and sent.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 text-[10px] font-bold uppercase"
              onClick={() => void handleMarkAll()}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as TabId;
              setTab(next);
              router.replace(next === 'inbox' ? '/activity' : `/activity?tab=${next}`);
            }}
          >
            <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1 bg-muted/40 p-1">
              <TabsTrigger value="inbox" className="text-[10px] font-bold uppercase">
                Inbox
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-[10px] font-bold uppercase">
                Requests
                {unreadRequestCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-emerald-500 px-1.5 text-[9px] text-black">
                    {unreadRequestCount}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="sent" className="text-[10px] font-bold uppercase">
                Sent
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-16">
                <StudioLoader size="md" message="Loading…" />
              </div>
            ) : (
              <>
                <TabsContent value="inbox" className="mt-0 space-y-2">
                  {inbox.length === 0 ? (
                    <EmptyState
                      icon={Bell}
                      title="Nothing yet"
                      body="When someone loves your post, replies, friends you, or imports your DNA Drop, it lands here."
                    />
                  ) : (
                    inbox.map((event) => (
                      <ActivityRow
                        key={event.id}
                        event={event}
                        onRespondRequest={handleRespond}
                        busyId={busyId}
                        requestResolved={!isRequestActionable(event)}
                        viewerSlug={viewerSlug}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="requests" className="mt-0 space-y-2">
                  {requestRows.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No friend requests"
                      body="Incoming requests show up here so you can accept or decline."
                    />
                  ) : (
                    requestRows.map((event) => (
                      <ActivityRow
                        key={event.id}
                        event={event}
                        onRespondRequest={handleRespond}
                        busyId={busyId}
                        requestResolved={!isRequestActionable(event)}
                        viewerSlug={viewerSlug}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="sent" className="mt-0 space-y-2">
                  {sent.length === 0 ? (
                    <EmptyState
                      icon={Check}
                      title="No sent activity"
                      body="Loves, replies, requests, and DNA imports you make are listed here."
                    />
                  ) : (
                    sent.map((event) => (
                      <ActivityRow key={event.id} event={event} viewerSlug={viewerSlug} />
                    ))
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>

          <p className="mt-6 text-center text-[10px] text-muted-foreground">
            Push &amp; alert types:{' '}
            <Link
              href="/usage?tab=settings"
              className="text-primary underline-offset-2 hover:underline"
            >
              Settings → Notifications
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<StudioLoader size="lg" fullscreen message="Loading activity…" />}>
      <ActivityPageInner />
    </Suspense>
  );
}
