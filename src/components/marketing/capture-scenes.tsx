'use client';

import React from 'react';
import Image from 'next/image';
import {
  Check,
  ChevronRight,
  Dna,
  Flame,
  Globe,
  ListMusic,
  PlusCircle,
  Search,
  Shield,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { HighlightedText } from '@/components/highlighted-text';
import { cn } from '@/lib/utils';
import {
  MARKETING_CO_WRITER_OPTIONS,
  MARKETING_DEMO_ALBUMS,
  MARKETING_EMPTY_BAR_HINT,
  MARKETING_PRIMARY_ALBUM,
  MARKETING_PRIMARY_TRACK,
} from '@/lib/marketing-demo-data';
import type { MarketingCaptureScene } from '@/lib/marketing-capture-scenes';
import {
  GifCoWriterScene,
  GifDnaRemixScene,
  GifRhymePulseScene,
  GifStrainVaultScene,
} from '@/components/marketing/gif-capture-scenes';

/** HD product panel — no marketing copy, cropped for feature bands. */
function UiCapture({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('w-[1000px] bg-[#05080f] text-foreground flex items-center justify-center px-5 py-6', className)}
      data-marketing-capture-ready="true"
    >
      <div
        data-marketing-ui-crop
        className="w-full rounded-2xl border border-white/10 bg-[#0a1018] shadow-2xl shadow-primary/10"
      >
        {children}
      </div>
    </div>
  );
}

/** Full-frame hero — wide workstation layout, minimal side gutter. */
function HeroCapture({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-[1240px] bg-[#05080f] text-foreground px-3 py-5"
      data-marketing-capture-ready="true"
      data-marketing-capture-full="true"
    >
      <div className="w-full rounded-2xl border border-white/10 bg-[#0a1018] shadow-2xl flex flex-col">
        {children}
      </div>
    </div>
  );
}

function CaptureHeader() {
  return (
    <div className="h-14 border-b border-white/10 bg-black/50 flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <div className="overflow-hidden rounded-lg border border-primary/20 bg-black p-0.5">
          <Image src="/Logo.png" alt="" width={28} height={28} className="h-7 w-7" />
        </div>
        <span className="font-headline font-bold text-base uppercase tracking-widest">AKAsheet</span>
      </div>
      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs uppercase px-3">Studio Pro</Badge>
    </div>
  );
}

function VinylThumb({ title, cover, tracks }: { title: string; cover: string; tracks: number }) {
  return (
    <div className="flex flex-col items-center gap-10 w-full">
      <div className="relative aspect-square w-full max-w-[260px]">
        <div
          className="absolute inset-0 bg-neutral-900 rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-[8px] border-neutral-800"
          style={{
            backgroundImage:
              'repeating-radial-gradient(circle at center, #1a1a1a 0px, #1a1a1a 2px, #111 4px, #111 5px)',
          }}
        >
          <div className="relative w-[38%] h-[38%] rounded-full overflow-hidden border-4 border-neutral-700 bg-neutral-800">
            <Image src={cover} alt={title} fill className="object-cover opacity-90" unoptimized />
            <div className="absolute w-4 h-4 bg-neutral-950 rounded-full border border-white/20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20" />
          </div>
        </div>
      </div>
      <div className="text-center px-3 space-y-2 min-h-[3.5rem]">
        <p className="font-headline text-lg font-bold uppercase tracking-tight leading-tight">{title}</p>
        <p className="text-xs text-primary/70 font-code uppercase tracking-[0.15em]">{tracks} TRACKS</p>
      </div>
    </div>
  );
}

export function HeroWorkstationScene() {
  const track = MARKETING_PRIMARY_TRACK;
  const album = MARKETING_PRIMARY_ALBUM;
  const rhymeGroups = track.rhymeHighlightingEnabled ? track.rhymeGroups || [] : [];

  return (
    <HeroCapture>
      <CaptureHeader />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/10">
          <div className="px-6 py-4 border-b border-white/5 flex items-start justify-between gap-4 shrink-0">
            <div>
              <p className="text-sm font-code text-muted-foreground uppercase tracking-widest">{album.title}</p>
              <h1 className="font-headline text-4xl font-bold uppercase tracking-tight mt-1">{track.title}</h1>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" className="text-xs font-bold uppercase h-9 px-4">Performance Mode</Button>
              <Button size="sm" variant="outline" className="text-xs font-bold uppercase h-9 px-4 border-white/20">Generation Workstation</Button>
            </div>
          </div>

          <div className="flex-1 px-6 py-4 space-y-4">
            {track.sections?.slice(0, 2).map((section, sectionIdx) => (
              <div key={section.id}>
                <p className="text-sm font-headline font-bold uppercase tracking-[0.2em] text-primary/80 mb-2">{section.type}</p>
                <div className="space-y-2">
                  {(sectionIdx === 1 ? section.bars?.slice(0, 3) : section.bars)?.map((bar) => (
                    <div key={bar.idx} className="rounded-lg border border-white/10 bg-black/35 px-4 py-3 font-code text-[19px] leading-relaxed">
                      <HighlightedText text={bar.text} rhymeGroups={rhymeGroups} />
                    </div>
                  ))}
                  {sectionIdx === 1 ? (
                    <div className="rounded-lg border border-dashed border-primary/35 bg-primary/5 px-4 py-3 font-code text-[17px] text-muted-foreground/50 italic">
                      <span className="text-muted-foreground/40 mr-2 text-sm not-italic">4</span>
                      {MARKETING_EMPTY_BAR_HINT}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 bg-card px-5 py-4 shrink-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4" /> Bar Workstation
            </p>
            <div className="flex gap-3">
              {MARKETING_CO_WRITER_OPTIONS.map((opt, i) => (
                <div
                  key={opt.line}
                  className={cn(
                    'flex-1 rounded-xl border-2 bg-primary/10 p-3 flex gap-3 min-h-[72px]',
                    i === 0 ? 'border-primary/50' : 'border-primary/30'
                  )}
                >
                  <div className="shrink-0 flex flex-col items-center justify-center gap-2.5 border-r border-white/10 pr-4 min-w-[4.75rem]">
                    <Badge className="bg-primary text-[10px] uppercase px-3 py-0.5">Opt {i + 1}</Badge>
                    <p className="text-[10px] text-muted-foreground/90 font-mono tracking-widest">{opt.syllables} SYLL</p>
                  </div>
                  <p className="text-[15px] font-code leading-snug">{opt.line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-[300px] shrink-0 p-4 space-y-4 bg-black/20 overflow-hidden">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-headline uppercase text-green-400 flex items-center gap-2">
                <Dna className="h-5 w-5" /> DNA Suite
              </CardTitle>
              <p className="text-[11px] text-green-400/70 uppercase mt-1">World, emotion, trigger</p>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3 font-code">
              {[
                ['Setting', album.direction?.setting_world],
                ['Emotion', album.direction?.emotion_core],
                ['Trigger', album.direction?.trigger_moment],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] uppercase font-bold text-green-300/90 mb-0.5">{label}</p>
                  <p className="text-[13px] leading-snug text-foreground/90">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-headline uppercase text-rose-400 flex items-center gap-2">
                <Shield className="h-5 w-5" /> Guardrails
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <p className="text-[11px] uppercase font-bold text-emerald-300 mb-2">Must include</p>
                <div className="flex flex-wrap gap-1.5">
                  {track.guardrails?.mustIncludeWords?.map((w) => (
                    <Badge key={w} className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-100 border-emerald-500/30">{w}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-rose-300 mb-2">Forbidden</p>
                <div className="flex flex-wrap gap-1.5">
                  {track.guardrails?.forbiddenWords?.slice(0, 3).map((w) => (
                    <Badge key={w} variant="outline" className="text-xs px-2 py-0.5 border-rose-500/30 text-rose-100">{w}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-sky-500/30 bg-sky-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-headline uppercase text-sky-400 flex items-center gap-2">
                <Target className="h-5 w-5" /> Intents
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 font-code">
              {track.intentRefs?.map((intent, i) => (
                <div key={intent} className="flex items-center gap-2 text-[13px]">
                  <div className={cn('h-4 w-4 rounded border flex items-center justify-center', i === 0 ? 'bg-sky-500/40 border-sky-400' : 'border-white/25')}>
                    {i === 0 && <Check className="h-3 w-3 text-sky-100" />}
                  </div>
                  <span className="leading-snug">{intent}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </HeroCapture>
  );
}

export function FeatureDnaSuiteScene() {
  const album = MARKETING_PRIMARY_ALBUM;
  const fields = [
    { label: '1. Setting / World', value: album.direction?.setting_world },
    { label: '2. Emotion / Core', value: album.direction?.emotion_core },
    { label: '3. Trigger Moment', value: album.direction?.trigger_moment },
    { label: '4. Message / Truth', value: album.direction?.message_truth },
    { label: '5. Tone / Palette', value: album.direction?.tone_palette },
  ];

  return (
    <UiCapture>
      <Card className="border-green-500/30 bg-green-500/5 border-0 shadow-none rounded-none">
        <CardHeader className="p-8 border-b border-green-500/20">
          <CardTitle className="text-3xl flex items-center gap-3 font-headline uppercase text-green-500">
            <Dna className="h-8 w-8" /> DNA Suite
          </CardTitle>
          <p className="text-base text-green-400/90 uppercase tracking-wide mt-2">
            World, emotion, trigger, message, tone
          </p>
        </CardHeader>
        <CardContent className="p-8 space-y-5 font-code">
          {fields.map((f) => (
            <div key={f.label} className="space-y-2">
              <Label className="text-base font-bold uppercase text-green-300">{f.label}</Label>
              <div className="rounded-lg border border-green-500/20 bg-background/50 p-4 text-xl leading-relaxed text-foreground/95">
                {f.value}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </UiCapture>
  );
}

export function FeatureVaultScene() {
  const albums = MARKETING_DEMO_ALBUMS;

  return (
    <UiCapture className="py-10">
      <div className="p-8 pb-16">
        <div className="flex items-center justify-end gap-3 mb-10">
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input readOnly value="stone" className="pl-12 h-12 text-lg font-code bg-black/40 border-white/10" />
          </div>
          <Button className="h-12 font-bold uppercase text-sm gap-2 px-5">
            <PlusCircle className="h-5 w-5" /> Create New
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-x-14 gap-y-20 max-w-4xl mx-auto pt-4 pb-20">
          {albums.map((album) => (
            <VinylThumb
              key={album.id}
              title={album.title}
              cover={album.coverArtUrl || 'https://picsum.photos/seed/default/800/800'}
              tracks={album.tracks?.length || 0}
            />
          ))}
        </div>
      </div>
    </UiCapture>
  );
}

export function FeatureAlbumBlueprintScene() {
  const album = MARKETING_PRIMARY_ALBUM;

  return (
    <UiCapture>
      <div className="grid grid-cols-5 gap-0 min-h-[520px]">
        <div className="col-span-3 p-6 border-r border-white/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0">
              <Image src={album.coverArtUrl!} alt="" fill className="object-cover" unoptimized />
            </div>
            <div>
              <p className="text-sm font-code text-muted-foreground uppercase tracking-widest">Concept Album</p>
              <h2 className="font-headline text-3xl font-bold uppercase">{album.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
            <ListMusic className="h-7 w-7 text-primary" />
            <p className="font-headline text-2xl uppercase font-bold">Tracklist</p>
          </div>
          <div className="divide-y divide-white/10">
            {album.tracks?.map((track, index) => (
              <div key={track.id} className="flex items-center py-4 gap-4">
                <span className="font-code text-lg text-muted-foreground w-10">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex-1">
                  <p className="font-headline text-2xl font-bold uppercase">{track.title}</p>
                  <Badge variant="outline" className="text-sm mt-1 border-white/15">{track.vibe?.genre || 'In progress'}</Badge>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 p-6 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-4">
            <Dna className="h-7 w-7 text-emerald-400" />
            <p className="font-headline text-2xl uppercase font-bold text-emerald-400">Album DNA</p>
          </div>
          <div className="space-y-4 font-code">
            {[
              ['Setting', album.direction?.setting_world],
              ['Emotion', album.direction?.emotion_core],
              ['Truth', album.direction?.message_truth],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-sm uppercase font-bold text-emerald-300/90 mb-1">{label}</p>
                <p className="text-lg leading-relaxed text-foreground/90">{value}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-6 h-11 border-emerald-500/40 text-emerald-300 text-sm font-bold uppercase">
            <Globe className="h-4 w-4 mr-2" /> DNA Drop
          </Button>
        </div>
      </div>
    </UiCapture>
  );
}

export function FeatureGuardrailsScene() {
  const track = MARKETING_PRIMARY_TRACK;

  return (
    <UiCapture>
      <div className="p-6 space-y-5">
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-2xl font-headline uppercase text-rose-400 flex items-center gap-2">
              <Shield className="h-6 w-6" /> Guardrails
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4 font-code">
            <div>
              <p className="text-sm uppercase font-bold text-rose-300 mb-2">Forbidden words</p>
              <div className="flex flex-wrap gap-2">
                {track.guardrails?.forbiddenWords?.map((w) => (
                  <Badge key={w} variant="outline" className="text-sm px-3 py-1 border-rose-500/40 text-rose-100">{w}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm uppercase font-bold text-emerald-300 mb-2">Must include</p>
              <div className="flex flex-wrap gap-2">
                {track.guardrails?.mustIncludeWords?.map((w) => (
                  <Badge key={w} className="text-sm px-3 py-1 bg-emerald-500/25 text-emerald-100 border-emerald-500/40">{w}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-sky-500/30 bg-sky-500/5">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-2xl font-headline uppercase text-sky-400 flex items-center gap-2">
              <Target className="h-6 w-6" /> Intents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-3">
            {track.intentRefs?.map((intent, i) => (
              <div key={intent} className="flex items-center gap-3 text-lg font-code">
                <div className={cn('h-5 w-5 rounded border flex items-center justify-center', i === 0 ? 'bg-sky-500/40 border-sky-400' : 'border-white/25')}>
                  {i === 0 && <Check className="h-3.5 w-3.5 text-sky-100" />}
                </div>
                <span>{intent}</span>
              </div>
            ))}
            <p className="text-base font-bold uppercase text-sky-300 pt-2 border-t border-sky-500/20">
              End with: {track.endWith}
            </p>
          </CardContent>
        </Card>
      </div>
    </UiCapture>
  );
}

export function FeatureStudioProgressScene() {
  return (
    <UiCapture>
      <Card className="border-violet-500/30 bg-violet-500/5 border-0 shadow-none rounded-none">
        <CardHeader className="p-8 border-b border-violet-500/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full border-2 border-violet-400/50 flex items-center justify-center bg-violet-500/10">
              <Trophy className="h-8 w-8 text-violet-300" />
            </div>
            <div>
              <p className="text-sm uppercase font-bold text-violet-300/90 tracking-widest">Current Rank</p>
              <CardTitle className="font-headline text-3xl uppercase text-violet-200">Session Ready</CardTitle>
            </div>
          </div>
          <Badge className="bg-amber-500/25 text-amber-200 border-amber-500/40 gap-1.5 text-sm px-3 py-1">
            <Flame className="h-4 w-4" /> 12-day streak
          </Badge>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div>
            <div className="flex justify-between text-sm font-bold uppercase mb-2">
              <span className="text-muted-foreground">XP to Headliner</span>
              <span className="text-violet-300 text-lg">2,840 / 4,000</span>
            </div>
            <Progress value={71} className="h-3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Write 8 bars this week', 'Complete a track hook', 'Run Rhyme Pulse', 'Share a DNA Drop'].map((label, i) => (
              <div
                key={label}
                className={cn(
                  'rounded-lg border p-4 text-base font-code flex items-center gap-2',
                  i < 2 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-black/30'
                )}
              >
                {i < 2 ? <Check className="h-5 w-5 text-emerald-400 shrink-0" /> : <div className="h-5 w-5 rounded-full border border-white/25 shrink-0" />}
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </UiCapture>
  );
}

/** How-it-works — full-width close-ups with step label for landing legibility */
function HowStepCapture({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[1280px] bg-[#05080f] px-6 py-8" data-marketing-capture-ready="true">
      <div data-marketing-ui-crop className="rounded-2xl border border-white/10 bg-[#0a1018] overflow-hidden">
        <div className="px-8 py-5 border-b border-white/10 bg-primary/10 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-primary">{step}</p>
            <p className="font-headline text-3xl font-bold uppercase text-white mt-1">{title}</p>
          </div>
          <Badge className="text-xs uppercase tracking-widest px-4 py-1.5 border-primary/30 bg-primary/15 text-primary">
            How it works
          </Badge>
        </div>
        {children}
      </div>
    </div>
  );
}

export function HowStepDnaScene() {
  const album = MARKETING_PRIMARY_ALBUM;
  const fields = [
    { label: '1. Setting / World', value: album.direction?.setting_world },
    { label: '2. Emotion / Core', value: album.direction?.emotion_core },
    { label: '3. Tone / Palette', value: album.direction?.tone_palette },
  ];

  return (
    <HowStepCapture step="Step 01" title="Set the World">
      <Card className="border-0 shadow-none rounded-none bg-green-500/5">
        <CardHeader className="px-8 py-6 border-b border-green-500/20">
          <CardTitle className="text-4xl flex items-center gap-3 font-headline uppercase text-green-400">
            <Dna className="h-10 w-10" /> DNA Suite
          </CardTitle>
          <p className="text-base font-code text-green-300/80 mt-2">Five creative direction questions — album rules before bar one.</p>
        </CardHeader>
        <CardContent className="px-8 py-7 space-y-5 font-code">
          {fields.map((f) => (
            <div key={f.label} className="space-y-2">
              <Label className="text-lg font-bold uppercase text-green-300">{f.label}</Label>
              <div className="rounded-xl border border-green-500/25 bg-background/50 p-5 text-[1.65rem] leading-snug text-foreground/95">
                {f.value}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </HowStepCapture>
  );
}

export function HowStepWorkstationScene() {
  return (
    <HowStepCapture step="Step 02" title="Write Bar by Bar">
      <div className="px-8 py-7 space-y-5">
        <p className="text-xl font-bold uppercase tracking-widest text-primary flex items-center gap-3">
          <Zap className="h-7 w-7" /> Bar Workstation
        </p>
        <div className="rounded-xl border-2 border-primary/35 bg-primary/10 px-6 py-5 font-code text-[1.55rem] leading-relaxed">
          Tap a bar → hit <span className="text-primary font-bold">Next</span> → pick Opt 1 or Opt 2
        </div>
        <div className="grid grid-cols-2 gap-4">
          {MARKETING_CO_WRITER_OPTIONS.map((opt, i) => (
            <div
              key={opt.line}
              className={cn(
                'rounded-xl border-2 bg-primary/10 p-5 flex flex-col gap-3',
                i === 0 ? 'border-primary/60 bg-primary/15' : 'border-primary/35'
              )}
            >
              <Badge className="bg-primary text-sm uppercase w-fit px-3">Opt {i + 1}</Badge>
              <p className="text-[1.35rem] font-code leading-snug">{opt.line}</p>
              <p className="text-sm text-muted-foreground font-mono">{opt.syllables} SYLL</p>
            </div>
          ))}
        </div>
      </div>
    </HowStepCapture>
  );
}

export function HowStepProgressScene() {
  return (
    <HowStepCapture step="Step 03" title="Run It Back">
      <Card className="border-0 shadow-none rounded-none bg-violet-500/5">
        <CardHeader className="px-8 py-6 border-b border-violet-500/20">
          <CardTitle className="font-headline text-4xl uppercase text-violet-200 flex items-center gap-3">
            <Trophy className="h-10 w-10 text-violet-300" /> Studio Progress
          </CardTitle>
          <p className="text-base font-code text-violet-300/75 mt-2">Performance Mode, DNA Drops, and habits that keep you writing.</p>
        </CardHeader>
        <CardContent className="px-8 py-7 space-y-6">
          <div>
            <div className="flex justify-between text-lg font-bold uppercase mb-3">
              <span className="text-muted-foreground">XP to Headliner</span>
              <span className="text-violet-300 text-2xl">2,840 / 4,000</span>
            </div>
            <Progress value={71} className="h-5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['Write 8 bars this week', 'Complete a track hook'].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-5 text-[1.25rem] font-code flex items-center gap-3"
              >
                <Check className="h-7 w-7 text-emerald-400 shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </HowStepCapture>
  );
}

const STILL_SCENE_MAP: Record<MarketingCaptureScene, React.ComponentType | undefined> = {
  'hero-workstation': HeroWorkstationScene,
  'feature-dna-suite': FeatureDnaSuiteScene,
  'feature-vault': FeatureVaultScene,
  'feature-album-blueprint': FeatureAlbumBlueprintScene,
  'feature-guardrails': FeatureGuardrailsScene,
  'feature-studio-progress': FeatureStudioProgressScene,
  'how-step-dna': HowStepDnaScene,
  'how-step-workstation': HowStepWorkstationScene,
  'how-step-progress': HowStepProgressScene,
  'gif-dna-remix': GifDnaRemixScene,
  'gif-strain-vault': GifStrainVaultScene,
  'gif-co-writer-next-line': GifCoWriterScene,
  'gif-rhyme-pulse': GifRhymePulseScene,
};

export function MarketingCaptureSceneView({ scene }: { scene: MarketingCaptureScene }) {
  const Component = STILL_SCENE_MAP[scene];
  if (!Component) return null;
  return <Component />;
}
