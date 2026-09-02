'use client';

import React, { useContext, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { DataContext } from '@/context/data-context';
import { buildBlankSheetTrack } from '@/lib/press-release-tracking';
import {
  FREE_TRACK_LIMIT_TOAST,
  remainingTrackSlots,
  FreeTrackLimitError,
  countUserTracks,
} from '@/lib/subscription';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { trackUpgradeClick } from '@/lib/conversion-analytics';

export function AddBlankSheetsDialog({
  open,
  onOpenChange,
  albumId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumId: string;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { addTrack, albums } = useContext(DataContext);
  const [names, setNames] = useState<string[]>(['']);

  const slots = remainingTrackSlots(albums, user);
  const finiteSlots = Number.isFinite(slots) ? slots : 40;

  const addRow = () => {
    if (names.length >= Math.min(20, Math.max(1, finiteSlots))) return;
    setNames((prev) => [...prev, '']);
  };

  const createSheets = () => {
    if (!user) return;
    const titles = names.map((name) => name.trim()).filter(Boolean);
    const wanted = titles.length > 0 ? titles : ['Untitled Track'];
    const allowed = Number.isFinite(slots) ? Math.min(wanted.length, slots) : wanted.length;
    if (allowed <= 0) {
      trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, {
        limitType: 'track',
        count: countUserTracks(albums),
      });
      trackUpgradeClick('slot_limit', { limitType: 'track', count: countUserTracks(albums) });
      toast(FREE_TRACK_LIMIT_TOAST);
      return;
    }
    try {
      wanted.slice(0, allowed).forEach((title, index) => {
        addTrack(albumId, {
          ...buildBlankSheetTrack(albumId, user.id, title),
          id: `track-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        });
      });
      toast({
        title: allowed === 1 ? 'Blank sheet added' : `${allowed} blank sheets added`,
        description:
          allowed < wanted.length
            ? `Visitor slots only allowed ${allowed}. Name the rest after you have room, or go Pro.`
            : 'Name them here anytime — they stay on this album until you open a sheet.',
      });
      setNames(['']);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof FreeTrackLimitError) {
        toast(FREE_TRACK_LIMIT_TOAST);
      } else {
        toast({
          variant: 'destructive',
          title: 'Could not add sheets',
          description: error instanceof Error ? error.message : undefined,
        });
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNames(['']);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md bg-card border-2">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Add blank sheets</DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">
            Drop empty lyric sheets on this album. Name them now or leave untitled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {names.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <Label className="w-6 shrink-0 font-code text-[10px] text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </Label>
              <Input
                value={name}
                onChange={(e) =>
                  setNames((prev) => prev.map((row, rowIndex) => (rowIndex === index ? e.target.value : row)))
                }
                placeholder="Untitled Track"
                className="h-9 font-code font-bold"
              />
              {names.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-400"
                  onClick={() => setNames((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                  aria-label="Remove row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-bold uppercase"
            onClick={addRow}
            disabled={names.length >= Math.min(20, Math.max(1, finiteSlots))}
          >
            <Plus className="h-3.5 w-3.5" /> Another sheet
          </Button>
          {Number.isFinite(slots) ? (
            <p className="text-[10px] font-code text-muted-foreground">
              Visitor accounts can keep {finiteSlots} more editable sheet{finiteSlots === 1 ? '' : 's'} right now.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" onClick={createSheets} className="h-11 w-full font-bold uppercase">
            Add to album
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
