'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
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

  const isOwner = Boolean(user?.id && user.id === ownerId);

  useEffect(() => {
    if (!isOwner) return;
    const id = shareId.trim().toUpperCase();
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const headers: HeadersInit = { cache: 'no-store' };
        const token = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        if (token) {
          (headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`/api/shares/${encodeURIComponent(id)}`, { headers });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          share?: { landingCount?: number; views?: number };
          landingCount?: number;
          views?: number;
        };
        if (cancelled) return;
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
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId, isOwner]);

  const loadShareReach = useCallback(
    (days: number) => fetchShareReachAnalytics(shareId, days),
    [shareId]
  );

  const display =
    typeof localDisplay === 'number'
      ? localDisplay
      : displayReachCount(localUnique, localLegacy);

  if (!isOwner) return null;

  return (
    <>
      <ReachUniqueCount
        count={display}
        label="Views"
        interactive={isOwner}
        onPress={isOwner ? () => setOpen(true) : undefined}
        className={className}
        size={size}
        compact
      />
      {isOwner ? (
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
