'use client';

import { CollabSheetActiveBadge } from '@/components/collab-sheet/collab-sheet-active-badge';
import { CollabSheetMembersMenu } from '@/components/collab-sheet/collab-sheet-members-menu';
import { useCollabSheetSession } from '@/components/collab-sheet/collab-sheet-session';

/** Collab presence — count chip + active badge under lyrics size toggles. */
export function CollabSheetToolbarPresence({ userId }: { userId?: string }) {
  const session = useCollabSheetSession();
  if (!session?.sheet || !userId) return null;

  const { sheet, collab, isOwner, userName, openMsgsWith } = session;

  return (
    <div className="flex flex-col items-end gap-1">
      <CollabSheetMembersMenu
        sheet={sheet}
        presence={collab.presence}
        liveCount={collab.liveCount}
        totalShared={collab.totalShared}
        userId={userId}
        userName={userName}
        isOwner={isOwner}
        onMessage={openMsgsWith}
      />
      <CollabSheetActiveBadge liveCount={collab.liveCount} />
    </div>
  );
}
