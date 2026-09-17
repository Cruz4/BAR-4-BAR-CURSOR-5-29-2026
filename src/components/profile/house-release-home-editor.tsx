'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Gift, Loader2, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/client/firebase';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { pressedSongHref } from '@/lib/pressed-song';
import { setHouseReleaseOnHome, subscribeHouseReleaseHome } from '@/lib/profile/artist-home-client';
import { applyHouseReleaseHomeVisibility } from '@/lib/profile/house-release-home';
import { useToast } from '@/hooks/use-toast';
import type { ArtistHomeConfig } from '@/lib/profile/modules';
import { isHouseReleaseVisibleOnHome, type LinkedHouseRelease } from '@/lib/house-artist-link';

type UpdateFn = (mutate: (draft: ArtistHomeConfig) => void) => void;

export function HouseReleaseHomeEditor({
  userId,
  config,
  update,
}: {
  userId: string;
  config: ArtistHomeConfig;
  update: UpdateFn;
}) {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [releases, setReleases] = useState<LinkedHouseRelease[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const user = auth.currentUser;
      if (!user || user.uid !== userId) {
        if (!cancelled) {
          setReleases([]);
          setLoading(false);
        }
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`/api/profile/house-releases?userId=${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        releases?: LinkedHouseRelease[];
        error?: string;
      };
      if (!cancelled) {
        setReleases(res.ok && Array.isArray(data.releases) ? data.releases : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const hidden = useMemo(
    () => config.featured.hiddenHouseReleaseShareIds || [],
    [config.featured.hiddenHouseReleaseShareIds]
  );

  useEffect(() => subscribeHouseReleaseHome((nextHidden) => {
    update((draft) => {
      if (!nextHidden.length) delete draft.featured.hiddenHouseReleaseShareIds;
      else draft.featured.hiddenHouseReleaseShareIds = nextHidden;
    });
  }), [update]);

  const setVisible = async (shareId: string, visible: boolean) => {
    const prev = hidden;
    update((draft) => {
      const next = applyHouseReleaseHomeVisibility(draft.featured.hiddenHouseReleaseShareIds, shareId, visible);
      if (!next.length) delete draft.featured.hiddenHouseReleaseShareIds;
      else draft.featured.hiddenHouseReleaseShareIds = next;
    });
    setBusyId(shareId);
    try {
      const saved = await setHouseReleaseOnHome(shareId, visible);
      update((draft) => {
        if (!saved.length) delete draft.featured.hiddenHouseReleaseShareIds;
        else draft.featured.hiddenHouseReleaseShareIds = saved;
      });
    } catch (error) {
      update((draft) => {
        if (!prev.length) delete draft.featured.hiddenHouseReleaseShareIds;
        else draft.featured.hiddenHouseReleaseShareIds = prev;
      });
      toast({
        variant: 'destructive',
        title: 'Could not update Artist Home',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading linked House releases…
      </div>
    );
  }

  if (!releases.length) return null;

  return (
    <div className="space-y-2">
      <p className="pt-2 text-[10px] font-bold uppercase tracking-widest text-cyan-200/80">
        House releases on your page
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Same on/off as Release Catalog. On shows the drop on your public Artist Home; off hides it
        there. Members keep it in Library either way.
      </p>
      <ul className="space-y-2">
        {releases.map((release) => {
          const visible = isHouseReleaseVisibleOnHome(release.shareId, hidden);
          const href = release.type === 'album' ? `/share/${release.shareId}` : pressedSongHref(release.shareId);
          return (
            <li
              key={release.shareId}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5',
                visible ? 'border-cyan-500/25 bg-cyan-500/5' : 'border-white/5 bg-transparent opacity-70'
              )}
            >
              <Switch
                checked={visible}
                disabled={busyId === release.shareId}
                onCheckedChange={(checked) => void setVisible(release.shareId, checked === true)}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white/90">
                  <Gift className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  {release.title}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {visible ? 'On your page' : 'Hidden on page'}
                  {release.type === 'album'
                    ? ` · Album · ${release.trackCount || 0} tracks`
                    : ' · Single'}
                  {release.albumTitle ? ` · ${release.albumTitle}` : ''}
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-white/10 px-2 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:border-cyan-400/40 hover:text-white"
              >
                <ExternalLink className="h-3 w-3" /> Open
              </Link>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-white/10 px-2 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:border-cyan-400/40 hover:text-white"
                onClick={() =>
                  openFirstDropLathe({
                    shareId: release.shareId,
                    mode: release.type === 'album' ? 'album' : 'song',
                  })
                }
              >
                <Settings2 className="h-3 w-3" /> Update
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
