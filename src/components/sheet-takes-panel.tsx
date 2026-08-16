'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronsUpDown, Mic, Square, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { studioAccentPanel, studioPanelCaption } from '@/lib/studio-panel-styles';
import { formatVoiceTime, uploadVoiceClip, deleteVoiceStorage } from '@/lib/profile/voice-notes';
import {
  SHEET_TAKE_MAX_BYTES,
  SHEET_TAKE_MAX_COUNT,
  SHEET_TAKE_MAX_SECONDS,
  createSheetTakeId,
  nextSheetTakeLabel,
  parseSheetTakes,
  sheetTakeStoragePath,
  type SheetTake,
} from '@/lib/sheet-takes';

type SheetTakesPanelProps = {
  takes: SheetTake[] | undefined;
  trackId: string;
  userId?: string;
  disabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChange: (takes: SheetTake[]) => void;
};

export function SheetTakesPanel({
  takes: rawTakes,
  trackId,
  userId,
  disabled = false,
  isOpen: controlledOpen,
  onOpenChange,
  onChange,
}: SheetTakesPanelProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const takes = parseSheetTakes(rawTakes);
  const recorder = useVoiceRecorder({ maxSeconds: SHEET_TAKE_MAX_SECONDS, transcribe: false });
  const slotsLeft = Math.max(0, SHEET_TAKE_MAX_COUNT - takes.length);
  const canRecord = Boolean(userId) && !disabled && slotsLeft > 0 && recorder.supported;
  const remaining = Math.max(0, SHEET_TAKE_MAX_SECONDS - recorder.elapsedMs / 1000);

  const saveTake = async () => {
    if (!userId || !recorder.clip || takes.length >= SHEET_TAKE_MAX_COUNT) return;
    setSaving(true);
    const takeId = createSheetTakeId();
    try {
      const note = await uploadVoiceClip({
        storagePath: sheetTakeStoragePath(userId, trackId, takeId, recorder.clip.contentType),
        clip: recorder.clip,
        maxSeconds: SHEET_TAKE_MAX_SECONDS,
        maxBytes: SHEET_TAKE_MAX_BYTES,
      });
      const next: SheetTake = {
        ...note,
        id: takeId,
        createdAt: new Date().toISOString(),
        label: nextSheetTakeLabel(takes),
      };
      onChange([...takes, next]);
      recorder.discard();
      toast({ title: `${next.label} saved` });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save take',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const removeTake = async (take: SheetTake) => {
    onChange(takes.filter((t) => t.id !== take.id));
    await deleteVoiceStorage(take.storagePath);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-studio-panel className={studioAccentPanel('sky')}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <CardTitle className="font-headline flex items-center gap-2 text-lg uppercase tracking-widest text-sky-800 dark:text-sky-300/95">
                  <Mic className="h-5 w-5" /> Takes
                  {takes.length > 0 ? (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-sky-800 dark:text-sky-200">
                      {takes.length}/{SHEET_TAKE_MAX_COUNT}
                    </span>
                  ) : null}
                </CardTitle>
                <p
                  data-studio-caption
                  className={cn(
                    studioPanelCaption,
                    isOpen ? 'text-[10px] leading-snug break-words' : 'text-[9px] leading-none truncate'
                  )}
                  title="Record reference vocals for this track"
                >
                  {isOpen ? 'Up to 3 recordings · 5 min each' : 'Vocal memos for this track'}
                </p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 p-4 pt-0 md:p-6 md:pt-0">
            {takes.map((take) => (
              <div key={take.id} className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/90">
                      {take.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatVoiceTime(take.durationSec)}
                      {take.createdAt
                        ? ` · ${formatDistanceToNow(new Date(take.createdAt), { addSuffix: true })}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={disabled || saving}
                    onClick={() => void removeTake(take)}
                    aria-label={`Delete ${take.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <VoiceNotePlayer
                  src={take.url}
                  durationSec={take.durationSec}
                  compact
                  variant="studio"
                  showTranscriptToggle={false}
                />
              </div>
            ))}

            {!userId ? (
              <p className="text-xs text-muted-foreground">Sign in to save vocal takes on this track.</p>
            ) : !recorder.supported ? (
              <p className="text-xs text-muted-foreground">This browser can’t record audio.</p>
            ) : slotsLeft <= 0 ? (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Three takes saved — delete one to record again.
              </p>
            ) : recorder.status === 'recording' ? (
              <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2">
                <button
                  type="button"
                  onClick={() => recorder.stop()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
                  aria-label="Stop recording"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-400" />
                <span className="font-code text-[11px] tabular-nums text-sky-900 dark:text-sky-100">
                  {formatVoiceTime(recorder.elapsedMs / 1000)} · {formatVoiceTime(remaining)} left
                </span>
              </div>
            ) : recorder.clip ? (
              <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Preview — not saved yet
                </p>
                <VoiceNotePlayer
                  src={recorder.clip.objectUrl}
                  durationSec={recorder.clip.durationSec}
                  compact
                  variant="studio"
                  showTranscriptToggle={false}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[10px] font-bold uppercase tracking-widest"
                    disabled={saving}
                    onClick={() => recorder.discard()}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 font-bold uppercase"
                    disabled={saving || disabled}
                    onClick={() => void saveTake()}
                  >
                    Save take
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full gap-2 border-sky-500/30 bg-background/40 text-[11px] font-bold uppercase tracking-widest text-sky-800 hover:bg-sky-500/10 dark:text-sky-200"
                disabled={!canRecord || saving}
                onClick={() => void recorder.start()}
              >
                <Mic className="h-3.5 w-3.5" /> Record take
              </Button>
            )}

            {recorder.error ? <p className="text-[11px] text-destructive">{recorder.error}</p> : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
