'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase/client/firebase';
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
  const [releases, setReleases] = useState<LinkedHouseRelease[]>([]);

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
    () => new Set(config.featured.hiddenHouseReleaseShareIds || []),
    [config.featured.hiddenHouseReleaseShareIds]
  );

  const setVisible = (shareId: string, visible: boolean) => {
    update((draft) => {
      const prev = [...(draft.featured.hiddenHouseReleaseShareIds || [])];
      const next = visible ? prev.filter((id) => id !== shareId) : [...new Set([...prev, shareId])];
      if (!next.length) delete draft.featured.hiddenHouseReleaseShareIds;
      else draft.featured.hiddenHouseReleaseShareIds = next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading linked House releases…
      </div>
    );
  }

  if (!releases.length) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        No House releases are linked to your profile yet. When AKAsheet links one to you, it will
        appear here — members still keep it in Library either way.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        House releases linked to your profile. Turning one off only hides it from your public Artist
        Home — it stays in every member&apos;s Library unless an admin removes it.
      </p>
      <ul className="space-y-2">
        {releases.map((release) => {
          const visible = isHouseReleaseVisibleOnHome(release.shareId, [...hidden]);
          return (
            <li
              key={release.shareId}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5',
                visible ? 'border-cyan-500/25 bg-cyan-500/5' : 'border-white/10 bg-black/20 opacity-80'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white/90">
                  <Gift className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  {release.title}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {release.type === 'album'
                    ? `Album · ${release.trackCount || 0} tracks`
                    : 'Single'}
                  {release.albumTitle ? ` · ${release.albumTitle}` : ''}
                  {!release.releaseLive ? ' · Library only' : ''}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-100/90">
                <span className="hidden sm:inline">{visible ? 'On home' : 'Hidden'}</span>
                <Switch checked={visible} onCheckedChange={(checked) => setVisible(release.shareId, checked)} />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
