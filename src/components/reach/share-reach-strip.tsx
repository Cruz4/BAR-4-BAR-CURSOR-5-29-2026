'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { displayReachCount, fetchShareReachAnalytics, recordShareLandingClient } from '@/lib/reach-analytics-client';
import { ReachAnalyticsDialog } from '@/components/reach/reach-analytics-dialog';
import { ReachUniqueCount } from '@/components/reach/reach-unique-count';

type ShareReachStripProps = {
  shareId: string;
  ownerId: string;
  landingCount?: number;
  legacyViews?: number;
  reachDisplayCount?: number;
  className?: string;
  size?: 'sm' | 'md';
};

/** Records unique landings + shows count (owner tap opens analytics). */
export function ShareReachStrip({
  shareId,
  ownerId,
  landingCount,
  legacyViews,
  reachDisplayCount,
  className,
  size = 'sm',
}: ShareReachStripProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [localUnique, setLocalUnique] = useState<number | undefined>(landingCount);
  const [localLegacy, setLocalLegacy] = useState<number | undefined>(legacyViews);
  const [localDisplay, setLocalDisplay] = useState<number | undefined>(reachDisplayCount);

  useEffect(() => {
    setLocalUnique(landingCount);
    setLocalLegacy(legacyViews);
    setLocalDisplay(reachDisplayCount);
  }, [landingCount, legacyViews, reachDisplayCount]);

  useEffect(() => {
    const id = shareId.trim().toUpperCase();
    if (!id) return;
    recordShareLandingClient(id);
  }, [shareId]);

  useEffect(() => {
    const id = shareId.trim().toUpperCase();
    if (!id) return;
    let cancelled = false;
    void fetch(`/api/shares/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { share?: { landingCount?: number; views?: number }; landingCount?: number; views?: number } | null) => {
        if (cancelled || !data) return;
        const unique =
          typeof data.share?.landingCount === 'number'
            ? data.share.landingCount
            : typeof data.landingCount === 'number'
              ? data.landingCount
              : undefined;
        const legacy =
          typeof data.share?.views === 'number'
            ? data.share.views
            : typeof data.views === 'number'
              ? data.views
              : undefined;
        if (typeof unique === 'number') setLocalUnique(unique);
        if (typeof legacy === 'number') setLocalLegacy(legacy);
        if (typeof unique === 'number' || typeof legacy === 'number') {
          setLocalDisplay(displayReachCount(unique, legacy));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const isOwner = Boolean(user?.id && user.id === ownerId);
  const canManage = isOwner; // share doc shape not needed for strip

  const loadShareReach = useCallback(
    (days: number) => fetchShareReachAnalytics(shareId, days),
    [shareId]
  );

  const display =
    typeof localDisplay === 'number'
      ? localDisplay
      : displayReachCount(localUnique, localLegacy);

  return (
    <>
      <ReachUniqueCount
        count={display}
        label="Views"
        interactive={canManage}
        onPress={canManage ? () => setOpen(true) : undefined}
        className={className}
        size={size}
        compact
      />
      {canManage ? (
        <ReachAnalyticsDialog
          open={open}
          onOpenChange={setOpen}
          title="Drop reach"
          subtitle="Unique people who landed on this link — areas, UTC peak times, referrers, and daily trend."
          load={loadShareReach}
        />
      ) : null}
    </>
  );
}
