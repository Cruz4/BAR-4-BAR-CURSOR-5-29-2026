'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CollabPresence, CollabSheetDoc } from '@/lib/collab-sheet/types';
import { COLLAB_PRESENCE_STALE_MS } from '@/lib/collab-sheet/types';
import { CollabSheetPresenceChip } from '@/components/collab-sheet/collab-sheet-presence-chip';

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
  isOwner,
  onMessage,
  onRevoke,
}: {
  sheet: CollabSheetDoc;
  presence: Record<string, CollabPresence>;
  liveCount: number;
  totalShared: number;
  userId?: string;
  isOwner: boolean;
  onMessage: (targetUserId: string, name: string) => void;
  onRevoke?: (targetUserId: string) => void;
}) {
  const members = sheet.memberIds.filter((id) => !sheet.revoked[id]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span className="inline-flex">
          <CollabSheetPresenceChip liveCount={liveCount} totalShared={totalShared} />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-code text-[9px] uppercase tracking-widest text-violet-300">
          Collab Sheet
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((id) => {
          const m = sheet.members[id];
          const live = isLive(presence[id]);
          const owner = id === sheet.ownerId;
          return (
            <DropdownMenuItem
              key={id}
              className="flex items-center justify-between gap-2"
              onSelect={(e) => {
                if (id === userId) return;
                e.preventDefault();
                onMessage(id, m?.name || 'Artist');
              }}
            >
              <span className="truncate text-sm">
                {m?.name || 'Artist'}
                {owner ? ' · owner' : ''}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {live ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live" />
                ) : (
                  <span className="text-[9px] text-muted-foreground uppercase">away</span>
                )}
              </span>
            </DropdownMenuItem>
          );
        })}
        {isOwner && onRevoke ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[9px] text-muted-foreground font-normal">
              Tap a name to message. Revoke from Collab Sheet settings.
            </DropdownMenuLabel>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
