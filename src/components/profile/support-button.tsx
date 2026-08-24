'use client';

import { useEffect, useState } from 'react';
import { Check, HeartHandshake, Star, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  fetchSupportRelationship,
  updateSupportRelationship,
} from '@/lib/relationships-client';
import type { SupportRelationshipState } from '@/lib/relationships';

export function SupportButton({
  targetUserId,
  targetName,
}: {
  targetUserId: string;
  targetName: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<SupportRelationshipState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || user.id === targetUserId) return;
    let cancelled = false;
    void fetchSupportRelationship(user.id, targetUserId)
      .then((next) => { if (!cancelled) setState(next); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [targetUserId, user?.id]);

  if (user?.id === targetUserId) return null;
  if (!user) {
    return (
      <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
        <a href="/login"><HeartHandshake className="h-3.5 w-3.5" /> Follow</a>
      </Button>
    );
  }

  const run = async (
    action: 'follow' | 'unfollow' | 'inner_circle_on' | 'inner_circle_off'
  ) => {
    setBusy(true);
    try {
      const next = await updateSupportRelationship({
        userId: user.id,
        targetUserId,
        action,
      });
      setState(next);
      toast({
        title:
          action === 'follow'
            ? `Following ${targetName}`
            : action === 'unfollow'
              ? `Unfollowed ${targetName}`
              : action === 'inner_circle_on'
                ? `${targetName} is in your Inner Circle`
                : `${targetName} stays followed`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not update support',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!state?.following) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-9 gap-1.5 font-bold uppercase"
        disabled={busy || !state}
        onClick={() => void run('follow')}
        title={state ? `${state.followerCount} followers` : 'Loading followers'}
      >
        <HeartHandshake className="h-3.5 w-3.5" /> Follow
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 gap-1.5 font-bold uppercase"
          disabled={busy}
          title={`${state.followerCount} followers · ${state.innerCircleCount} Inner Circle`}
        >
          {state.innerCircle ? <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> : <Check className="h-3.5 w-3.5 text-emerald-300" />}
          {state.innerCircle ? 'Inner Circle' : 'Following'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {state.followerCount} followers · {state.innerCircleCount} Inner Circle
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void run(state.innerCircle ? 'inner_circle_off' : 'inner_circle_on')}>
          <Star className="mr-2 h-4 w-4 text-amber-300" />
          {state.innerCircle ? 'Remove from Inner Circle' : 'Add to Inner Circle'}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-rose-300" onClick={() => void run('unfollow')}>
          <UserMinus className="mr-2 h-4 w-4" /> Unfollow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
