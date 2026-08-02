'use client';

import React, { useEffect, useState } from 'react';
import { Check, Clock, UserMinus, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  acceptFriendRequest,
  fetchFriendshipWith,
  removeFriendship,
  sendFriendRequest,
  type Friendship,
} from '@/lib/profile/social-client';

type FriendButtonProps = {
  targetUserId: string;
  targetName: string;
  targetSlug?: string;
  /** Signed-in viewer's own public slug (for the denormalized friendship doc). */
  viewerSlug?: string;
};

/**
 * Add friend / requested / accept / friends states on a public profile.
 * Hidden for the profile owner; sign-in prompt for logged-out visitors.
 */
export function FriendButton({ targetUserId, targetName, targetSlug, viewerSlug }: FriendButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || user.id === targetUserId) {
      setLoaded(true);
      return;
    }
    fetchFriendshipWith(targetUserId)
      .then(setFriendship)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [user?.id, targetUserId]);

  if (!loaded || (user?.id && user.id === targetUserId)) return null;

  const baseClass = 'h-9 gap-1.5 font-bold uppercase';

  if (!user) {
    return (
      <Button size="sm" variant="outline" className={baseClass} asChild>
        <a href="/login">
          <UserPlus className="h-3.5 w-3.5" /> Add friend
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

  if (!friendship) {
    return (
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
            toast({ title: 'Friend request sent' });
          }, 'Could not send request')
        }
      >
        <UserPlus className="h-3.5 w-3.5" /> Add friend
      </Button>
    );
  }

  if (friendship.status === 'accepted') {
    return (
      <Button
        size="sm"
        variant="ghost"
        className={baseClass}
        disabled={busy}
        onClick={() =>
          run(async () => {
            await removeFriendship(friendship.id);
            setFriendship(null);
            toast({ title: 'Removed from friends' });
          }, 'Could not update friendship')
        }
      >
        <Check className="h-3.5 w-3.5 text-emerald-400" /> Friends
        <UserMinus className="h-3 w-3 opacity-60" />
      </Button>
    );
  }

  // Pending — I sent it vs they sent it
  if (friendship.requestedBy === user.id) {
    return (
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
        <Clock className="h-3.5 w-3.5" /> Requested
      </Button>
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
        <Check className="h-3.5 w-3.5" /> Accept
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
    </div>
  );
}
