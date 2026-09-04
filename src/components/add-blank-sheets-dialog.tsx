'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
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

const UNASSIGNED_ALBUM_ID = 'unassigned';

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
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocusIndex = useRef<number | null>(null);
  const isLoose = albumId === UNASSIGNED_ALBUM_ID;

  const slots = remainingTrackSlots(albums, user);
  const finiteSlots = Number.isFinite(slots) ? slots : 40;
  const maxRows = Math.min(20, Math.max(1, finiteSlots));

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRefs.current[0]?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const index = pendingFocusIndex.current;
    if (index == null) return;
    pendingFocusIndex.current = null;
    inputRefs.current[index]?.focus();
  }, [names.length]);

  const addRow = () => {
    if (names.length >= maxRows) return;
    pendingFocusIndex.current = names.length;
    setNames((prev) => [...prev, '']);
  };

  const goToNextName = (index: number) => {
    if (index < names.length - 1) {
      inputRefs.current[index + 1]?.focus();
      return;
    }
    addRow();
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
        title:
          allowed === 1
            ? isLoose
              ? 'Blank loose sheet added'
              : 'Blank sheet added'
            : isLoose
              ? `${allowed} blank loose sheets added`
              : `${allowed} blank sheets added`,
        description:
          allowed < wanted.length
            ? `Visitor slots only allowed ${allowed}. Name the rest after you have room, or go Pro.`
            : isLoose
              ? 'They live in the vault as loose sheets until you open one or move them onto an album.'
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
      <DialogContent className="flex max-h-[min(90dvh,40rem)] w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-hidden bg-card border-2 sm:max-w-md">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="font-headline text-2xl">
            {isLoose ? 'Add blank loose sheets' : 'Add blank sheets'}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">
            {isLoose
              ? 'Drop empty lyric sheets in the vault. Name them now or leave untitled.'
              : 'Drop empty lyric sheets on this album. Name them now or leave untitled.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain studio-scrollbar py-1 pr-1">
          {names.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <Label className="w-6 shrink-0 font-code text-[10px] text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </Label>
              <Input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={name}
                onChange={(e) =>
                  setNames((prev) => prev.map((row, rowIndex) => (rowIndex === index ? e.target.value : row)))
                }
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  goToNextName(index);
                }}
                placeholder="Untitled Track"
                className="h-9 font-code font-bold"
                aria-label={`Sheet ${index + 1} name`}
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
        </div>
        <div className="shrink-0 space-y-3 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-bold uppercase"
            onClick={addRow}
            disabled={names.length >= maxRows}
          >
            <Plus className="h-3.5 w-3.5" /> Another sheet
          </Button>
          {Number.isFinite(slots) ? (
            <p className="text-[10px] font-code text-muted-foreground">
              Visitor accounts can keep {finiteSlots} more editable sheet{finiteSlots === 1 ? '' : 's'} right now.
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={createSheets} className="h-11 w-full font-bold uppercase">
              {isLoose ? 'Add to vault' : 'Add to album'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
