'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { TrackSection } from '@/lib/types';
import type { Friendship } from '@/lib/profile/social-client';
import { useCollabSheet } from '@/hooks/use-collab-sheet';
import type { CollabSheetDoc } from '@/lib/collab-sheet/types';
import { CollabSheetShareDialog } from '@/components/collab-sheet/collab-sheet-share-dialog';

type CollabSheetSessionContextValue = {
  sheet: CollabSheetDoc | null;
  collab: ReturnType<typeof useCollabSheet>;
  isOwner: boolean;
  userName?: string;
  friendships: Friendship[];
  openMsgsWith: (peerId: string, peerName: string) => void;
  registerMsgsOpen: (fn: (peerId: string, peerName: string) => void) => void;
};

const CollabSheetSessionContext = createContext<CollabSheetSessionContextValue | null>(null);

export function useCollabSheetSession() {
  return useContext(CollabSheetSessionContext);
}

export function CollabSheetSession({
  collabSheetId,
  enabled,
  userId,
  userName,
  userSlug,
  trackId,
  albumId,
  trackTitle,
  albumTitle,
  sections,
  isOwner,
  friendships,
  onRemoteSections,
  onCollabSheetChange,
  shareOpen,
  onShareOpenChange,
  children,
}: {
  collabSheetId?: string | null;
  enabled: boolean;
  userId?: string;
  userName?: string;
  userSlug?: string;
  trackId: string;
  albumId: string;
  trackTitle: string;
  albumTitle?: string;
  sections: TrackSection[];
  isOwner: boolean;
  friendships: Friendship[];
  onRemoteSections: (sections: TrackSection[]) => void;
  onCollabSheetChange?: (id: string | null) => void;
  shareOpen?: boolean;
  onShareOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [dialogSheet, setDialogSheet] = useState<CollabSheetDoc | null>(null);
  const [msgsOpenHandler, setMsgsOpenHandler] = useState<
    ((peerId: string, peerName: string) => void) | null
  >(null);

  const listenId = collabSheetId || dialogSheet?.id || null;
  const shareDialogOpen = shareOpen ?? false;
  const setShareDialogOpen = onShareOpenChange ?? (() => undefined);

  const onRemote = useCallback(
    (remoteSections: TrackSection[]) => {
      onRemoteSections(remoteSections);
    },
    [onRemoteSections]
  );

  const collab = useCollabSheet({
    collabId: listenId,
    userId,
    userName,
    sections,
    enabled: enabled && Boolean(listenId),
    onRemoteSections: onRemote,
  });

  const sheet =
    collab.sheet?.active ? collab.sheet : dialogSheet?.active ? dialogSheet : null;

  const registerMsgsOpen = useCallback((fn: (peerId: string, peerName: string) => void) => {
    setMsgsOpenHandler(() => fn);
  }, []);

  const openMsgsWith = useCallback(
    (peerId: string, peerName: string) => {
      msgsOpenHandler?.(peerId, peerName);
    },
    [msgsOpenHandler]
  );

  const handleSheetUpdated = useCallback(
    (next: CollabSheetDoc | null) => {
      if (next?.active) setDialogSheet(next);
      else setDialogSheet(null);
      onCollabSheetChange?.(next?.active ? next.id : null);
    },
    [onCollabSheetChange]
  );

  useEffect(() => {
    if (collabSheetId) setDialogSheet(null);
  }, [collabSheetId]);

  const value = useMemo(
    () => ({
      sheet,
      collab,
      isOwner,
      userName,
      friendships,
      openMsgsWith,
      registerMsgsOpen,
    }),
    [sheet, collab, isOwner, userName, friendships, openMsgsWith, registerMsgsOpen]
  );

  if (!enabled || !userId) return <>{children}</>;

  return (
    <CollabSheetSessionContext.Provider value={value}>
      {children}
      <CollabSheetShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        userId={userId}
        userName={userName || 'Artist'}
        userSlug={userSlug}
        trackId={trackId}
        albumId={albumId}
        title={trackTitle}
        albumTitle={albumTitle}
        sections={sections}
        sheet={sheet}
        friendships={friendships}
        isOwner={isOwner}
        onUpdated={handleSheetUpdated}
        onOpenChatWith={openMsgsWith}
      />
    </CollabSheetSessionContext.Provider>
  );
}
