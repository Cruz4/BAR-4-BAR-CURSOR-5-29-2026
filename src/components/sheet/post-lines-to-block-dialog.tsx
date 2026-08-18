'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader, Radio } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createPost } from '@/lib/profile/social-client';
import {
  LYRIC_CLIP_MAX_LINES,
  collectSectionLines,
  lyricClipCaption,
  sectionLineBounds,
  type LyricClip,
  type LyricClipBg,
  type LyricClipText,
} from '@/lib/profile/lyric-clip';
import { LyricClipCard } from '@/components/profile/lyric-clip-card';
import { cn } from '@/lib/utils';
import { useGamification } from '@/context/gamification-context';

const BG_OPTS: { id: LyricClipBg; label: string }[] = [
  { id: 'ink', label: 'Ink' },
  { id: 'alive', label: 'Alive' },
  { id: 'night', label: 'Night' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'neon', label: 'Neon' },
  { id: 'paper', label: 'Paper' },
];

const TEXT_OPTS: { id: LyricClipText; label: string }[] = [
  { id: 'white', label: 'White' },
  { id: 'gold', label: 'Gold' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'hand', label: 'Script' },
  { id: 'ink', label: 'Ink' },
];

type SheetSection = { id?: string; type?: string; bars?: { idx?: number; text?: string }[] };

export function PostLinesToBlockDialog({
  open,
  onOpenChange,
  section,
  startLine,
  trackTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: SheetSection;
  startLine: number;
  trackTitle?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { summary } = useGamification();
  const bounds = sectionLineBounds(section);
  const [from, setFrom] = useState(startLine);
  const [to, setTo] = useState(startLine);
  const [bg, setBg] = useState<LyricClipBg>('alive');
  const [textStyle, setTextStyle] = useState<LyricClipText>('white');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nextFrom = Math.min(Math.max(startLine, bounds.min), bounds.max);
    setFrom(nextFrom);
    setTo(Math.min(bounds.max, nextFrom + Math.min(12, LYRIC_CLIP_MAX_LINES) - 1));
    setBusy(false);
  }, [open, startLine, bounds.min, bounds.max]);

  const collected = useMemo(
    () => collectSectionLines(section, from, to),
    [section, from, to]
  );

  const clip: LyricClip = {
    from: collected.from,
    to: collected.to,
    lines: collected.lines,
    bg,
    text: textStyle,
    ...(section?.type ? { section: String(section.type) } : {}),
    ...(trackTitle?.trim() ? { title: trackTitle.trim() } : {}),
  };

  const hasWords = collected.lines.some((line) => line.trim());
  const tooLong = collected.truncated;

  const post = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sign in to post',
        description: 'The Block is for signed-in artists.',
      });
      return;
    }
    if (!hasWords || tooLong || busy) return;
    setBusy(true);
    try {
      await createPost({
        text: lyricClipCaption(clip),
        ownerName: user.displayName || 'Artist',
        ...(summary.profileSlug ? { ownerSlug: summary.profileSlug } : {}),
        lyricClip: clip,
      });
      toast({ title: 'Posted to The Block', description: 'On your wall and friends’ Scene.' });
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not post',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-emerald-500/25 bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl uppercase tracking-tight">
            Post to The Block
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Pick a line range from this section, style the card, then post. Nothing on the sheet changes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              From
            </Label>
            <Input
              type="number"
              min={bounds.min}
              max={bounds.max}
              value={from}
              onChange={(e) =>
                setFrom(
                  Math.min(bounds.max, Math.max(bounds.min, Number(e.target.value) || bounds.min))
                )
              }
              className="h-10 font-code"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              To
            </Label>
            <Input
              type="number"
              min={bounds.min}
              max={bounds.max}
              value={to}
              onChange={(e) =>
                setTo(
                  Math.min(bounds.max, Math.max(bounds.min, Number(e.target.value) || bounds.min))
                )
              }
              className="h-10 font-code"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Background
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {BG_OPTS.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant={bg === opt.id ? 'default' : 'outline'}
                className="h-8 px-2.5 text-[10px] font-bold uppercase"
                onClick={() => {
                  setBg(opt.id);
                  if (opt.id === 'paper') setTextStyle('ink');
                  else if (textStyle === 'ink') setTextStyle('white');
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Text
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {TEXT_OPTS.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant={textStyle === opt.id ? 'default' : 'outline'}
                className="h-8 px-2.5 text-[10px] font-bold uppercase"
                onClick={() => setTextStyle(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <LyricClipCard clip={clip} numbered={collected.numbered} />

        {tooLong ? (
          <p className="text-[11px] text-amber-300">
            Cap is {LYRIC_CLIP_MAX_LINES} lines — tighten the range.
          </p>
        ) : null}

        <Button
          type="button"
          className="h-11 w-full font-headline text-sm font-bold uppercase tracking-wide"
          disabled={busy || !hasWords || tooLong || !user}
          onClick={() => void post()}
        >
          {busy ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
          Post lines {String(clip.from).padStart(2, '0')}
          {clip.to !== clip.from ? `–${String(clip.to).padStart(2, '0')}` : ''}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Existing line-number gutter — hold or right-click. Same size/place as before. */
export function SheetLinePostGutter({
  label,
  className,
  style,
  disabled,
  onOpen,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  onOpen: () => void;
}) {
  const timerRef = useRef<number>(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    window.clearTimeout(timerRef.current);
    startRef.current = null;
  };

  return (
    <span
      className={cn(
        className,
        !disabled &&
          'select-none touch-manipulation cursor-pointer hover:text-emerald-300/80 [-webkit-touch-callout:none]'
      )}
      style={style}
      role={disabled ? undefined : 'button'}
      aria-label={disabled ? undefined : `Post line ${label} to The Block`}
      title={disabled ? undefined : 'Hold or right-click to post lines to The Block'}
      onContextMenu={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return;
        e.stopPropagation();
        startRef.current = { x: e.clientX, y: e.clientY };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        timerRef.current = window.setTimeout(() => {
          onOpen();
          startRef.current = null;
        }, 450);
      }}
      onPointerMove={(e) => {
        const start = startRef.current;
        if (!start) return;
        if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) clear();
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
    >
      {label}
    </span>
  );
}
