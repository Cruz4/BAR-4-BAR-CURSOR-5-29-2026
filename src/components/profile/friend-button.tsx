'use client';

import React, { useEffect, useState } from 'react';
import { Ban, Check, Clock, UserMinus, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  acceptFriendRequest,
  blockUser,
  fetchFriendshipWith,
  isUserBlocked,
  removeFriendship,
  sendFriendRequest,
  unblockUser,
  type Friendship,
} from '@/lib/profile/social-client';
import { looksLikeNeomaiyaSol } from '@/lib/profile/neomaiya-sol';

type FriendButtonProps = {
  targetUserId: string;
  targetName: string;
  targetSlug?: string;
  /** Signed-in viewer's own public slug (for the denormalized friendship doc). */
  viewerSlug?: string;
};

/**
 * Add friend / requested / accept / friends / block states on a public profile.
 * Hidden for the profile owner; sign-in prompt for logged-out visitors.
 */
export function FriendButton({ targetUserId, targetName, targetSlug, viewerSlug }: FriendButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || user.id === targetUserId) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void Promise.all([fetchFriendshipWith(targetUserId), isUserBlocked(targetUserId)])
      .then(async ([f, b]) => {
        if (cancelled) return;
        setBlocked(b);
        // Neo founder invites should never sit as Accept — auto-heal to Friends.
        if (
          f?.status === 'pending' &&
          f.requestedBy === targetUserId &&
          looksLikeNeomaiyaSol(targetName, targetSlug)
        ) {
          try {
            await acceptFriendRequest(f.id);
            if (!cancelled) {
              setFriendship({ ...f, status: 'accepted' });
            }
            return;
          } catch {
            /* show Accept as fallback */
          }
        }
        if (!cancelled) setFriendship(f);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, targetUserId, targetName, targetSlug]);

  if (!loaded || (user?.id && user.id === targetUserId)) return null;

  const baseClass = 'h-9 gap-1.5 font-bold uppercase';

  if (!user) {
    return (
      <Button size="sm" variant="outline" className={baseClass} asChild>
        <a href="/login">
          <UserPlus className="h-3.5 w-3.5" /> <span className="max-[380px]:hidden">Add friend</span>
        </a>
      </Button>
    );
  }

  const run = async (fn: () => Promise<void>, errTitle: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: errTitle,
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (blocked) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={baseClass}
        disabled={busy}
        onClick={() => {
          if (!window.confirm(`Unblock ${targetName}?`)) return;
          void run(async () => {
            await unblockUser(targetUserId);
            setBlocked(false);
            toast({ title: 'Unblocked' });
          }, 'Could not unblock');
        }}
      >
        <Ban className="h-3.5 w-3.5" /> <span className="max-[380px]:hidden">Blocked · Unblock</span>
      </Button>
    );
  }

  const blockAction = (
    <Button
      size="sm"
      variant="ghost"
      className="h-9 gap-1 font-bold uppercase text-muted-foreground"
      disabled={busy}
      title="Block this artist"
      onClick={() => {
        if (!window.confirm(`Block ${targetName}? They will no longer be able to contact you or send friend requests.`)) return;
        void run(async () => {
          await blockUser({ userId: targetUserId, name: targetName, slug: targetSlug });
          setFriendship(null);
          setBlocked(true);
          toast({ title: 'Blocked', description: `${targetName} can’t send you friend requests.` });
        }, 'Could not block');
      }}
    >
      <Ban className="h-3.5 w-3.5" />
    </Button>
  );

  if (!friendship) {
    return (
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className={baseClass}
          disabled={busy}
          onClick={() =>
            run(async () => {
              const created = await sendFriendRequest(
                { name: user.displayName || 'Artist', slug: viewerSlug },
                { userId: targetUserId, name: targetName, slug: targetSlug }
              );
              setFriendship(created);
              toast({
                title:
                  created.status === 'accepted'
                    ? `You and ${targetName} are friends now`
                    : 'Friend request sent',
              });
            }, 'Could not send request')
          }
        >
          <UserPlus className="h-3.5 w-3.5" /> <span className="max-[380px]:hidden">Add friend</span>
        </Button>
        {blockAction}
      </div>
    );
  }

  if (friendship.status === 'accepted') {
    return (
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className={baseClass}
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Remove ${targetName} from your friends? You will continue following them unless you unfollow separately.`)) return;
            void run(async () => {
              await removeFriendship(friendship.id);
              setFriendship(null);
              toast({ title: 'Removed from friends' });
            }, 'Could not update friendship');
          }}
        >
          <Check className="h-3.5 w-3.5 text-emerald-400" /> <span className="max-[380px]:hidden">Friends</span>
          <UserMinus className="hidden h-3 w-3 opacity-60 sm:block" />
        </Button>
        {blockAction}
      </div>
    );
  }

  if (friendship.requestedBy === user.id) {
    return (
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className={baseClass}
          disabled={busy}
          onClick={() =>
            run(async () => {
              await removeFriendship(friendship.id);
              setFriendship(null);
              toast({ title: 'Request cancelled' });
            }, 'Could not cancel request')
          }
        >
          <Clock className="h-3.5 w-3.5" /> <span className="max-[380px]:hidden">Requested</span>
        </Button>
        {blockAction}
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        className={baseClass}
        disabled={busy}
        onClick={() =>
          run(async () => {
            await acceptFriendRequest(friendship.id);
            setFriendship({ ...friendship, status: 'accepted' });
            toast({ title: `You and ${targetName} are friends now` });
          }, 'Could not accept request')
        }
      >
        <Check className="h-3.5 w-3.5" /> <span className="max-[380px]:hidden">Accept</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={baseClass}
        disabled={busy}
        onClick={() =>
          run(async () => {
            await removeFriendship(friendship.id);
            setFriendship(null);
          }, 'Could not decline request')
        }
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      {blockAction}
    </div>
  );
}
