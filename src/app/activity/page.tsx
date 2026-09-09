'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Bookmark,
  Check,
  CheckCheck,
  Droplets,
  FilePenLine,
  Flame,
  Heart,
  Import,
  Lock,
  Mail,
  MailOpen,
  MessageCircle,
  Banknote,
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
import { cn } from '@/lib/utils';
import {
  fetchActivityFeedPage,
  FRIENDSHIP_CHANGED_EVENT,
  clearFriendRequestActivityFromPeer,
  markActivityEventsRead,
  markActivityEventsUnread,
  markAllActivityEventsRead,
  markAllActivityEventsUnread,
  type FriendshipChangedDetail,
} from '@/lib/activity/client';
import { navigateActivityHref, resolveActivityOpenHref } from '@/lib/activity/href';
import { activityShowsActor, activityVerb, type ActivityDirection, type ActivityEvent, type ActivityType } from '@/lib/activity/types';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import {
  acceptFriendRequest,
  fetchFriendships,
  friendshipIdFor,
  removeFriendship,
  fetchPublicArtistMetas,
} from '@/lib/profile/social-client';
import {
  fetchPendingContactRequesterIds,
  respondArtistContact,
} from '@/lib/profile/contact-client';
import { looksLikeNeomaiyaSol } from '@/lib/profile/neomaiya-sol';
import { profileHref } from '@/lib/profile/profile-slug';
import { refreshActivityAlerts, useActivityAlerts } from '@/hooks/use-activity-alerts';
import { InboxBulkReadToggle } from '@/components/inbox-bulk-read-toggle';
import { InboxPageAtmosphere } from '@/components/inbox/inbox-page-atmosphere';

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
    case 'profile_followed':
      return <Heart className={cn(className, 'text-fuchsia-400')} />;
    case 'inner_circle_joined':
      return <Star className={cn(className, 'fill-amber-300 text-amber-300')} />;
    case 'contact_request':
    case 'contact_accepted':
      return <Mail className={cn(className, 'text-sky-400')} />;
    case 'fold_pass':
      return <MessageCircle className={cn(className, 'text-amber-400')} />;
    case 'collab_invite':
    case 'collab_edit':
    case 'collab_message':
      return <Users className={cn(className, 'text-violet-400')} />;
    case 'post_love':
      return <Heart className={cn(className, 'text-rose-400')} />;
    case 'post_reply':
      return <MessageCircle className={cn(className, 'text-sky-400')} />;
    case 'post_reverb':
      return <Repeat2 className={cn(className, 'text-violet-400')} />;
    case 'post_imprint_saved':
      return <Bookmark className={cn(className, 'text-fuchsia-400')} />;
    case 'dna_import':
      return <Import className={cn(className, 'text-amber-400')} />;
    case 'drop_loved':
      return <Heart className={cn(className, 'text-fuchsia-400')} />;
    case 'drop_reply':
      return <MessageCircle className={cn(className, 'text-fuchsia-400')} />;
    case 'drop_unlocked':
      return <Flame className={cn(className, 'text-fuchsia-400')} />;
    case 'drop_sold':
      return <Banknote className={cn(className, 'text-emerald-400')} />;
    case 'love_milestone':
      return <Droplets className={cn(className, 'text-violet-300')} />;
    case 'lock_answered':
      return <Lock className={cn(className, 'text-emerald-400')} />;
    case 'artist_pick':
      return <Star className={cn(className, 'text-amber-400')} />;
    case 'lock_clear_offer':
      return <Lock className={cn(className, 'text-sky-400')} />;
    case 'verse_open':
      return <FilePenLine className={cn(className, 'text-sky-400')} />;
    case 'streak_risk':
      return <Flame className={cn(className, 'text-amber-400')} />;
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

function ActivityRow({
  event,
  onRespondRequest,
  onOpen,
  onMarkUnread,
  busyId,
  requestResolved,
}: {
  event: ActivityEvent;
  onRespondRequest?: (event: ActivityEvent, accept: boolean) => void;
  onOpen?: (event: ActivityEvent) => void;
  onMarkUnread?: (event: ActivityEvent) => void;
  busyId?: string | null;
  /** Friend request already accepted/declined — hide Accept/Decline. */
  requestResolved?: boolean;
}) {
  const unread = event.direction === 'received' && !event.readAt;
  const primaryName =
    event.direction === 'received' ? event.actorName : event.targetName || event.actorName;
  const primarySlug =
    event.direction === 'received' ? event.actorSlug : event.targetSlug || undefined;
  const showRequestActions =
    event.direction === 'received' &&
    (event.type === 'friend_request' || event.type === 'contact_request') &&
    onRespondRequest &&
    !requestResolved;

  const nameLink = (label: string, slug?: string) => {
    const profileUrl = profileHref(slug);
    return profileUrl ? (
      <Link href={profileUrl} className="font-bold text-foreground hover:underline">
        {label}
      </Link>
    ) : (
      <span className="font-bold text-foreground">{label}</span>
    );
  };

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-3 transition-colors',
        unread ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-white/10 bg-card/40'
      )}
    >
      {activityShowsActor(event.type) ? (
        <LiveArtistStarAvatar
          name={primaryName}
          userId={event.direction === 'received' ? event.actorId : event.targetUserId || event.actorId}
          slug={primarySlug}
          size={36}
          link={false}
        />
      ) : (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40">
          <TypeIcon type={event.type} />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm leading-snug">
          {event.direction === 'received' ? (
            activityShowsActor(event.type) ? (
              <>
                {nameLink(primaryName, primarySlug)}{' '}
                <span className="text-muted-foreground">{activityVerb(event.type, event.direction)}</span>
              </>
            ) : (
              <span className="font-bold text-foreground">{activityVerb(event.type, event.direction)}</span>
            )
          ) : (
            <span className="text-muted-foreground">
              {activityVerb(event.type, event.direction)}{' '}
              {activityShowsActor(event.type) ? nameLink(primaryName, primarySlug) : null}
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
          {event.direction === 'received' ? (
            <span className={cn(
              'rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider',
              unread
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/5 text-muted-foreground'
            )}>
              {unread ? 'Unread' : 'Read'}
            </span>
          ) : null}
          {(event.type !== 'friend_request' && event.type !== 'contact_request') ||
          event.direction === 'given' ? (
            <button
              type="button"
              onClick={() => onOpen?.(event)}
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Open
            </button>
          ) : null}
          {event.direction === 'received' && event.readAt && onMarkUnread ? (
            <button
              type="button"
              title="Mark as unread"
              aria-label="Mark as unread"
              disabled={busyId === event.id}
              onClick={() => onMarkUnread(event)}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-emerald-400"
            >
              <MailOpen className="h-3 w-3" />
              Mark unread
            </button>
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
    <div className="rounded-lg border border-dashed border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-12 text-center shadow-[inset_0_0_32px_rgba(16,185,129,0.06)]">
      <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="font-headline text-sm font-bold uppercase tracking-wide">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ActivityPageInner() {
  const { user, authReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const initialTab = (searchParams.get('tab') as TabId) || 'inbox';
  const [tab, setTab] = useState<TabId>(
    initialTab === 'requests' || initialTab === 'sent' ? initialTab : 'inbox'
  );
  const [inbox, setInbox] = useState<ActivityEvent[]>([]);
  const [sent, setSent] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState<ActivityDirection | null>(null);
  const [inboxCursor, setInboxCursor] = useState<string | null>(null);
  const [sentCursor, setSentCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { unreadReceived } = useActivityAlerts();
  /** Actor user ids whose incoming friend request is still pending in Firestore. */
  const [pendingRequesterIds, setPendingRequesterIds] = useState<Set<string>>(() => new Set());
  const [pendingContactRequesterIds, setPendingContactRequesterIds] = useState<Set<string>>(
    () => new Set()
  );
  const [resolvedRequestIds, setResolvedRequestIds] = useState<Set<string>>(() => new Set());
  /**
   * Keep entries that were unread on arrival highlighted for this mounted page,
   * even after their server read receipt is written. A later visit fetches them as read.
   */
  const sessionUnreadIdsRef = React.useRef<Set<string> | null>(null);
  const serverMarkedIdsRef = React.useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError('');
    try {
      const [receivedPage, givenPage, friendships, pendingContactIds] = await Promise.all([
        fetchActivityFeedPage('received'),
        fetchActivityFeedPage('given'),
        fetchFriendships(user.id).catch(() => []),
        fetchPendingContactRequesterIds().catch(() => []),
      ]);
      const pendingFriends = friendships.filter((f) => f.status === 'pending');
      const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
      const [inboxResolved, sentResolved] = await Promise.all([
        withResolvedProfileLinks(receivedPage.events),
        withResolvedProfileLinks(givenPage.events),
      ]);
      const sessionUnreadIds = sessionUnreadIdsRef.current ?? new Set<string>();
      for (const event of inboxResolved) {
        if (event.direction === 'received' && !event.readAt) sessionUnreadIds.add(event.id);
      }
      sessionUnreadIdsRef.current = sessionUnreadIds;
      const displayInbox = inboxResolved.map((event) =>
        sessionUnreadIds.has(event.id) ? { ...event, readAt: null } : event
      );
      setInbox(displayInbox);
      setSent(sentResolved);
      setInboxCursor(receivedPage.nextCursor);
      setSentCursor(givenPage.nextCursor);

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
        for (const event of displayInbox) {
          if (event.type === 'friend_request' && clearActors.has(event.actorId)) {
            sessionUnreadIds.delete(event.id);
          }
        }
        setInbox(
          displayInbox.map((e) =>
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
      setPendingContactRequesterIds(new Set(pendingContactIds));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load activity history.';
      setLoadError(message);
      toast({ variant: 'destructive', title: 'Activity history unavailable', description: message });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) {
      router.replace('/login?next=/activity');
      return;
    }
    void load();
  }, [authReady, user?.id, router, load]);

  useEffect(() => {
    if (!authReady || !user?.id) return;
    const revalidate = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const onPageShow = () => revalidate();
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [authReady, load, user?.id]);

  useEffect(() => {
    const clearVisitHighlights = () => sessionUnreadIdsRef.current?.clear();
    window.addEventListener('pagehide', clearVisitHighlights);
    return () => window.removeEventListener('pagehide', clearVisitHighlights);
  }, []);

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
        setInbox((prev) => {
          const resolvedIds = prev
            .filter((e) => e.type === 'friend_request' && e.actorId === peer)
            .map((e) => e.id);
          resolvedIds.forEach((id) => sessionUnreadIdsRef.current?.delete(id));
          return prev.map((e) =>
            e.type === 'friend_request' && e.actorId === peer
              ? { ...e, readAt: e.readAt || new Date().toISOString() }
              : e
          );
        });
        setResolvedRequestIds((prev) => {
          const next = new Set(prev);
          if (detail.clearedActivityIds?.length) {
            detail.clearedActivityIds.forEach((id) => next.add(id));
          }
          return next;
        });
      } else if (detail.clearedActivityIds?.length) {
        const cleared = new Set(detail.clearedActivityIds);
        cleared.forEach((id) => sessionUnreadIdsRef.current?.delete(id));
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
    if (!user?.id || loading) return;
    const sessionUnreadIds = sessionUnreadIdsRef.current;
    if (!sessionUnreadIds?.size) return;
    const eventIds = [...sessionUnreadIds]
      .filter((id) => !serverMarkedIdsRef.current.has(id))
      .filter((id) => inbox.find((event) => event.id === id)?.type !== 'house_release');
    if (!eventIds.length) return;
    eventIds.forEach((id) => serverMarkedIdsRef.current.add(id));
    void markActivityEventsRead(eventIds)
      .then(() => refreshActivityAlerts())
      .catch(() => eventIds.forEach((id) => serverMarkedIdsRef.current.delete(id)));
    // Intentionally keep local readAt values unchanged: this visit should visibly
    // distinguish the entries the member had not seen before opening Activity.
  }, [user?.id, loading, inbox]);

  const loadOlder = useCallback(async (direction: ActivityDirection) => {
    const cursor = direction === 'received' ? inboxCursor : sentCursor;
    if (!cursor || loadingOlder) return;
    setLoadingOlder(direction);
    try {
      const page = await fetchActivityFeedPage(direction, 60, cursor);
      const resolved = await withResolvedProfileLinks(page.events);
      const sessionUnreadIds = sessionUnreadIdsRef.current ?? new Set<string>();
      for (const event of resolved) {
        if (event.direction === 'received' && !event.readAt) sessionUnreadIds.add(event.id);
      }
      sessionUnreadIdsRef.current = sessionUnreadIds;
      const displayRows = resolved.map((event) =>
        sessionUnreadIds.has(event.id) ? { ...event, readAt: null } : event
      );
      const appendUnique = (current: ActivityEvent[]) => {
        const seen = new Set(current.map((event) => event.id));
        return [...current, ...displayRows.filter((event) => !seen.has(event.id))];
      };
      if (direction === 'received') {
        setInbox(appendUnique);
        setInboxCursor(page.nextCursor);
      } else {
        setSent(appendUnique);
        setSentCursor(page.nextCursor);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not load older activity',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoadingOlder(null);
    }
  }, [inboxCursor, loadingOlder, sentCursor, toast]);

  const isRequestActionable = useCallback(
    (event: ActivityEvent) => {
      if (event.direction !== 'received' || resolvedRequestIds.has(event.id)) return false;
      if (event.type === 'friend_request') return pendingRequesterIds.has(event.actorId);
      if (event.type === 'contact_request') return pendingContactRequesterIds.has(event.actorId);
      return false;
    },
    [pendingRequesterIds, pendingContactRequesterIds, resolvedRequestIds]
  );

  const requestRows = useMemo(
    () => inbox.filter((e) => isRequestActionable(e)),
    [inbox, isRequestActionable]
  );
  const unreadRequestCount = requestRows.filter((e) => !e.readAt).length;

  const handleMarkAll = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      await markAllActivityEventsRead();
      sessionUnreadIdsRef.current?.clear();
      setInbox((prev) =>
        prev.map((e) => ({ ...e, readAt: e.readAt || new Date().toISOString() }))
      );
      refreshActivityAlerts();
      toast({ title: 'All caught up' });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleMarkAllUnread = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      await markAllActivityEventsUnread();
      if (!sessionUnreadIdsRef.current) sessionUnreadIdsRef.current = new Set();
      setInbox((prev) => {
        prev.forEach((event) => sessionUnreadIdsRef.current?.add(event.id));
        return prev.map((event) => ({ ...event, readAt: null }));
      });
      refreshActivityAlerts();
      toast({ title: 'Marked unread' });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleMarkUnread = async (event: ActivityEvent) => {
    if (busyId || !event.readAt) return;
    setBusyId(event.id);
    try {
      await markActivityEventsUnread([event.id]);
      if (!sessionUnreadIdsRef.current) sessionUnreadIdsRef.current = new Set();
      sessionUnreadIdsRef.current.add(event.id);
      serverMarkedIdsRef.current.delete(event.id);
      setInbox((prev) =>
        prev.map((item) => (item.id === event.id ? { ...item, readAt: null } : item))
      );
      refreshActivityAlerts();
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (event: ActivityEvent) => {
    try {
      await markActivityEventsRead([event.id]);
      serverMarkedIdsRef.current.add(event.id);
      sessionUnreadIdsRef.current?.delete(event.id);
      setInbox((prev) =>
        prev.map((item) =>
          item.id === event.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
        )
      );
      refreshActivityAlerts();
    } catch {
      /* still navigate */
    }
    const href = await resolveActivityOpenHref(event, { viewerUserId: user?.id });
    navigateActivityHref((h) => router.push(h), href);
  };

  const handleRespond = async (event: ActivityEvent, accept: boolean) => {
    if (!user) return;
    setBusyId(event.id);
    try {
      if (event.type === 'contact_request') {
        await respondArtistContact({
          requesterId: event.actorId,
          accept,
          artistName: user.displayName || 'Artist',
        });
        toast({
          title: accept ? `Contact shared with ${event.actorName}` : 'Request declined',
        });
        setPendingContactRequesterIds((prev) => {
          const next = new Set(prev);
          next.delete(event.actorId);
          return next;
        });
      } else {
        const friendshipId = friendshipIdFor(user.id, event.actorId);
        if (accept) {
          await acceptFriendRequest(friendshipId);
          toast({ title: `You and ${event.actorName} are friends now` });
        } else {
          await removeFriendship(friendshipId);
          toast({ title: 'Request declined' });
        }
        setPendingRequesterIds((prev) => {
          const next = new Set(prev);
          next.delete(event.actorId);
          return next;
        });
      }
      setResolvedRequestIds((prev) => new Set(prev).add(event.id));
      sessionUnreadIdsRef.current?.delete(event.id);
      setInbox((prev) =>
        prev.map((e) =>
          e.id === event.id || (e.type === event.type && e.actorId === event.actorId)
            ? { ...e, readAt: new Date().toISOString() }
            : e
        )
      );
      void markActivityEventsRead([event.id]).then(() => refreshActivityAlerts());
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
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <InboxPageAtmosphere variant="activity" />
      <div className="container relative z-10 mx-auto max-w-2xl px-4 py-8 font-code">
      <Card className="border-2 border-emerald-500/25 bg-[#07111f]/75 shadow-[0_0_48px_rgba(16,185,129,0.1)] backdrop-blur-md">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-headline text-2xl uppercase">
                <Bell className="h-6 w-6 text-emerald-400" /> Activity
              </CardTitle>
              <CardDescription className="mt-1 text-sm leading-relaxed">
                Loves, replies, friend and contact requests, and DNA Drop imports — received and sent.
              </CardDescription>
            </div>
            <InboxBulkReadToggle
              unreadCount={unreadReceived}
              onMarkAllRead={handleMarkAll}
              onMarkAllUnread={handleMarkAllUnread}
              busy={bulkBusy}
              variant="emerald"
              className="h-9 px-2.5"
            />
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
            <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1 border border-emerald-500/20 bg-emerald-500/[0.06] p-1">
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

            {loadError ? (
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100 sm:flex-row sm:items-center sm:justify-between">
                <span>{loadError}</span>
                <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
              </div>
            ) : null}

            {loading && inbox.length === 0 && sent.length === 0 ? (
              <div className="flex justify-center py-16">
                <StudioLoader size="md" message="Loading…" />
              </div>
            ) : (
              <>
                <TabsContent value="inbox" className="mt-0 space-y-2">
                  {inbox.length === 0 && !loadError ? (
                    <EmptyState
                      icon={Bell}
                      title="Nothing yet"
                      body="When someone loves your post, replies, friends you, or imports your DNA Drop, it lands here."
                    />
                  ) : null}
                  {inbox.map((event) => (
                    <ActivityRow
                      key={event.id}
                      event={event}
                      onRespondRequest={handleRespond}
                      onOpen={handleOpen}
                      onMarkUnread={handleMarkUnread}
                      busyId={busyId}
                      requestResolved={!isRequestActionable(event)}
                    />
                  ))}
                  {inboxCursor ? (
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      disabled={loadingOlder !== null}
                      onClick={() => void loadOlder('received')}
                    >
                      {loadingOlder === 'received' ? 'Loading older activity…' : 'Load older activity'}
                    </Button>
                  ) : inbox.length ? (
                    <p className="py-3 text-center text-[9px] uppercase tracking-widest text-muted-foreground">Beginning of your stored activity</p>
                  ) : null}
                </TabsContent>

                <TabsContent value="requests" className="mt-0 space-y-2">
                  {requestRows.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No requests"
                      body="Friend requests and contact requests show up here so you can accept or decline."
                    />
                  ) : (
                    requestRows.map((event) => (
                      <ActivityRow
                        key={event.id}
                        event={event}
                        onRespondRequest={handleRespond}
                        onOpen={handleOpen}
                        onMarkUnread={handleMarkUnread}
                        busyId={busyId}
                        requestResolved={!isRequestActionable(event)}
                      />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="sent" className="mt-0 space-y-2">
                  {sent.length === 0 && !loadError ? (
                    <EmptyState
                      icon={Check}
                      title="No sent activity"
                      body="Loves, replies, requests, and DNA imports you make are listed here."
                    />
                  ) : null}
                  {sent.map((event) => (
                    <ActivityRow key={event.id} event={event} onOpen={handleOpen} />
                  ))}
                  {sentCursor ? (
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      disabled={loadingOlder !== null}
                      onClick={() => void loadOlder('given')}
                    >
                      {loadingOlder === 'given' ? 'Loading older activity…' : 'Load older sent activity'}
                    </Button>
                  ) : sent.length ? (
                    <p className="py-3 text-center text-[9px] uppercase tracking-widest text-muted-foreground">Beginning of your stored sent activity</p>
                  ) : null}
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
