'use client';

import { useMemo } from 'react';
import { CollabSheetMembersMenu } from '@/components/collab-sheet/collab-sheet-members-menu';
import { useCollabSheetSession } from '@/components/collab-sheet/collab-sheet-session';

/** Collab presence chip — sticky, vertically centered on the top sheet line. */
export function CollabSheetFloatingPresence({
  userId,
  lineHeight = '32px',
}: {
  userId?: string;
  lineHeight?: string;
}) {
  const session = useCollabSheetSession();
  const linePx = parseInt(lineHeight, 10) || 32;

  // Grid rules sit at the bottom of each row (lineHeight - 1px). Center the chip
  // in the writable band above that rule, with a slight upward optical nudge.
  const padTop = useMemo(() => {
    const bandCenter = (linePx - 1) / 2;
    const chipHalf = 9;
    return Math.max(0, Math.round(bandCenter - chipHalf - 5) + 2);
  }, [linePx]);

  if (!session?.sheet || !userId) return null;

  const { sheet, collab, isOwner, openMsgsWith } = session;

  return (
    <div
      className="sticky top-0 z-30 flex w-full justify-end overflow-hidden px-2 md:px-4 pointer-events-none"
      style={{ height: lineHeight, marginBottom: `calc(-1 * ${lineHeight})` }}
    >
      <div className="pointer-events-auto max-w-fit leading-none -translate-x-2 md:-translate-x-3" style={{ paddingTop: padTop }}>
        <CollabSheetMembersMenu
          sheet={sheet}
          presence={collab.presence}
          liveCount={collab.liveCount}
          totalShared={collab.totalShared}
          userId={userId}
          isOwner={isOwner}
          onMessage={openMsgsWith}
        />
      </div>
    </div>
  );
}
