'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useMarketingGifStep } from '@/hooks/use-marketing-gif-step';
import {
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  Check,
  FolderOpen,
  RefreshCw,
  Save,
  Target,
  Zap,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HighlightedText } from '@/components/highlighted-text';
import { cn } from '@/lib/utils';
import {
  MARKETING_CO_WRITER_OPTIONS,
  MARKETING_CO_WRITER_SLOTTED_LINE,
  MARKETING_EMPTY_BAR_HINT,
  MARKETING_PRIMARY_TRACK,
  MARKETING_REMIX_PATHS,
  MARKETING_SEED_LYRICS,
  MARKETING_VAULT_PRESETS,
  MARKETING_WIZARD_ANALYSIS,
} from '@/lib/marketing-demo-data';
import { MarketingDecodedStrainGrid } from '@/components/marketing/marketing-strain-ui';

/** Fixed capture width — paired with large in-scene type for legible GIF output. */
export const GIF_CAPTURE_WIDTH = 920;

export const GIF_STEP_MS = 2400;
export const GIF_DNA_REMIX_STEPS = 6;
export const GIF_STRAIN_VAULT_STEPS = 5;
export const GIF_CO_WRITER_STEPS = 5;
export const GIF_CO_WRITER_STEP_MS = 1800;

function GifChrome({ children, step }: { children: React.ReactNode; step: number }) {
  return (
    <div
      className="bg-[#05080f] text-foreground px-2 py-1"
      style={{ width: GIF_CAPTURE_WIDTH }}
      data-marketing-capture-ready="true"
      data-marketing-gif-ready="true"
      data-marketing-gif-step={step}
    >
      <div
        data-marketing-ui-crop
        className="rounded-2xl border border-white/12 bg-[#0a1018] shadow-2xl flex flex-col w-full overflow-hidden antialiased"
      >
        {children}
      </div>
    </div>
  );
}

/** Lyrics row sized for marketing GIF legibility (≈22px effective at showcase scale). */
function MarketingLyricBar({
  text,
  rhymeGroups,
  index,
}: {
  text: string;
  rhymeGroups: { words: string[] }[];
  index?: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 font-code text-[23px] leading-[1.42] text-zinc-100">
      {index != null ? <span className="text-zinc-500 mr-2.5 text-lg font-mono tabular-nums">{index}</span> : null}
      <HighlightedText text={text} rhymeGroups={rhymeGroups} />
    </div>
  );
}

function HubTab({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <span
      className={cn(
        'text-xs font-bold uppercase px-3 py-1.5 rounded-full border whitespace-nowrap',
        done && 'border-primary/30 bg-primary/10 text-primary/75',
        active && 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_20px_rgba(59,130,246,0.15)]',
        !active && !done && 'border-white/10 text-muted-foreground'
      )}
    >
      {label}
    </span>
  );
}

type GifTitlePart = { text: string; className?: string; gradient?: string };

function GifGradientTitle({
  parts,
  size = 'header',
  className,
}: {
  parts: GifTitlePart[];
  size?: 'header' | 'section';
  className?: string;
}) {
  const sizeClass =
    size === 'header'
      ? 'text-[1.35rem] font-headline font-bold uppercase tracking-[0.1em] leading-tight'
      : 'text-lg font-headline font-bold uppercase tracking-wide leading-tight';

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5', sizeClass, className)}>
      {parts.map((part, i) => (
        <span
          key={`${part.text}-${i}`}
          className={cn(
            'drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]',
            part.gradient
              ? cn('text-transparent bg-clip-text bg-gradient-to-r', part.gradient)
              : part.className ?? 'text-white'
          )}
        >
          {part.text}
        </span>
      ))}
    </span>
  );
}

function GifSceneHeader({
  icon: Icon,
  iconClass,
  titleParts,
  badge,
  badgeClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  titleParts: GifTitlePart[];
  badge: string;
  badgeClass: string;
}) {
  return (
    <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={cn('h-6 w-6 shrink-0', iconClass)} />
        <GifGradientTitle parts={titleParts} />
      </div>
      <Badge variant="outline" className={cn('text-[11px] uppercase px-2.5 shrink-0 font-bold', badgeClass)}>
        {badge}
      </Badge>
    </div>
  );
}

function GifSectionTitle({ parts, className }: { parts: GifTitlePart[]; className?: string }) {
  return (
    <p className={className}>
      <GifGradientTitle parts={parts} size="section" />
    </p>
  );
}

/** DNA & REMIX — paste → decode (real strain cards) → paths → draft */
function GifDnaRemixSceneInner() {
  const step = useMarketingGifStep(GIF_DNA_REMIX_STEPS, GIF_STEP_MS);
  const analysis = MARKETING_WIZARD_ANALYSIS;

  return (
    <GifChrome step={step}>
      <GifSceneHeader
        icon={BrainCircuit}
        iconClass="text-sky-400"
        titleParts={[
          { text: 'Calibration', className: 'text-sky-100' },
          { text: 'Hub', gradient: 'from-sky-300 to-primary' },
        ]}
        badge="DNA & Remix"
        badgeClass="border-violet-500/40 text-violet-100"
      />

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <GifSectionTitle
            parts={[
              { text: 'Seed DNA', className: 'text-primary/90' },
              { text: '& Remix', gradient: 'from-sky-300 to-violet-300' },
            ]}
          />
          <div className="flex flex-wrap gap-1.5">
            <HubTab label="Rough notes" active={step <= 1} done={step > 1} />
            <HubTab label="Strains" active={step === 2} done={step > 2} />
            <HubTab label="Paths" active={step === 3} done={step > 3} />
            <HubTab label="Draft" active={step >= 4} done={step >= 5} />
          </div>
        </div>

        {step <= 1 && (
          <div className="rounded-xl border-2 border-primary/25 bg-background/30 p-4 min-h-[140px]">
            <p className="text-xs uppercase font-bold text-zinc-300 mb-2 tracking-widest">Seed lyrics</p>
            {step === 0 ? (
              <p className="italic text-zinc-400/90 text-base font-code">Paste rough lyrics or notes to extract strains…</p>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <p className="whitespace-pre-wrap text-base font-code leading-relaxed text-zinc-100">{MARKETING_SEED_LYRICS}</p>
                <div className="flex items-center gap-2 text-sm font-bold uppercase text-primary">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Decoding strains…
                </div>
              </motion.div>
            )}
          </div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <MarketingDecodedStrainGrid analysis={analysis} highlightTitle="Motifs" legible />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <GifSectionTitle
              parts={[
                { text: 'Remix paths', className: 'text-primary/90' },
                { text: '— blend influence', gradient: 'from-violet-300 to-sky-300' },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              {MARKETING_REMIX_PATHS.map((path, i) => (
                <Card key={path.label} className={cn('p-4 border', i === 0 ? 'border-primary/45 bg-primary/10' : 'border-white/10')}>
                  <p className="text-base font-code font-bold leading-snug text-zinc-100">{path.label}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[11px] font-bold uppercase text-zinc-400">
                      <span>Influence</span>
                      <span className="text-primary">{path.influence}%</span>
                    </div>
                    <Progress value={path.influence} className="h-2" />
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <p className="text-sm font-bold uppercase text-cyan-200 flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Creative syncing…
            </p>
            <p className="text-base font-code text-cyan-50/90 leading-relaxed">
              Weaving DNA, motifs, remix paths, and guardrails into one neural pass.
            </p>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-emerald-500/35 bg-emerald-500/10">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-lg uppercase font-headline flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald-400" />
                  <GifGradientTitle
                    parts={[
                      { text: 'Studio draft', className: 'text-emerald-100' },
                      { text: 'ready', gradient: 'from-emerald-300 to-green-400' },
                    ]}
                    size="section"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="font-code text-base leading-relaxed text-zinc-100 px-4 pb-4 space-y-2">
                <p>Mist lifts — timber skin, stone heart still holding the shore.</p>
                <p>Roots dig where the river forgot to run; granite learns the hymn of rain.</p>
                <p className="text-emerald-200/90 text-xs uppercase tracking-widest pt-1">4 bars · rhyme scheme preserved</p>
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

/** Vault save → load preset → DNA mixer */
function GifStrainVaultSceneInner() {
  const step = useMarketingGifStep(GIF_STRAIN_VAULT_STEPS, GIF_STEP_MS);
  const analysis = MARKETING_WIZARD_ANALYSIS;

  return (
    <GifChrome step={step}>
      <GifSceneHeader
        icon={FolderOpen}
        iconClass="text-green-500"
        titleParts={[
          { text: 'DNA Vault', className: 'text-emerald-100' },
          { text: '& Mixer', gradient: 'from-emerald-300 to-green-400' },
        ]}
        badge="Pro workflow"
        badgeClass="border-green-500/35 text-green-100"
      />

      <div className="p-5 space-y-4">
        {step === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-200 mb-3">Decoded — tap ⚡ to inject</p>
            <MarketingDecodedStrainGrid analysis={analysis} highlightTitle="Themes" legible />
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Save className="h-6 w-6 text-green-400" />
              <div>
                <GifSectionTitle
                  parts={[
                    { text: 'Save to', className: 'text-green-100' },
                    { text: 'DNA Vault', gradient: 'from-emerald-300 to-green-400' },
                  ]}
                />
                <p className="text-base font-code text-zinc-200 mt-1">EARTHEN MONOLITH — full strain extract</p>
              </div>
            </div>
            <Button className="w-full font-bold uppercase text-sm h-11 gap-2">
              <Save className="h-4 w-4" /> Archive strains
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <GifSectionTitle
              parts={[
                { text: 'Vault', className: 'text-green-100' },
                { text: 'presets', gradient: 'from-emerald-300 to-green-400' },
              ]}
              className="mb-2"
            />
            {MARKETING_VAULT_PRESETS.map((preset, i) => (
              <div
                key={preset.name}
                className={cn(
                  'rounded-lg border px-4 py-3 flex items-center justify-between gap-3',
                  i === 0 ? 'border-green-500/45 bg-green-500/10' : 'border-white/10 bg-black/20'
                )}
              >
                <div>
                  <p className="text-lg font-bold font-code text-zinc-50">{preset.name}</p>
                  <p className="text-sm uppercase text-zinc-300 tracking-wide">{preset.source}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs font-bold uppercase h-9">
                  Load
                </Button>
              </div>
            ))}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <GifSectionTitle
              parts={[
                { text: 'Album DNA Mixer', className: 'text-emerald-100' },
                { text: '— pick strains', gradient: 'from-emerald-300 to-green-400' },
              ]}
            />
            {[
              { field: 'Setting / World', strain: 'Coastal permanence · mist veil' },
              { field: 'Emotion / Core', strain: 'Stark reverence / cold peace' },
              { field: 'Message / Truth', strain: 'Growth in silence between storms' },
            ].map((row, i) => (
              <div key={row.field} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold uppercase tracking-widest text-emerald-300">{row.field}</span>
                  <Badge variant="outline" className="text-xs uppercase border-emerald-500/30 font-bold">Vault strain</Badge>
                </div>
                <p className={cn('text-lg font-code rounded-lg border p-3.5 text-zinc-50', i === 1 ? 'border-primary/35 bg-primary/10' : 'border-white/10 bg-black/25')}>
                  {row.strain}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-green-500/40 bg-green-500/10 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400 shrink-0" />
              <GifSectionTitle
                parts={[
                  { text: 'Strains slotted into', className: 'text-green-100' },
                  { text: 'Creative DNA', gradient: 'from-emerald-300 to-green-400' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 font-code">
              {['Setting', 'Emotion', 'Trigger', 'Truth', 'Tone'].map((f) => (
                <div key={f} className="rounded-lg border border-green-500/35 bg-black/40 px-3.5 py-3.5 text-green-50">
                  <span className="text-sm font-bold uppercase text-emerald-300 block mb-1.5">{f}</span>
                  <span className="text-xl font-bold text-zinc-50">Loaded</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </GifChrome>
  );
}

export function GifStrainVaultScene() {
  return (
    <Suspense fallback={null}>
      <GifStrainVaultSceneInner />
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
        'flex-1 rounded-xl border-2 bg-primary/10 p-4 flex gap-3 min-h-[88px] items-stretch',
        selected ? 'border-primary/70 bg-primary/20 shadow-[0_0_24px_rgba(59,130,246,0.15)]' : 'border-primary/35'
      )}
    >
      <div className="shrink-0 flex flex-col items-center justify-center gap-2 border-r border-white/10 pr-3 min-w-[4.5rem]">
        <Badge className="bg-primary text-[11px] uppercase px-2.5 py-0.5">Opt {index + 1}</Badge>
        <span className="text-[11px] text-zinc-300 font-mono">{syllables} SYLL</span>
      </div>
      <span className="text-[19px] leading-snug font-code self-center text-zinc-100">{line}</span>
    </div>
  );
}

function GifCoWriterSceneInner() {
  const step = useMarketingGifStep(GIF_CO_WRITER_STEPS, GIF_CO_WRITER_STEP_MS);
  const track = MARKETING_PRIMARY_TRACK;
  const filledBars = track.sections?.[1]?.bars?.slice(0, 3) ?? [];
  const isGenerating = step === 1;
  const showOptions = step === 2 || step === 3;
  const lineSlotted = step === 4;

  return (
    <GifChrome step={step}>
      <div className="px-5 pt-4 pb-3 border-b border-white/8 shrink-0">
        <p className="text-sm font-code text-zinc-300 uppercase tracking-widest">{track.title}</p>
        <GifGradientTitle
          parts={[{ text: 'VERSE', gradient: 'from-sky-200 via-primary to-sky-400' }]}
          size="header"
          className="text-[2rem] mt-0.5"
        />
      </div>

      <div className="px-5 py-3.5 space-y-2.5">
        {filledBars.map((bar) => (
          <MarketingLyricBar
            key={bar.idx}
            index={bar.idx}
            text={bar.text}
            rhymeGroups={track.rhymeHighlightingEnabled ? track.rhymeGroups || [] : []}
          />
        ))}
        <div
          className={cn(
            'rounded-xl border px-4 py-3.5 font-code text-[23px] leading-[1.42] min-h-[3.5rem]',
            !lineSlotted && 'border-dashed border-primary/45 bg-primary/10 ring-1 ring-primary/20',
            lineSlotted && 'border-emerald-500/40 bg-emerald-500/10 border-solid text-zinc-100'
          )}
        >
          <span className="text-zinc-500 mr-2.5 text-lg font-mono tabular-nums">4</span>
          {lineSlotted ? (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <HighlightedText text={MARKETING_CO_WRITER_SLOTTED_LINE} rhymeGroups={track.rhymeGroups || []} />
            </motion.span>
          ) : (
            <span className="text-zinc-500 italic text-[20px]">{MARKETING_EMPTY_BAR_HINT}</span>
          )}
        </div>
      </div>

      <div className="bg-card border-t border-white/10 px-5 py-4 shrink-0">
        <div className="flex items-center justify-between pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <GifSectionTitle
              parts={[
                { text: 'Bar', className: 'text-primary/90' },
                { text: 'Workstation', gradient: 'from-sky-300 to-primary' },
              ]}
            />
          </div>
        </div>
        {showOptions ? (
          <div className="flex gap-3 items-stretch">
            {MARKETING_CO_WRITER_OPTIONS.map((opt, i) => (
              <CoWriterOptionCard key={opt.line} index={i} line={opt.line} syllables={opt.syllables} selected={step === 3 && i === 0} />
            ))}
            <div className="h-auto min-h-[88px] w-10 shrink-0 flex items-center justify-center border border-white/10 rounded-lg">
              <X className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ) : lineSlotted ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <Check className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="text-[17px] font-code text-emerald-50 flex-1 leading-snug">{MARKETING_CO_WRITER_SLOTTED_LINE}</p>
            <Badge className="bg-emerald-500/25 text-emerald-100 border-emerald-500/30 text-[11px] uppercase">Slotted</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-h-[4.5rem] rounded-lg border border-dashed border-primary/25 bg-background/40 px-4 font-code text-sm text-muted-foreground/70 italic flex items-center">
              {MARKETING_EMPTY_BAR_HINT}
            </div>
            <Button variant="outline" size="sm" className={cn('h-[4.5rem] px-5 font-bold text-xs uppercase gap-2', isGenerating && 'border-primary/50')}>
              {isGenerating ? <RefreshCw className="h-4 w-4 text-primary animate-spin" /> : <ArrowDown className="h-4 w-4 text-primary" />}
              Next
            </Button>
            <Button variant="outline" size="sm" className="h-[4.5rem] px-5 font-bold text-xs uppercase gap-2 opacity-60">
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

function GifRhymePulseSceneInner() {
  const step = useMarketingGifStep(5, 2200);
  const track = MARKETING_PRIMARY_TRACK;
  const showRhymes = step >= 3;
  const isScanning = step === 1 || step === 2;
  const allBars =
    track.sections?.flatMap((sec) => sec.bars?.filter((bar) => bar.text?.trim()).map((bar) => ({ ...bar, sectionType: sec.type })) ?? []) ?? [];

  return (
    <GifChrome step={step}>
      <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between gap-3 bg-black/40">
        <GifGradientTitle
          parts={[
            { text: 'Lyrics', className: 'text-zinc-200' },
            { text: 'sheet', gradient: 'from-zinc-300 to-sky-200' },
          ]}
          size="section"
        />
        <GifGradientTitle
          parts={[
            { text: 'Rhyme', className: 'text-sky-100' },
            { text: 'Pulse', gradient: 'from-sky-300 to-primary' },
          ]}
          size="section"
        />
        <Button variant="outline" size="sm" className={cn('rounded-full h-9 w-9 p-0 border-primary/50', isScanning && 'animate-pulse')}>
          {isScanning ? <RefreshCw className="h-4 w-4 text-primary animate-spin" /> : <Target className="h-4 w-4 text-primary" />}
        </Button>
      </div>
      <div className="px-5 py-3.5 space-y-2.5">
        {allBars.slice(0, 5).map((bar) => (
          <MarketingLyricBar
            key={`${bar.sectionType}-${bar.idx}`}
            text={bar.text}
            rhymeGroups={showRhymes ? track.rhymeGroups || [] : []}
          />
        ))}
      </div>
      {showRhymes && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-4 text-sm font-bold uppercase text-sky-200 tracking-widest">
          Rhyme groups updated
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
