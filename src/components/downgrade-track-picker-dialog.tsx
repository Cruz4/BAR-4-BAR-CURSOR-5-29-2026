'use client';

import React, { useMemo, useState } from 'react';
import { CassetteTape, Lock, Music } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Album, Track } from '@/lib/types';
import { FREE_TRACK_LIMIT } from '@/lib/subscription';
import { getAllVaultTracks } from '@/lib/tier-limits';
import { saveFreeEditableTrackSelection } from '@/lib/free-editable-tracks';
import { useToast } from '@/hooks/use-toast';

function trackLocationLabel(track: Track, albums: Album[]): string {
  if (track.albumId === 'unassigned') return 'Loose track';
  const album = albums.find((a) => a.id === track.albumId);
  return album ? `Album · ${album.title}` : 'Album track';
}

export function DowngradeTrackPickerDialog({
  open,
  albums,
  userId,
  onComplete,
}: {
  open: boolean;
  albums: Album[];
  userId: string;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const allTracks = useMemo(
    () =>
      [...getAllVaultTracks(albums)].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [albums]
  );

  const toggle = (trackId: string) => {
    setSelected((prev) => {
      if (prev.includes(trackId)) return prev.filter((id) => id !== trackId);
      if (prev.length >= FREE_TRACK_LIMIT) return prev;
      return [...prev, trackId];
    });
  };

  const handleConfirm = async () => {
    if (selected.length !== FREE_TRACK_LIMIT) return;
    setSaving(true);
    try {
      await saveFreeEditableTrackSelection(userId, selected);
      toast({
        title: 'Editable tracks set',
        description: `You can edit ${FREE_TRACK_LIMIT} tracks at a time. Scrap one to rotate another in.`,
      });
      onComplete();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not save selection',
        description: 'Check your connection and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="bg-card border-2 border-pink-500/30 max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl uppercase tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6 text-pink-400" />
            Pick {FREE_TRACK_LIMIT} tracks to edit
          </DialogTitle>
          <DialogDescription className="text-sm font-code leading-relaxed">
            Your Pro plan ended — nothing was deleted. Choose {FREE_TRACK_LIMIT} tracks to keep editable on
            Visitor. Everything else stays view-only. You can change the lineup anytime by scrapping an
            editable track; the next oldest locked track rotates in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[min(50vh,320px)] overflow-y-auto pr-1">
          {allTracks.map((track) => {
            const isSelected = selected.includes(track.id);
            const atCap = selected.length >= FREE_TRACK_LIMIT && !isSelected;
            return (
              <button
                key={track.id}
                type="button"
                disabled={atCap}
                onClick={() => toggle(track.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                  isSelected
                    ? 'border-sky-500/60 bg-sky-500/10'
                    : atCap
                      ? 'border-white/5 bg-black/20 opacity-50 cursor-not-allowed'
                      : 'border-white/10 bg-black/30 hover:border-sky-500/30'
                )}
              >
                <div
                  className={cn(
                    'h-5 w-5 rounded-md border-2 shrink-0 flex items-center justify-center',
                    isSelected ? 'border-sky-400 bg-sky-500/30' : 'border-white/20'
                  )}
                >
                  {isSelected && <span className="text-sky-300 text-xs font-bold">✓</span>}
                </div>
                <div className="p-1.5 rounded-lg bg-white/5 shrink-0">
                  {track.albumId === 'unassigned' ? (
                    <CassetteTape className="h-4 w-4 text-sky-400" />
                  ) : (
                    <Music className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-sm uppercase text-white truncate">{track.title}</p>
                  <p className="text-[9px] font-code text-muted-foreground uppercase">
                    {trackLocationLabel(track, albums)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="outline" className="font-mono text-sky-400 border-sky-500/30">
            {selected.length}/{FREE_TRACK_LIMIT} selected
          </Badge>
          <p className="text-[9px] font-code text-muted-foreground text-right">
            Go Pro anytime for unlimited editing + export
          </p>
        </div>

        <DialogFooter>
          <Button
            className="w-full font-bold uppercase"
            disabled={selected.length !== FREE_TRACK_LIMIT || saving}
            onClick={handleConfirm}
          >
            {saving ? 'Saving…' : `Keep these ${FREE_TRACK_LIMIT} editable`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
