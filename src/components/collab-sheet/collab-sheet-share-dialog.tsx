'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, UserMinus, UserPlus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  closeCollabClient,
  inviteCollabClient,
  openCollabSheetClient,
  revokeCollabClient,
} from '@/lib/collab-sheet/client';
import { collabSheetIdFor, type CollabSheetDoc } from '@/lib/collab-sheet/types';
import type { TrackSection } from '@/lib/types';
import type { Friendship } from '@/lib/profile/social-client';
import { friendProfilesOf } from '@/lib/profile/social-client';
import { studioNameClass } from '@/lib/studio-tier-chrome';

export function CollabSheetShareDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userSlug,
  trackId,
  albumId,
  title,
  albumTitle,
  sections,
  sheet,
  friendships,
  isOwner,
  onUpdated,
  onOpenChatWith,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userSlug?: string;
  trackId: string;
  albumId: string;
  title: string;
  albumTitle?: string;
  sections: TrackSection[];
  sheet: CollabSheetDoc | null;
  friendships: Friendship[];
  isOwner: boolean;
  onUpdated: (sheet: CollabSheetDoc | null) => void;
  onOpenChatWith?: (userId: string, name: string) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const friends = useMemo(
    () =>
      friendProfilesOf(friendships, userId, { displayName: userName }).filter(
        (f) => f.userId !== userId
      ),
    [friendships, userId, userName]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, query]);

  const members = sheet?.memberIds.filter((id) => !sheet.revoked[id]) || [];

  const ensureOpen = async (): Promise<CollabSheetDoc> => {
    if (sheet?.active) return sheet;
    setBusy(true);
    try {
      const res = await openCollabSheetClient({
        userId,
        ownerName: userName,
        ownerSlug: userSlug,
        trackId,
        albumId,
        title,
        albumTitle,
        sections,
      });
      onUpdated(res.sheet as CollabSheetDoc);
      toast({ title: 'Collab Sheet is live', description: 'Invite friends to write on this sheet together.' });
      return res.sheet as CollabSheetDoc;
    } finally {
      setBusy(false);
    }
  };

  const invite = async (peerId: string, peerName: string) => {
    if (!isOwner) return;
    setBusy(true);
    try {
      const live = await ensureOpen();
      const res = await inviteCollabClient({
        userId,
        collabId: live.id,
        peerId,
        ownerName: userName,
        peerName,
      });
      onUpdated(res.sheet as CollabSheetDoc);
      toast({ title: 'Invited', description: `${peerName} can open this sheet now.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not invite', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (peerId: string) => {
    if (!sheet || !isOwner) return;
    setBusy(true);
    try {
      const res = await revokeCollabClient({ userId, collabId: sheet.id, peerId });
      onUpdated(res.sheet as CollabSheetDoc);
      toast({ title: 'Access revoked' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not revoke', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const closeSheet = async () => {
    if (!sheet || !isOwner) return;
    setBusy(true);
    try {
      await closeCollabClient({ userId, collabId: sheet.id });
      onUpdated(null);
      onOpenChange(false);
      toast({ title: 'Collab Sheet closed' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not close', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-2">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl uppercase flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-400" /> Collab Sheet
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Share a live editable copy of <strong className="text-foreground">{title}</strong>. Changes sync in
            real time when you are both on the sheet. Only you can invite more people.
          </DialogDescription>
        </DialogHeader>

        {sheet?.active ? (
          <div className="space-y-2">
            <p className="font-code text-[9px] font-bold uppercase tracking-widest text-violet-300">On this sheet</p>
            <ul className="max-h-32 overflow-y-auto studio-scrollbar space-y-1 rounded-lg border border-white/10 bg-black/20 p-2">
              {members.map((id) => {
                const m = sheet.members[id];
                const owner = id === sheet.ownerId;
                const name = m?.name?.trim() || 'Artist';
                return (
                  <li key={id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className={studioNameClass(m?.studioBadge || 'free', 'truncate font-bold')}>
                        {name}
                      </span>
                      {owner ? <span className="shrink-0 text-[9px] uppercase text-muted-foreground">owner</span> : null}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {onOpenChatWith && id !== userId ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[9px] uppercase"
                          onClick={() => onOpenChatWith(id, name)}
                        >
                          Message
                        </Button>
                      ) : null}
                      {isOwner && !owner ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                          disabled={busy}
                          onClick={() => void revoke(id)}
                          aria-label="Revoke access"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {isOwner ? (
          <div className="space-y-2">
            <p className="font-code text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Invite a friend
            </p>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends…"
              className="h-9 text-sm"
            />
            <ul className="max-h-40 overflow-y-auto studio-scrollbar space-y-1">
              {filtered.map((f) => {
                const onSheet = members.includes(f.userId);
                return (
                  <li key={f.userId} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 px-2 py-1.5">
                    <span className="text-sm truncate">{f.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={onSheet ? 'secondary' : 'default'}
                      className="h-7 gap-1 text-[9px] uppercase shrink-0"
                      disabled={busy || onSheet}
                      onClick={() => void invite(f.userId, f.name)}
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                      {onSheet ? 'Added' : 'Invite'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!sheet?.active && isOwner ? (
            <Button type="button" className="font-bold uppercase" disabled={busy} onClick={() => void ensureOpen()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Open Collab Sheet
            </Button>
          ) : null}
          {sheet?.active && isOwner ? (
            <Button type="button" variant="destructive" className="font-bold uppercase" disabled={busy} onClick={() => void closeSheet()}>
              Close Collab Sheet
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function collabIdForTrack(ownerId: string, trackId: string): string {
  return collabSheetIdFor(ownerId, trackId);
}
