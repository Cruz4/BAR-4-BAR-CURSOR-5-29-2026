'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useMarketingGifStep } from '@/hooks/use-marketing-gif-step';
import {
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  Check,
  Info,
  NotebookPen,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HighlightedText } from '@/components/highlighted-text';
import { cn } from '@/lib/utils';
import {
  MARKETING_CO_WRITER_OPTIONS,
  MARKETING_CO_WRITER_SLOTTED_LINE,
  MARKETING_EMPTY_BAR_HINT,
  MARKETING_PRIMARY_TRACK,
} from '@/lib/marketing-demo-data';

export const GIF_STEP_MS = 2600;
export const GIF_DNA_REMIX_STEPS = 5;
export const GIF_CO_WRITER_STEPS = 5;
export const GIF_CO_WRITER_STEP_MS = 1800;

function GifChrome({ children, step }: { children: React.ReactNode; step: number }) {
  return (
    <div
      className="w-[1320px] bg-[#05080f] text-foreground px-6 py-8"
      data-marketing-capture-ready="true"
      data-marketing-gif-ready="true"
      data-marketing-gif-step={step}
    >
      <div
        data-marketing-ui-crop
        className="rounded-2xl border border-white/10 bg-[#0a1018] shadow-2xl flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}

const SEED_LYRICS =
  'The mist rolls in like a ghost from the shore\nMy skin is timber, my heart is solid stone';

const STRAINS = [
  { label: 'Longevity', detail: 'Centuries of stillness' },
  { label: 'Timber', detail: 'Organic resilience' },
  { label: 'Mist', detail: 'Atmospheric veil' },
  { label: 'Stone', detail: 'Geological permanence' },
];

const DNA_FLOW_TABS = ['Rough Notes', 'Decoded Strains', 'Paths', 'Draft'] as const;

function dnaFlowActiveTab(step: number) {
  if (step <= 1) return 0;
  if (step === 2) return 1;
  if (step === 3) return 2;
  return 3;
}

/** DNA & REMIX — sequential paste → decode → path → draft */
function GifDnaRemixSceneInner() {
  const step = useMarketingGifStep(GIF_DNA_REMIX_STEPS, GIF_STEP_MS);
  const activeTab = dnaFlowActiveTab(step);

  return (
    <GifChrome step={step}>
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-sky-400" />
          <span className="text-sm font-bold uppercase tracking-widest text-sky-400">Generation Workstation</span>
        </div>
        <Badge variant="outline" className="text-xs uppercase border-violet-500/40 text-violet-200 px-3">DNA & REMIX</Badge>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-headline font-bold uppercase text-primary flex items-center gap-2">
            <NotebookPen className="h-6 w-6" /> Seed DNA & REMIX
          </h3>
          <div className="flex gap-2 shrink-0">
            {DNA_FLOW_TABS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  'text-xs font-bold uppercase px-3 py-1 rounded-full border transition-colors',
                  i < activeTab && 'border-primary/30 bg-primary/10 text-primary/70',
                  i === activeTab && 'bg-primary/20 border-primary/50 text-primary',
                  i > activeTab && 'border-white/10 text-muted-foreground'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {step <= 2 && (
          <div className="grid grid-cols-2 gap-0 rounded-xl border-2 border-primary/25 overflow-hidden">
            <div className="p-5 pb-6 font-code text-lg leading-relaxed bg-background/40 flex flex-col min-h-[300px]">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-3 tracking-widest">Seed lyrics</p>
              {step === 0 ? (
                <p className="italic text-muted-foreground/70 text-base">Paste rough lyrics or notes to extract strains…</p>
              ) : (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre-wrap text-foreground">
                  {SEED_LYRICS}
                </motion.p>
              )}
              {step >= 1 && (
                <Button className="mt-auto w-fit text-xs font-bold uppercase h-10 px-5 mb-1 gap-2" disabled>
                  {step === 1 ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Decoding strains…
                    </>
                  ) : (
                    'Analyzed'
                  )}
                </Button>
              )}
            </div>

            <div className="border-l border-primary/20 bg-violet-500/5 p-5 pb-6 flex flex-col min-h-[300px]">
              <p className="text-xs uppercase font-bold text-violet-300 mb-3 tracking-widest">Strain panel</p>
              {step < 2 ? (
                <p className="text-base text-muted-foreground font-code">
                  {step === 1 ? 'Mapping motifs from your rough notes…' : 'Strains appear after you paste seed lyrics.'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {STRAINS.map((strain, i) => (
                    <motion.div
                      key={strain.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={cn(
                        'rounded-lg border px-3 py-2.5',
                        i < 2 ? 'border-violet-400/50 bg-violet-500/15' : 'border-violet-500/25 bg-black/30'
                      )}
                    >
                      <p className="text-sm font-bold text-violet-100">{strain.label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{strain.detail}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-2">
            <p className="text-sm font-bold uppercase text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Choose remix path
            </p>
            <div className="grid grid-cols-2 gap-3">
              {['Remix toward hope', 'Remix toward tension'].map((path, i) => (
                <Card key={path} className={cn('p-5 border-white/10', i === 0 && 'border-primary/40 bg-primary/10')}>
                  <p className="text-lg font-code">{path}</p>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
            <Card className="border-emerald-500/35 bg-emerald-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl uppercase font-headline text-emerald-400">Draft ready</CardTitle>
              </CardHeader>
              <CardContent className="font-code text-lg leading-relaxed text-foreground/90 pb-6">
                The riverbed is dry, the granite starts to sing — roots dig deeper while the canopy learns to breathe.
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </GifChrome>
  );
}

export function GifDnaRemixScene() {
  return (
    <Suspense fallback={null}>
      <GifDnaRemixSceneInner />
    </Suspense>
  );
}

function CoWriterOptionCard({
  index,
  line,
  syllables,
  selected,
}: {
  index: number;
  line: string;
  syllables: number;
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex-1 rounded-xl border-2 bg-primary/10 p-4 flex gap-4 min-h-[88px] items-stretch',
        selected ? 'border-primary/70 bg-primary/20 shadow-[0_0_24px_rgba(59,130,246,0.15)]' : 'border-primary/35'
      )}
    >
      <div className="shrink-0 flex flex-col items-center justify-center gap-2.5 border-r border-white/10 pr-4 min-w-[4.75rem]">
        <Badge className="bg-primary text-[10px] uppercase px-3 py-0.5 tracking-wide">Opt {index + 1}</Badge>
        <span className="text-[10px] text-muted-foreground/90 font-mono tracking-widest">{syllables} SYLL</span>
      </div>
      <span className="text-[16px] leading-snug font-code self-center">{line}</span>
    </div>
  );
}

/** Bar Workstation — empty bar 4 → generate → pick → visibly new line */
function GifCoWriterSceneInner() {
  const step = useMarketingGifStep(GIF_CO_WRITER_STEPS, GIF_CO_WRITER_STEP_MS);
  const track = MARKETING_PRIMARY_TRACK;
  const filledBars = track.sections?.[1]?.bars?.slice(0, 3) ?? [];
  const isGenerating = step === 1;
  const showOptions = step === 2 || step === 3;
  const lineSlotted = step === 4;

  return (
    <GifChrome step={step}>
      <div className="px-7 pt-6 pb-4 border-b border-white/5 shrink-0">
        <p className="text-base font-code text-muted-foreground uppercase tracking-widest">{track.title}</p>
        <h2 className="font-headline text-[2.1rem] font-bold uppercase">VERSE</h2>
      </div>

      <div className="px-7 py-5 space-y-3">
        {filledBars.map((bar) => (
          <div
            key={bar.idx}
            className="rounded-lg border border-white/5 bg-black/30 px-5 py-3.5 font-code text-[19px]"
          >
            <span className="text-muted-foreground/50 mr-2 text-sm">{bar.idx}</span>
            <HighlightedText
              text={bar.text}
              rhymeGroups={track.rhymeHighlightingEnabled ? track.rhymeGroups || [] : []}
            />
          </div>
        ))}

        <div
          className={cn(
            'rounded-lg border border-dashed px-5 py-3.5 font-code text-[19px] min-h-[3.25rem] transition-colors',
            !lineSlotted && 'border-primary/45 bg-primary/10 ring-1 ring-primary/20',
            lineSlotted && 'border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/20 border-solid'
          )}
        >
          <span className="text-muted-foreground/50 mr-2 text-sm">4</span>
          {lineSlotted ? (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-foreground">
              <HighlightedText
                text={MARKETING_CO_WRITER_SLOTTED_LINE}
                rhymeGroups={track.rhymeHighlightingEnabled ? track.rhymeGroups || [] : []}
              />
            </motion.span>
          ) : (
            <span className="text-muted-foreground/45 italic">{MARKETING_EMPTY_BAR_HINT}</span>
          )}
        </div>
      </div>

      <div className="bg-card border-t border-white/10 px-6 py-5 pb-7 shrink-0">
        <div className="flex items-center justify-between pb-3 mb-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap className="h-4 w-4" /> Bar Workstation
          </h4>
          <span className="text-[10px] font-code uppercase tracking-widest text-muted-foreground">
            {step === 0 && 'Bar selected'}
            {step === 1 && 'Generating next line…'}
            {step === 2 && 'Two options ready'}
            {step === 3 && 'Pick your line'}
            {step === 4 && 'Line slotted'}
          </span>
        </div>

        {showOptions ? (
          <div className="flex gap-4 items-stretch">
            {MARKETING_CO_WRITER_OPTIONS.map((opt, i) => (
              <CoWriterOptionCard
                key={opt.line}
                index={i}
                line={opt.line}
                syllables={opt.syllables}
                selected={step === 3 && i === 0}
              />
            ))}
            <div className="h-auto min-h-[96px] w-12 shrink-0 flex items-center justify-center border border-white/10 rounded-lg">
              <X className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ) : lineSlotted ? (
          <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <Check className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-base font-code text-emerald-100/90 leading-snug flex-1">{MARKETING_CO_WRITER_SLOTTED_LINE}</p>
            <Badge className="bg-emerald-500/25 text-emerald-200 border-emerald-500/30 text-[10px] uppercase shrink-0 px-3">
              Slotted
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex-1 min-h-[5rem] rounded-lg border border-dashed border-primary/25 bg-background/40 px-5 font-code text-base text-muted-foreground/70 italic flex items-center">
              {MARKETING_EMPTY_BAR_HINT}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-[5rem] px-6 font-bold text-xs uppercase gap-2 shrink-0',
                isGenerating && 'border-primary/50'
              )}
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <ArrowDown className="h-4 w-4 text-primary" />
              )}
              Next
            </Button>
            <Button variant="outline" size="sm" className="h-[5rem] px-6 font-bold text-xs uppercase gap-2 shrink-0 opacity-60">
              <ArrowUp className="h-4 w-4 text-primary" /> Prev
            </Button>
          </div>
        )}
      </div>
    </GifChrome>
  );
}

export function GifCoWriterScene() {
  return (
    <Suspense fallback={null}>
      <GifCoWriterSceneInner />
    </Suspense>
  );
}

/** Rhyme Pulse — toolbar + highlighted sheet */
function GifRhymePulseSceneInner() {
  const step = useMarketingGifStep(5, 2200);
  const track = MARKETING_PRIMARY_TRACK;
  const showRhymes = step >= 3;
  const isScanning = step === 1 || step === 2;

  const allBars = track.sections?.flatMap((sec) =>
    sec.bars?.filter((bar) => bar.text?.trim()).map((bar) => ({ ...bar, sectionType: sec.type })) ?? []
  ) ?? [];

  return (
    <GifChrome step={step}>
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between gap-4 bg-black/30 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rhyme Focus</span>
        <div className={cn('h-5 w-10 rounded-full border', showRhymes ? 'bg-primary/40 border-primary/50' : 'bg-muted/30 border-white/20')} />
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Rhyme Pulse</span>
        <Button variant="outline" size="sm" className={cn('rounded-full h-9 w-9 p-0 border-primary/40', isScanning && 'animate-pulse')}>
          {isScanning ? <RefreshCw className="h-4 w-4 text-primary animate-spin" /> : <Target className="h-4 w-4 text-primary" />}
        </Button>
      </div>

      <div className="px-5 py-4 pb-5 space-y-2.5">
        {allBars.slice(0, 5).map((bar) => (
          <div key={`${bar.sectionType}-${bar.idx}`} className="rounded-lg border border-white/5 bg-black/30 px-4 py-3 font-code text-[17px] leading-relaxed">
            <HighlightedText text={bar.text} rhymeGroups={showRhymes ? track.rhymeGroups || [] : []} />
          </div>
        ))}
      </div>

      {showRhymes && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 text-sm font-bold uppercase text-primary/80 tracking-widest">
          Rhyme groups updated across the sheet
        </motion.p>
      )}
    </GifChrome>
  );
}

export function GifRhymePulseScene() {
  return (
    <Suspense fallback={null}>
      <GifRhymePulseSceneInner />
    </Suspense>
  );
}
