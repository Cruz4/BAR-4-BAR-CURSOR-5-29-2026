'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HighlightedText } from '@/components/highlighted-text';
import { dnaDropSharePath } from '@/lib/dna-drop-access';
import type { Track } from '@/lib/types';
import { Clock } from 'lucide-react';

type DnaDropLyricSheetProps = {
  title: string;
  sections: Track['sections'] | undefined;
  rhymeGroups: { words: string[] }[];
  updatedLabel: string;
  albumShareId?: string;
  albumTitle?: string;
};

export function DnaDropLyricSheet({
  title,
  sections,
  rhymeGroups,
  updatedLabel,
  albumShareId,
  albumTitle,
}: DnaDropLyricSheetProps) {
  const bars = (sections ?? []).reduce(
    (n, sec) => n + (sec.bars?.filter((bar) => bar.text?.trim()).length ?? 0),
    0
  );

  return (
    <Card className="border-2 border-cyan-400/25 shadow-[0_0_80px_-24px_rgba(34,211,238,0.55)] relative overflow-hidden bg-notebook min-h-[60vh] md:min-h-[80vh] [--lyrics-gutter:2.75rem] md:[--lyrics-gutter:100px] [--lyrics-lh:20px] md:[--lyrics-lh:32px]">
      <style>{`
        .bg-notebook {
          background-image:
            linear-gradient(90deg, transparent var(--lyrics-gutter), #22d3ee22 var(--lyrics-gutter), #22d3ee22 calc(var(--lyrics-gutter) + 1px), transparent calc(var(--lyrics-gutter) + 1px)),
            repeating-linear-gradient(transparent, transparent calc(var(--lyrics-lh) - 1px), #d946ef08 calc(var(--lyrics-lh) - 1px), #d946ef08 var(--lyrics-lh));
          background-size: 100% var(--lyrics-lh);
          background-attachment: local;
        }
      `}</style>
      <CardHeader className="bg-card/80 border-b border-cyan-400/15 relative z-10 px-4 py-4 sm:px-8 sm:py-6 md:p-12 md:py-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-cyan-400/40 text-cyan-300">
            Song Lyrics DNA Drop
          </Badge>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase font-bold">
            <Clock className="h-3 w-3" /> {updatedLabel}
          </div>
          <span className="text-[9px] uppercase tracking-widest text-fuchsia-300/80">
            {bars} bar{bars === 1 ? '' : 's'} frozen
          </span>
        </div>
        <h3 className="font-headline text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground">
          {title}
        </h3>
        {albumShareId ? (
          <Link
            href={dnaDropSharePath(albumShareId)}
            className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 hover:text-cyan-200"
          >
            {albumTitle ? `All strands in ${albumTitle}` : 'Back to snapshot sequence'}
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="p-0 relative z-10">
        <div className="px-3 py-6 sm:px-6 sm:py-8 md:p-12 space-y-8 md:space-y-12">
          {(sections ?? []).length === 0 ? (
            <p className="pl-[calc(var(--lyrics-gutter)+0.5rem)] text-sm text-muted-foreground italic">
              No lyrics were frozen in this strand.
            </p>
          ) : (
            (sections ?? []).map((sec) => (
              <div key={sec.id} className="space-y-0">
                <h4 className="text-base sm:text-xl md:text-2xl font-headline font-bold text-cyan-300 uppercase mb-2 md:mb-4 pl-[calc(var(--lyrics-gutter)+0.5rem)]">
                  {sec.type}
                </h4>
                {sec.bars.map((bar) => (
                  <div
                    key={bar.idx}
                    className="relative flex items-start min-h-[var(--lyrics-lh)] pl-[calc(var(--lyrics-gutter)+0.5rem)] pr-2"
                  >
                    <span className="absolute left-0 w-[var(--lyrics-gutter)] pr-1.5 text-right font-mono text-[10px] md:text-sm text-cyan-500/40 leading-[var(--lyrics-lh)] font-bold tabular-nums">
                      {String(bar.idx).padStart(2, '0')}
                    </span>
                    <p className="text-[14px] md:text-xl lg:text-2xl font-code font-bold leading-[var(--lyrics-lh)] tracking-tight text-foreground/90 break-words whitespace-pre-wrap min-w-0 w-full">
                      {bar.text ? <HighlightedText text={bar.text} rhymeGroups={rhymeGroups} /> : '...'}
                    </p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
