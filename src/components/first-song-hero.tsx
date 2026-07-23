'use client';

/**
 * "Start your first song" hero — shown in the vault when it's empty.
 * Gets a new artist from signup to a lyrics sheet in one or two clicks:
 *   Start blank -> auto-creates a loose track and opens the editor.
 *   Guide me    -> two quick questions (vibe + topic), then the editor.
 * If landing-demo bars are stashed, auto-creates "My Demo Track" and opens it.
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotebookPen, Compass, ArrowRight, ArrowLeft, Mic2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { DataContext } from '@/context/data-context';
import { markFirstSessionGuidedPending } from '@/lib/first-session';
import {
  claimDemoHandoff,
  completeDemoHandoff,
  releaseDemoHandoff,
} from '@/lib/demo-session';
import {
  claimGuestTrackHandoff,
  completeGuestTrackHandoff,
  releaseGuestTrackHandoff,
} from '@/lib/guest-track-session';
import type { Track } from '@/lib/types';

const GENRE_PRESETS: Array<{ genre: string; tempoBPM: number }> = [
  { genre: 'Trap', tempoBPM: 140 },
  { genre: 'Boom Bap', tempoBPM: 90 },
  { genre: 'R&B', tempoBPM: 75 },
  { genre: 'Drill', tempoBPM: 142 },
  { genre: 'Lofi-Hop', tempoBPM: 85 },
  { genre: 'Pop', tempoBPM: 100 },
];

export function FirstSongHero() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addTrack, loading: vaultLoading } = useContext(DataContext);

  const [step, setStep] = useState<'choice' | 'guide'>('choice');
  const [genre, setGenre] = useState(GENRE_PRESETS[0]);
  const [topic, setTopic] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [demoLines, setDemoLines] = useState<string[]>([]);
  const [autoOpeningDemo, setAutoOpeningDemo] = useState(false);
  const creatingRef = useRef(false);

  const createFirstTrack = useCallback(
    (options: { guided: boolean; fromDemo?: boolean; lines?: string[]; claimed?: boolean }) => {
      if (!user || creatingRef.current) return;
      creatingRef.current = true;
      setIsCreating(true);
      try {
        const vibe = options.guided
          ? { genre: genre.genre, tempoBPM: genre.tempoBPM, feeling: ['first session'] }
          : { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'] };

        const carried = options.lines ?? demoLines;
        const title = options.fromDemo ? 'My Demo Track' : 'My First Song';

        const initialBars =
          options.fromDemo && carried.length > 0
            ? carried.map((text, i) => ({ idx: i + 1, text, accepted: true, syllables: 0, rhymeKey: '?' }))
            : [{ idx: 1, text: '', accepted: true, syllables: 0, rhymeKey: '?' }];

        const newTrack: Omit<Track, 'id'> = {
          albumId: 'unassigned',
          ownerId: user.id,
          title,
          vibe,
          intentRefs: [],
          sections: [
            {
              id: `section-${Date.now()}`,
              type: 'verse',
              bars: initialBars,
            },
          ],
          status: 'in_progress',
          createdAt: new Date().toISOString(),
          direction: { enabled: false, inheritFromAlbum: false },
          ...(options.guided && topic.trim() ? { specialInstructions: topic.trim() } : {}),
        };
        const created = addTrack('unassigned', newTrack);
        if (options.claimed || options.fromDemo) {
          completeDemoHandoff();
          completeGuestTrackHandoff();
        }
        if (options.guided) {
          markFirstSessionGuidedPending({
            topic: topic.trim(),
            genre: genre.genre,
          });
        }
        router.push(`/albums/unassigned/tracks/${created.id}`);
      } catch (e) {
        creatingRef.current = false;
        setIsCreating(false);
        setAutoOpeningDemo(false);
        if (options.claimed && (options.lines?.length || 0) > 0) {
          releaseDemoHandoff(options.lines!);
          releaseGuestTrackHandoff(options.lines!);
        }
        toast({ variant: 'destructive', title: 'Could not start your song', description: (e as Error).message });
      }
    },
    [user, genre, demoLines, topic, addTrack, router, toast]
  );

  useEffect(() => {
    if (!user || vaultLoading || autoOpeningDemo || creatingRef.current) return;
    const claimed = claimGuestTrackHandoff() ?? claimDemoHandoff();
    if (!claimed) return;
    setDemoLines(claimed);
    setAutoOpeningDemo(true);
    createFirstTrack({ guided: false, fromDemo: true, lines: claimed, claimed: true });
  }, [user, vaultLoading, autoOpeningDemo, createFirstTrack]);

  if (autoOpeningDemo) {
    return (
      <Card className="relative overflow-hidden border-emerald-500/30 bg-card/95 p-6 sm:p-8 mb-10 animate-in fade-in duration-500">
        <div className="relative flex flex-col items-center text-center gap-3 py-4">
          <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">Your demo bars made it</p>
          <h2 className="text-xl sm:text-2xl font-headline font-bold uppercase tracking-tight text-foreground">
            Opening your track…
          </h2>
          <p className="text-xs font-code text-muted-foreground max-w-md">
            {demoLines[0]
              ? `“${demoLines[0]}”${demoLines.length > 1 ? ` +${demoLines.length - 1} more` : ''} — straight onto your sheet.`
              : 'Putting your landing demo onto the sheet so you can keep writing.'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-primary/25 bg-card/95 p-6 sm:p-8 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-violet-500/[0.04] pointer-events-none" />

      {step === 'choice' ? (
        <div className="relative space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary flex items-center justify-center sm:justify-start gap-2">
              <Mic2 className="h-3.5 w-3.5" /> Your studio is open
            </p>
            <h2 className="text-2xl sm:text-3xl font-headline font-bold uppercase tracking-tight text-foreground">
              Start your first song
            </h2>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto sm:mx-0">
              Write a line, and the AI writes the next one to match your rhyme. No setup needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <Button
              variant="outline"
              disabled={isCreating}
              className="min-h-[8rem] h-auto w-full whitespace-normal flex flex-col items-center justify-center gap-2.5 p-5 text-center border-border hover:border-primary/40"
              onClick={() => createFirstTrack({ guided: false })}
            >
              <NotebookPen className="h-7 w-7 text-muted-foreground shrink-0" />
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-widest text-xs">Start blank</p>
                <p className="text-[10px] font-code text-muted-foreground leading-snug normal-case tracking-normal">
                  Straight to the sheet — write or paste your first line.
                </p>
              </div>
            </Button>
            <Button
              disabled={isCreating}
              className="min-h-[8rem] h-auto w-full whitespace-normal flex flex-col items-center justify-center gap-2.5 p-5 text-center bg-primary/10 border border-primary/25 text-foreground hover:bg-primary/15"
              onClick={() => setStep('guide')}
            >
              <Compass className="h-7 w-7 text-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-widest text-xs">Guide me</p>
                <p className="text-[10px] font-code text-muted-foreground leading-snug normal-case tracking-normal">
                  Quick vibe + topic, then a 4-step walkthrough to your first AI bar.
                </p>
              </div>
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative space-y-5 max-w-2xl">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-headline font-bold uppercase tracking-tight text-foreground">
              Set the vibe
            </h2>
            <p className="text-xs text-muted-foreground">Only two questions — you can change everything later.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              1 · What are you making?
            </Label>
            <div className="flex flex-wrap gap-2">
              {GENRE_PRESETS.map((g) => (
                <button
                  key={g.genre}
                  type="button"
                  onClick={() => setGenre(g)}
                  className={cn(
                    'px-3.5 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wide transition-colors',
                    genre.genre === g.genre
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {g.genre}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-song-topic" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              2 · What&apos;s it about? <span className="normal-case font-normal tracking-normal">(optional)</span>
            </Label>
            <Input
              id="first-song-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFirstTrack({ guided: true });
              }}
              placeholder="e.g. proving everyone wrong, late nights, my city..."
              className="font-code text-sm"
              maxLength={120}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="ghost"
              className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground"
              onClick={() => setStep('choice')}
              disabled={isCreating}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
            </Button>
            <Button
              className="font-bold uppercase text-[10px] tracking-widest px-6"
              onClick={() => createFirstTrack({ guided: true })}
              disabled={isCreating}
            >
              {isCreating ? 'Opening your sheet...' : 'Open guided sheet'} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
