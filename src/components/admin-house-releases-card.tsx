'use client';

import { useEffect, useState } from 'react';
import { Gift, Loader, Music, Pencil, Plus, Radio, Trash2, Unlink } from 'lucide-react';
import { adminApiFetch } from '@/lib/admin-client';
import { pingHouseRelease } from '@/lib/release-management-client';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { HouseReleaseAdminRow } from '@/lib/admin-house-releases';

export function AdminHouseReleasesCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [items, setItems] = useState<HouseReleaseAdminRow[]>([]);

  const load = async () => {
    const res = await adminApiFetch('/api/admin/house-releases');
    const data = (await res.json()) as { items?: HouseReleaseAdminRow[]; error?: string };
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setItems(data.items || []);
  };

  useEffect(() => {
    load()
      .catch((err) => {
        console.warn('[admin house releases]', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const runAction = async (shareId: string, action: 'revoke' | 'remove') => {
    setBusyId(`${action}:${shareId}`);
    try {
      const res = await adminApiFetch('/api/admin/house-releases', {
        method: 'POST',
        body: JSON.stringify({ shareId, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await load();
      toast({
        title: action === 'revoke' ? 'Removed from Libraries' : 'House release removed',
        description:
          action === 'revoke'
            ? 'Members will stop seeing this in Library on the next load. Audio files stay in the vault.'
            : 'Unlisted and cleared from Libraries. Featured-track links for this share were cleaned up.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not update House release',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const ping = async (shareId: string) => {
    setBusyId(`ping:${shareId}`);
    try {
      const result = await pingHouseRelease(shareId);
      await load();
      toast({
        title: result.refreshed ? 'Library ping refreshed' : 'Library ping sent',
        description: result.refreshed
          ? 'Members who already saw it get +1 on Activity. Anyone still waiting does not get stacked.'
          : 'Members get a New in Library notice and Activity alert.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not ping Library',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="bg-card border-2 border-cyan-500/25 shadow-2xl">
      <CardHeader className="border-b border-cyan-500/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2">
              <Gift className="h-6 w-6 text-cyan-400" />
              House releases
            </CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Catalog of albums and songs given free to every member Library. Taking a drop offline
              does not remove it from Libraries — use Remove from Libraries or Remove completely here.
              This is separate from House bar of the day (the Scene lyric pin).
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => openFirstDropLathe()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add another
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading House catalog…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No House releases yet. Open the Lathe, publish, and toggle House · Free for everyone.
          </p>
        ) : (
          items.map((item) => {
            const owns = user?.id === item.ownerId;
            return (
              <div
                key={item.shareId}
                className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-headline text-sm font-bold uppercase">{item.title}</p>
                    <p className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.ownerName} · {item.scope === 'album' ? `Album · ${item.trackCount} tracks` : 'Single'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={item.live ? 'border-cyan-400/40 text-cyan-200' : 'text-muted-foreground'}>
                      {item.live ? 'Live' : 'Library only'}
                    </Badge>
                    {item.houseLibraryNotice ? (
                      <Badge variant="outline" className="border-amber-400/40 text-amber-200">Notice on</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {owns ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-[10px] font-bold uppercase"
                      onClick={() =>
                        openFirstDropLathe({
                          albumId: item.albumId,
                          trackId: item.trackId,
                          mode: item.scope === 'album' ? 'album' : 'song',
                        })
                      }
                    >
                      <Pencil className="h-3 w-3" />
                      Edit / replace
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-[10px] font-bold uppercase"
                    disabled={busyId === `ping:${item.shareId}` || !item.live}
                    onClick={() => void ping(item.shareId)}
                  >
                    {busyId === `ping:${item.shareId}` ? <Loader className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
                    Ping Library
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-[10px] font-bold uppercase"
                    disabled={busyId === `revoke:${item.shareId}`}
                    onClick={() => void runAction(item.shareId, 'revoke')}
                  >
                    {busyId === `revoke:${item.shareId}` ? <Loader className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                    Remove from Libraries
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-[10px] font-bold uppercase text-rose-300"
                    disabled={busyId === `remove:${item.shareId}`}
                    onClick={() => void runAction(item.shareId, 'remove')}
                  >
                    {busyId === `remove:${item.shareId}` ? <Loader className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Remove completely
                  </Button>
                </div>
              </div>
            );
          })
        )}
        <p className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
          <Music className="h-3 w-3" />
          Replace audio or add a track in the Lathe, then publish again as House.
        </p>
      </CardContent>
    </Card>
  );
}
