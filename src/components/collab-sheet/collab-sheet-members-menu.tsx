'use client';

import React, { useState } from 'react';
import { MessageSquare, Radio } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { CollabPresence, CollabSheetDoc } from '@/lib/collab-sheet/types';
import { COLLAB_PRESENCE_STALE_MS } from '@/lib/collab-sheet/types';
import { sendCollabMessageClient } from '@/lib/collab-sheet/client';
import { CollabSheetPresenceChip } from '@/components/collab-sheet/collab-sheet-presence-chip';
import { useToast } from '@/hooks/use-toast';
import { studioNameClass } from '@/lib/studio-tier-chrome';

function isLive(p: CollabPresence | undefined, now = Date.now()): boolean {
  if (!p?.at) return false;
  const t = Date.parse(p.at);
  return Number.isFinite(t) && now - t < COLLAB_PRESENCE_STALE_MS;
}

export function CollabSheetMembersMenu({
  sheet,
  presence,
  liveCount,
  totalShared,
  userId,
  userName,
  isOwner,
  onMessage,
  onRevoke,
}: {
  sheet: CollabSheetDoc;
  presence: Record<string, CollabPresence>;
  liveCount: number;
  totalShared: number;
  userId?: string;
  userName?: string;
  isOwner: boolean;
  onMessage: (targetUserId: string, name: string) => void;
  onRevoke?: (targetUserId: string) => void;
}) {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const members = sheet.memberIds.filter((id) => !sheet.revoked[id]);

  if (members.length < 2) return null;

  const ping = async (targetUserId: string, name: string) => {
    if (!userId || targetUserId === userId) return;
    setBusyId(targetUserId);
    try {
      await sendCollabMessageClient({
        userId,
        userName: userName || 'Artist',
        collabId: sheet.id,
        targetUserId,
        text: `Ping — ${userName || 'someone'} needs you on "${sheet.title}".`,
        clientId: `ping_${Date.now()}`,
      });
      toast({ title: `Pinged ${name}`, description: 'They’ll get a Collab Sheet ping in Activity.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not ping',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span className="inline-flex">
          <CollabSheetPresenceChip liveCount={liveCount} totalShared={totalShared} />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest text-violet-300">
          On this Collab Sheet
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((id) => {
          const m = sheet.members[id];
          const live = isLive(presence[id]);
          const owner = id === sheet.ownerId;
          const self = id === userId;
          const savedName = m?.name?.trim();
          const liveName = presence[id]?.name?.trim();
          const name = savedName && savedName !== 'Artist'
            ? savedName
            : liveName || savedName || 'Artist';
          return (
            <DropdownMenuItem
              key={id}
              className="flex cursor-default flex-col items-stretch gap-1.5 py-2"
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className={studioNameClass(m?.studioBadge || 'free', 'truncate text-sm font-bold')}>
                    {self ? 'You' : name}
                  </span>
                  {owner ? <span className="shrink-0 text-[9px] uppercase text-muted-foreground">owner</span> : null}
                </span>
                {live ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 animate-pulse" title="Live" />
                ) : (
                  <span className="text-[9px] uppercase text-muted-foreground">away</span>
                )}
              </div>
              {!self ? (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 flex-1 gap-1 px-2 text-[9px] font-bold uppercase"
                    onClick={() => onMessage(id, name)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Message
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 gap-1 px-2 text-[9px] font-bold uppercase"
                    disabled={busyId === id}
                    onClick={() => void ping(id, name)}
                  >
                    <Radio className="h-3 w-3" />
                    Ping
                  </Button>
                </div>
              ) : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[9px] leading-snug text-muted-foreground">
          Message opens Msgs. Ping sends an Activity alert to pull them back to the sheet.
          {isOwner && onRevoke ? ' Revoke access from Collab Sheet settings.' : ''}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
