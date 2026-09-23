'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { fetchProfileReachAnalytics } from '@/lib/reach-analytics-client';
import { ReachAnalyticsDialog } from '@/components/reach/reach-analytics-dialog';
import { ReachUniqueCount } from '@/components/reach/reach-unique-count';

type ProfileReachStripProps = {
  slug: string;
  ownerId?: string;
  profileViewCount?: number;
  profileViewCountUnique?: number;
  legacyProfilePageLoads?: number;
  className?: string;
  size?: 'sm' | 'md';
};

export function ProfileReachStrip({
  slug,
  ownerId,
  profileViewCount,
  profileViewCountUnique,
  legacyProfilePageLoads,
  className,
  size = 'sm',
}: ProfileReachStripProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() =>
    typeof profileViewCountUnique === 'number'
      ? profileViewCountUnique
      : typeof profileViewCount === 'number'
        ? profileViewCount
        : 0
  );

  useEffect(() => {
    const next =
      typeof profileViewCount === 'number'
        ? profileViewCount
        : typeof profileViewCountUnique === 'number'
          ? profileViewCountUnique
          : 0;
    setDisplay(next);
  }, [profileViewCount, profileViewCountUnique]);

  const isOwner = Boolean(user?.id && ownerId && user.id === ownerId);
  const loadProfileReach = useCallback(
    (days: number) => fetchProfileReachAnalytics(slug, days),
    [slug]
  );

  useEffect(() => {
    if (!isOwner) return;
    const clean = slug.trim();
    if (!clean) return;
    let cancelled = false;
    void (async () => {
      try {
        const headers: HeadersInit = { cache: 'no-store' };
        const token = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        if (token) {
          (headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`/api/profile/${encodeURIComponent(clean)}`, { headers });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        const count =
          typeof data.profileViewCount === 'number'
            ? data.profileViewCount
            : typeof data.ownerProfileViewCount === 'number'
              ? data.ownerProfileViewCount
              : typeof data.profileViewCountUnique === 'number'
                ? data.profileViewCountUnique
                : 0;
        setDisplay(count);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, isOwner]);

  if (!isOwner) return null;

  return (
    <>
      <ReachUniqueCount
        count={display}
        label="Profile visits"
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
          title="Artist Home reach"
          subtitle="Unique people vs total public opens on your wall. Tap All time for the full picture. DNA drops are tracked separately on each link."
          load={loadProfileReach}
        />
      ) : null}
    </>
  );
}
