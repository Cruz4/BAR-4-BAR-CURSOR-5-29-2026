'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Heart,
  Import,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  fetchActivityFeed,
  markActivityEventsRead,
  markAllActivityEventsRead,
} from '@/lib/activity/client';
import { activityVerb, type ActivityEvent, type ActivityType } from '@/lib/activity/types';
import { refreshActivityAlerts } from '@/hooks/use-activity-alerts';
import { StudioLoader } from '@/components/studio-loader';
import { useGamification } from '@/context/gamification-context';

function TypeIcon({ type }: { type: ActivityType }) {
  const className = 'h-3.5 w-3.5 shrink-0';
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return <UserPlus className={cn(className, 'text-emerald-400')} />;
    case 'post_love':
      return <Heart className={cn(className, 'text-rose-400')} />;
    case 'post_reply':
      return <MessageCircle className={cn(className, 'text-sky-400')} />;
    case 'dna_import':
      return <Import className={cn(className, 'text-amber-400')} />;
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

const PREVIEW_LIMIT = 8;

export function ActivityNavDropdown({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const { summary } = useGamification();
  const viewerSlug = summary?.profileSlug;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadUnread = useCallback(async () => {
    setLoading(true);
    try {
      const received = await fetchActivityFeed('received', 40);
      setItems(received.filter((e) => !e.readAt).slice(0, PREVIEW_LIMIT));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void loadUnread();
  };

  const markOne = async (event: ActivityEvent, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busyId) return;
    setBusyId(event.id);
    try {
      await markActivityEventsRead([event.id]);
      setItems((prev) => prev.filter((x) => x.id !== event.id));
      refreshActivityAlerts();
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    if (markingAll || items.length === 0) return;
    setMarkingAll(true);
    try {
      await markAllActivityEventsRead();
      setItems([]);
      refreshActivityAlerts();
    } finally {
      setMarkingAll(false);
    }
  };

  const openEvent = async (event: ActivityEvent) => {
    setOpen(false);
    try {
      await markActivityEventsRead([event.id]);
      refreshActivityAlerts();
    } catch {
      /* still navigate */
    }
    let href = event.href || '/activity';
    if (event.shareId) href = `/share/${event.shareId}`;
    else if (event.postId) {
      if (event.href?.includes('#post-')) href = event.href;
      else if (viewerSlug) href = `/profile/${viewerSlug}#post-${event.postId}`;
    } else if (event.type === 'friend_accepted' && event.actorSlug) {
      href = `/profile/${event.actorSlug}`;
    }
    router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 md:h-9 md:w-9 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
          aria-label={unreadCount > 0 ? `Activity, ${unreadCount} unread` : 'Activity'}
        >
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-black">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-1.25rem))] p-0 bg-card border-2 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2.5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <Bell className="h-3 w-3" /> Unread
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-emerald-400 disabled:opacity-40"
            disabled={markingAll || items.length === 0}
            onClick={() => void markAll()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>

        <div className="max-h-[min(22rem,50vh)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <StudioLoader size="sm" />
              <span className="text-[10px] font-code uppercase tracking-wider">Loading</span>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                You&apos;re caught up
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                No unread activity right now.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((event) => (
                <li key={event.id} className="group relative">
                  <button
                    type="button"
                    className="flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-emerald-500/5"
                    onClick={() => void openEvent(event)}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30">
                      <TypeIcon type={event.type} />
                    </span>
                    <span className="min-w-0 flex-1 pr-7">
                      <span className="block text-[12px] leading-snug">
                        <span className="font-bold text-foreground">{event.actorName}</span>{' '}
                        <span className="text-muted-foreground">
                          {activityVerb(event.type, 'received')}
                        </span>
                      </span>
                      {event.preview ? (
                        <span className="mt-0.5 line-clamp-1 block font-code text-[10px] text-muted-foreground/85">
                          “{event.preview}”
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[9px] uppercase tracking-wider text-muted-foreground/70">
                        {timeAgo(event.createdAt)}
                      </span>
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Mark as read"
                    aria-label="Mark as read"
                    disabled={busyId === event.id}
                    className="absolute right-1.5 top-2 h-7 w-7 text-muted-foreground hover:text-emerald-400 opacity-80 group-hover:opacity-100"
                    onClick={(e) => void markOne(event, e)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t bg-primary/5 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between gap-2 px-2.5 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => {
              setOpen(false);
              router.push('/activity');
            }}
          >
            View all activity
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
