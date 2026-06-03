'use client';

/**
 * @fileOverview MASTER LOCKDOWN (5/14/2026) - Professional Lyrical Workstation.
 * 
 * - Logic: 3-Way Neural Generation System (In-Line, Workstation, Co-Writer).
 * - UNDO: 20-level history stack for instant structural/lyrical reverts.
 * - STYLE: Restored Co-Writer Generation triggers and added Technical DNA Metrics.
 * - FIX (5/14): Neural Frame Sync (requestAnimationFrame) eradicates Ghost Line bug.
 * - FIX (5/22): Resolved onOpenChange TypeError in Artist Style Training.
 * - FIX (5/22): Bar Workstation auto-expands when line generation options are ready.
 * - FIX (5/23): WORKSPACE INITIALIZATION - Listens for openGenerator URL trigger.
 * - UPDATE (5/22): Added Style DNA Vault (Save/Load) to Right Panel Co-Writer.
 * - FIX (5/23): RESTORED SELECTIVE DNA MIXING Protocol in Vault Dialog.
 * - FIX (5/23): RECONSTRUCTED VAULT UI TO ELIMINATE TEXT TRUNCATION.
 * - UPDATE (5/24): Added deletion protocols to DNA, Vibe, and Style vaults.
 */

import React, { useState, useEffect, useMemo, useTransition, useContext, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataContext } from '@/context/data-context';
import type { Album, Track, Direction, TrackSection, TrackVibe, StyleProfile } from '@/lib/types';
import {
  BrainCircuit,
  ChevronDown,
  FilePenLine,
  GitMerge,
  PlusCircle,
  Trash2,
  Wand2,
  Palette,
  Compass,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  FileDown,
  Shield,
  Target,
  MonitorPlay,
  Waves,
  RefreshCw,
  Zap,
  PanelLeftClose,
  PanelRightClose,
  PanelLeft,
  PanelRight,
  Sparkles,
  Clapperboard,
  Save,
  CheckCircle2,
  Pencil,
  ChevronLeft,
  Mic,
  ArrowUpRight,
  Check,
  X,
  ChevronUp,
  ChevronsUpDown,
  ClipboardPaste,
  FolderOpen,
  Timer,
  MessageSquareQuote,
  Clock,
  LayoutTemplate,
  NotebookPen,
  Copy,
  LayoutGrid,
  ChevronRight,
  Fingerprint,
  HelpCircle,
  Info,
  Lock,
  Dna,
  Globe,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreativeEffectsPanel } from './creative-effects-panel';
import { ScratchPad } from './scratch-pad';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUIState } from '@/hooks/use-ui-state';
import { useUsage } from '@/context/usage-context';
import { HighlightedText } from './highlighted-text';
import { Badge } from '@/components/ui/badge';
import { StudioLoader } from '@/components/studio-loader';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { withAiAuth } from '@/lib/ai-client';
import { useAuth } from '@/hooks/use-auth';
import { isProUser } from '@/lib/subscription';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { DnaVaultPresetDetails } from '@/components/dna-vault-preset-details';
import type { DnaPreset } from '@/lib/types';
import { STRAIN_TARGETS, appendDirectionField, buildDnaPresetFromDirection, DEFAULT_STYLE_METRICS } from '@/lib/dna-strands';
import {
  markLyricsTutorialComplete,
  REPLAY_GUIDED_TOUR_EVENT,
  PENDING_TOUR_REPLAY_KEY,
  type LyricsTourStep,
} from '@/lib/studio-onboarding';
import { StudioGuidedTour } from '@/components/studio-guided-tour';
import { QuestProgress } from '@/components/gamification/quest-progress';
import { postGamificationEvent } from '@/lib/gamification-client';
import { FreeTierExpectationsBanner } from '@/components/free-tier-expectations-banner';
import { MobileLyricsTabBar, type MobileLyricsTab } from '@/components/mobile-lyrics-tab-bar';
import { UpgradeTooltip } from '@/components/upgrade-tooltip';
import { LockedSaveButton, ProLockBadge, proLockShell, proLockIcon, proLockText, markBarAnchorGlow } from '@/components/pro-lock';
import { withLineSource } from '@/lib/gamification/line-attribution';
import {
  loadTrackUILayout,
  saveTrackUILayout,
  DEFAULT_SECTIONS_CLOSED,
  type CoWriterSections,
  type CoWriterSectionKey,
} from '@/lib/track-panel-state';
import { getWorkstationRuleBadges, isIntentsActive, isGuardrailsActive, isStyleActive, isVibeActive, isTrackDnaActive, isAlbumDnaActive } from '@/lib/co-writer-rules';
import { SYSTEM_DNA_PRESETS, SYSTEM_STYLE_PRESETS, SYSTEM_VIBE_PRESETS } from '@/lib/system-presets';
import { GenerateSongDraftDialog } from './generate-song-draft-dialog';
import { ExportDialog } from './export-dialog';
import { ShareDialog } from './share-dialog';
import { findRhymes } from '@/ai/flows/find-rhymes';
import { suggestVibe } from '@/ai/flows/suggest-vibe';
import { generateNextLine } from '@/ai/flows/generate-next-line';
import { improveMyStyle } from '@/ai/flows/improve-my-style';
import { analyzeStructure } from '@/ai/flows/analyze-structure';
import { generateCoverArt } from '@/ai/flows/generate-cover-art';
import { FreestylePad } from '@/components/freestyle-pad';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { cn, mergeDirection } from '@/lib/utils';
import { linesToRhymeBars } from '@/lib/lyrics-units';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Hint } from '@/components/ui/tooltip';
import { useTouchInkRunner } from '@/hooks/use-touch-ink-runner';

// --- Hoisted Workstation Dialogs ---

function ArchivalNamingDialog({ open, onOpenChange, onConfirm, type }: any) {
  const [name, setName] = useState('');
  useEffect(() => { if (open) setName(''); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2 z-[3000]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Save className="text-primary" /> Archive {type}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">Enter a name for this {type.toLowerCase()} preset to save it to your vault.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. My ${type} Preset`} className="bg-background/50 font-bold" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onConfirm(name.trim()); onOpenChange(false); }} disabled={!name.trim()} className="px-8 font-bold">Confirm Archive</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditIntentDialog({ open, onOpenChange, initialValue, onConfirm }: any) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (open) setValue(initialValue); }, [open, initialValue]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2 z-[3000]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Pencil className="text-primary" /> Edit Motif
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">Modify your intent target.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} className="bg-background/50 font-bold" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onConfirm(value.trim()); onOpenChange(false); }} disabled={!value.trim()} className="px-8 font-bold">Update Motif</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SmartStructureDialog({ open, onOpenChange, onApply }: any) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { deductInk, refundInk, addUsageLog } = useUsage();
  const { setGenerating } = useUIState();
  const { getCost, buttonLabel, tooltip } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const handleAnalyze = async (e: any) => {
    const cost = getCost('analyzeStructure');
    runWithInk('analyzeStructure', cost, 'analyzeStructure', e, async () => {
      setIsProcessing(true);
      setGenerating(true, 'Deconstructing Neural Structure...');
      try {
        const res = await analyzeStructure(await withAiAuth({ text: inputText }));
        const newSections = res.sections.map((s: any, i: number) => ({
          id: `smart-${Date.now()}-${i}`,
          type: s.type,
          bars: s.lines.map((l: any, j: number) => ({
            idx: j + 1,
            text: l.trim(),
            accepted: true,
            syllables: l.trim().split(' ').length,
            rhymeKey: '?',
            lineSource: 'generated' as const,
          })),
        }));
        onApply(newSections);
        addUsageLog({ flowName: 'analyzeStructure', inkCost: cost, status: 'success' });
        toast({ title: 'Structure Analyzed' });
        onOpenChange(false);
      } catch (err: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Analysis Failed', description: err.message });
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[min(96vw,42rem)] max-h-[min(88dvh,calc(100dvh-1.5rem))] flex flex-col gap-0 overflow-hidden bg-card border-2 p-4 sm:p-6">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="font-headline text-xl sm:text-2xl flex items-center gap-2">
            <ClipboardPaste className="text-primary h-5 w-5 sm:h-6 sm:w-6 shrink-0" /> Smart Structure Paste
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Paste raw lyrics — we&apos;ll split them into Verse, Hook, and other blocks automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto studio-scrollbar px-1 py-3 space-y-3">
          <details className="rounded-lg border border-primary/20 bg-primary/5 p-3 group open:pb-3">
            <summary className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-2">
              <span>Tip: label sections with [ brackets ]</span>
              <span className="text-[9px] font-code text-muted-foreground normal-case tracking-normal group-open:hidden">Show example</span>
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Put each part name on its own line in square brackets. Lines below a label belong to that section until the next label.
              </p>
              <div className="rounded border border-border/40 bg-background/60 p-2.5 font-code text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed max-h-[9rem] overflow-y-auto studio-scrollbar">
{`[Verse 1]
First line of your verse
Second line here

[Hook]
Catchy hook line one

[Verse 2]
Back to the story`}
              </div>
              <p className="text-[10px] text-muted-foreground/80">
                No brackets? No problem — the AI will still guess Verse vs Hook from context.
              </p>
            </div>
          </details>
          <Textarea 
            placeholder="Paste your lyrics here — use [Verse], [Hook], [Bridge] labels for best results..."
            className="min-h-[220px] sm:min-h-[260px] h-[min(40vh,340px)] max-h-[min(55vh,480px)] resize-y font-code text-sm bg-background/50 border border-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:ring-offset-0"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>
        <DialogFooter className="shrink-0 pt-3 border-t border-white/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAnalyze} disabled={!inputText.trim() || isProcessing} className="font-bold gap-2" title={tooltip('analyzeStructure')}>
            {isProcessing ? <StudioLoader size="sm" /> : <ClipboardPaste className="h-4 w-4" />}
            {buttonLabel('analyzeStructure')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImproveMyStyleDialog({ open, onOpenChange, track, onUpdateStyle }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { refundInk, addUsageLog } = useUsage();
  const { setGenerating } = useUIState();
  const { getCost, buttonLabel, tooltip } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const handleTrain = async (e: any) => {
    const cost = getCost('improveMyStyle');
    runWithInk('improveMyStyle', cost, 'improveMyStyle', e, async () => {
      setIsProcessing(true);
      setGenerating(true, 'Learning Artist DNA...');
      try {
        const allText = track.sections.flatMap((s: any) => s.bars.map((b: any) => b.text)).join('\n');
        if (allText.length < 50) throw new Error('Need more lyrical data to train effectively.');
        const res = await improveMyStyle(await withAiAuth({ lyrics: allText }));
        onUpdateStyle(res.analysis, res.metrics);
        addUsageLog({ flowName: 'improveMyStyle', inkCost: cost, status: 'success' });
        toast({ title: 'Style Profile Updated', description: 'The AI co-writer has learned your unique flow pattern.' });
        onOpenChange(false);
      } catch (err: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Training Failed', description: err.message });
      } finally {
        setIsProcessing(false);
        setGenerating(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-fuchsia-500">
            <Fingerprint className="h-6 w-6" /> Train AI on Style
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">The AI will analyze your technical patterns (flow, rhyme density, vocabulary) across all your songs to build a persistent Profile.</DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center space-y-4">
            <div className="p-4 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-lg text-left space-y-2">
                <p className="text-[10px] font-bold uppercase text-fuchsia-700 flex items-center gap-2"><Info className="h-3 w-3" /> Technical Extraction Protocol</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This action updates your **Global Artist DNA**. It learns your cadence, word variety, and rhyme structures. It is used as a foundation for every generation in the studio. 
                </p>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest italic">Tip: Use your best-written songs for training.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleTrain} disabled={isProcessing} className="bg-fuchsia-600 hover:bg-fuchsia-700 font-bold gap-2" title={tooltip('improveMyStyle')}>
            {isProcessing ? <StudioLoader size="sm" /> : <Sparkles className="h-4 w-4" />}
            {buttonLabel('improveMyStyle')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DNAVaultDialog({ open, onOpenChange, album, updateAlbum, track, onUpdateTrack, onLoadPreset, updateStyleProfile, isPro }: any) {
    const { toast } = useToast();
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const presets = isPro ? (album?.dnaPresets || []) : SYSTEM_DNA_PRESETS;
    const isSystem = (p: any) => p.createdAt === 'system';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[min(92vh,calc(100dvh-2rem))] flex flex-col overflow-hidden bg-card border-2">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-green-500">
                        <FolderOpen className="h-6 w-6" /> DNA Vault
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">
                        {isPro ? 'Selectively load creative strains or full profiles from your history.' : 'Load system DNA strains — pick individual fields or apply full profiles.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto studio-scrollbar pr-2 max-h-[min(calc(92vh-7.5rem),660px)]">
                    <TooltipProvider delayDuration={300}>
                    <div className="space-y-4 pb-1">
                        {presets.length > 0 ? presets.map((p: any, i: number) => (
                            <Card key={`${p.name}-${i}`} className="bg-background/40 border-white/5 overflow-hidden flex flex-col transition-all">
                                <div 
                                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                                >
                                    <div className="min-w-0 flex-grow pr-4">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-white uppercase truncate">{p.name}</p>
                                            {(!isPro || isSystem(p)) && (
                                                <ProLockBadge label="System" />
                                            )}
                                        </div>
                                        <p className="text-[9px] text-muted-foreground font-code mt-0.5">Source: {p.sourceTrackTitle || 'Studio Preset'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isPro && !isSystem(p) && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={(e) => { e.stopPropagation(); updateAlbum(album.id, { dnaPresets: album.dnaPresets.filter((_:any, idx:number) => idx !== i) }); toast({ title: "DNA Strain Erased" }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onLoadPreset(p); onOpenChange(false); }}><RefreshCw className="h-3.5 w-3.5" /></Button>
                                        {expandedIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </div>
                                {expandedIdx === i && (
                                    <div className="p-3 bg-black/40 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                                        <DnaVaultPresetDetails
                                            preset={p}
                                            onInjectMappingField={(field, value) => {
                                                if (!value) return;
                                                onUpdateTrack({
                                                    direction: { ...(track.direction ?? {}), [field]: value, enabled: true },
                                                });
                                                toast({ title: `${field} loaded` });
                                            }}
                                            onInjectStrain={(title, content) => {
                                                const target = STRAIN_TARGETS[title];
                                                if (!target) return;
                                                if (target.kind === 'style_profile') {
                                                    const text = Array.isArray(content) ? content.join(', ') : content;
                                                    updateStyleProfile?.(text, DEFAULT_STYLE_METRICS);
                                                    onUpdateTrack({ styleEnabled: true });
                                                    toast({ title: 'Style DNA loaded' });
                                                    return;
                                                }
                                                if (target.kind !== 'direction') return;
                                                const text = Array.isArray(content) ? content.join(', ') : content;
                                                onUpdateTrack({
                                                    direction: {
                                                        ...(track.direction ?? {}),
                                                        ...appendDirectionField(
                                                            track.direction ?? {},
                                                            target.field,
                                                            target.label,
                                                            text
                                                        ),
                                                        enabled: true,
                                                    },
                                                });
                                                toast({ title: `${title} injected` });
                                            }}
                                            onInjectIntents={(intents) => {
                                                onUpdateTrack({
                                                    checkedIntents: intents,
                                                    intentsEnabled: true,
                                                });
                                                if (album) {
                                                    const existing = album.thingsToSay || [];
                                                    const novel = intents.filter((m: string) => !existing.includes(m));
                                                    if (novel.length) {
                                                        updateAlbum(album.id, { thingsToSay: [...existing, ...novel] });
                                                    }
                                                }
                                                toast({ title: 'Motifs loaded into Intents' });
                                            }}
                                            onInjectStyle={(analysis, metrics) => {
                                                updateStyleProfile?.(analysis, metrics ?? DEFAULT_STYLE_METRICS);
                                                onUpdateTrack({ styleEnabled: true });
                                                toast({ title: 'Style DNA loaded' });
                                            }}
                                        />
                                    </div>
                                )}
                            </Card>
                        )) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed rounded-lg p-6 text-center">
                                <div className="p-3 rounded-full bg-muted/20"><Compass className="h-8 w-8 opacity-20" /></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Vault is Empty</p>
                                    <p className="text-[9px] lowercase italic opacity-60">Archive current direction to build your vault.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    </TooltipProvider>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function VibeVaultDialog({ open, onOpenChange, track, onUpdateTrack, onApply, isPro }: any) {
    const { toast } = useToast();
    const presets = isPro ? (track.vibePresets || []) : SYSTEM_VIBE_PRESETS;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-2">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-amber-500">
                        <FolderOpen className="h-6 w-6" /> Vibe Vault
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">
                        {isPro ? 'Access saved instrumentation and atmospheric presets.' : 'Choose from 2 professional system vibe presets.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] mt-4">
                    <div className="space-y-2">
                        {presets.length > 0 ? presets.map((v: any, i: number) => (
                            <div key={`${v.name}-${i}`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-white uppercase truncate">{v.name || 'Unnamed Preset'}</p>
                                        {!isPro && (
                                            <ProLockBadge label="System" />
                                        )}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-code mt-0.5">{v.genre} | {v.tempoBPM} BPM</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isPro && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={() => { onUpdateTrack({ vibePresets: track.vibePresets.filter((_:any, idx:number) => idx !== i) }); toast({ title: "Vibe Preset Erased" }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    )}
                                    <Button size="sm" variant="secondary" className="h-7 text-[9px] font-bold px-3" onClick={() => { onApply({ ...v, enabled: true }); onOpenChange(false); toast({ title: "Vibe Loaded" }); }}>LOAD</Button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed rounded-lg p-6 text-center">
                                <div className="p-3 rounded-full bg-muted/20"><Palette className="h-8 w-8 opacity-20" /></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No Presets Found</p>
                                    <p className="text-[9px] lowercase italic opacity-60">Archive your current instrumentation to save vibes.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function StyleVaultDialog({ open, onOpenChange, album, updateAlbum, onApply, isPro }: any) {
    const { toast } = useToast();
    const presets = isPro ? (album?.stylePresets || []) : SYSTEM_STYLE_PRESETS;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-2">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-fuchsia-500">
                        <FolderOpen className="h-6 w-6" /> Style Vault
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">
                        {isPro ? 'Load historical artist DNA and cadence profiles.' : 'Choose from 2 professional style DNA presets.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] mt-4">
                    <div className="space-y-2">
                        {presets.length > 0 ? presets.map((s: any, i: number) => (
                            <div key={`${s.name}-${i}`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-white uppercase truncate">{s.name}</p>
                                        {!isPro && (
                                            <ProLockBadge label="System" />
                                        )}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-code mt-0.5 line-clamp-2 italic">"{s.analysis}"</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isPro && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={() => { updateAlbum(album.id, { stylePresets: album.stylePresets.filter((_:any, idx:number) => idx !== i) }); toast({ title: "Style DNA Erased" }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    )}
                                    <Button size="sm" variant="secondary" className="h-7 text-[9px] font-bold px-3" onClick={() => { onApply(s.analysis, s.metrics); onOpenChange(false); toast({ title: "Style DNA Applied" }); }}>LOAD</Button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed rounded-lg p-6 text-center">
                                <div className="p-3 rounded-full bg-muted/20"><Fingerprint className="h-8 w-8 opacity-20" /></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No Strains Found</p>
                                    <p className="text-[9px] lowercase italic opacity-60">Archive your latest trained profile to populate the vault.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

// --- Left Panel Component ---

function mobileLyricsPanelClass(active: boolean, edge?: 'left' | 'right') {
  return cn(
    active ? 'max-md:flex max-md:flex-1 max-md:min-h-0 max-md:w-full max-md:max-w-full max-md:shrink-0' : 'max-md:hidden',
    active && edge === 'left' && 'max-md:border-r-0',
    active && edge === 'right' && 'max-md:border-l-0',
  );
}

function LeftPanel({ track, album, onUpdateTrack, activeSectionId, setActiveSectionId, setExportDialogOpen, setShareDialogOpen, onCollapse, leftCollapsed, setGenerateDraftOpen, scratchPadRef, isPro, mobileActive = false }: any) {
  const router = useRouter();
  const { setGenerating } = useUIState();
  const { toast } = useToast();
  const { refundInk, addUsageLog } = useUsage();
  const { getCost, tooltip, buttonLabel } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const handleSuggestVibe = async (e: any) => {
    const cost = getCost('suggestVibe');
    runWithInk('suggestVibe', cost, 'suggestVibe', e, async () => {
      setGenerating(true, 'Analyzing Sonic Landscape...');
      try {
        const fullLyrics = track.sections.flatMap((s: any) => s.bars.map((b: any) => b.text)).join('\n');
        const res = await suggestVibe(await withAiAuth({ lyrics: fullLyrics }));
        onUpdateTrack({ vibe: { ...track.vibe, ...res, enabled: true } });
        addUsageLog({ flowName: 'suggestVibe', inkCost: cost, status: 'success' });
        toast({ title: 'Vibe Generated' });
      } catch (err: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Vibe Failed', description: err.message });
      } finally {
        setGenerating(false);
      }
    });
  };

  const handleGenerateScene = async (e: any) => {
    const cost = getCost('generateCoverArt');
    runWithInk('generateCoverArt', cost, 'generateCoverArt', e, async () => {
      setGenerating(true, 'Generating Cinematic DNA...');
      try {
        const fullLyrics = track.sections.flatMap((s: any) => s.bars.map((b: any) => b.text)).join('\n');
        const res = await generateCoverArt(
          await withAiAuth({
            lyrics: fullLyrics,
            vibe: track.vibe,
            mergedDirection: mergeDirection(album.direction, track.direction),
            title: track.title,
          })
        );
        scratchPadRef.current?.addEffectResult({
          tool: 'scene-gen' as any,
          inputs: { prompt: 'Cinematic Scene' },
          outputs: [res.prompt],
        });
        addUsageLog({ flowName: 'generateCoverArt', inkCost: cost, status: 'success' });
        toast({ title: 'Scene Generated', description: 'Cinematic prompt added to Scratch Pad.' });
      } catch (err: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Scene Generation Failed', description: err.message });
      } finally {
        setGenerating(false);
      }
    });
  };

  const handleMoveSection = (id: string, direction: 'up' | 'down') => {
      const idx = track.sections.findIndex((s:any) => s.id === id);
      if (idx === -1) return;
      const newSections = [...track.sections];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newSections.length) return;
      [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];
      onUpdateTrack({ sections: newSections });
  };

  if (leftCollapsed && !mobileActive) {
    return (
        <div className={cn("flex flex-col items-center h-full bg-card border-r w-[56px] shrink-0 overflow-hidden py-6 z-30", mobileLyricsPanelClass(mobileActive, 'left'))}>
            <NeuralStripItem text="STATUS" active={track.status === 'complete'} color="#0ea5e9" onClick={() => onCollapse(false)} />
            <NeuralStripItem text="STRUC" active={true} color="#eab308" onClick={() => onCollapse(false)} />
            <NeuralStripItem text="VIBE" active={isVibeActive(track)} color="#f59e0b" onClick={() => onCollapse(false)} />
            <NeuralStripItem text="SCENE" active={false} color="#6366f1" onClick={() => onCollapse(false)} />
        </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-card border-r relative overflow-hidden w-[260px] shrink-0 z-30", mobileLyricsPanelClass(mobileActive, 'left'))}>
      <div className="flex items-center justify-between p-4 border-b shrink-0 h-14">
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground">Workstation</h3>
        {!mobileActive && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCollapse(true)}><PanelLeftClose className="h-4 w-4" /></Button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto studio-scrollbar">
        <div className="p-4 space-y-6 pb-24">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setGenerateDraftOpen(true)} data-tour="generation-workstation" className="w-full h-20 font-bold uppercase tracking-[0.2em] gap-3 shadow-[0_0_30px_rgba(59,130,246,0.4)] bg-primary text-white border-2 border-white/10 group animate-in fade-in zoom-in duration-1000 hover:scale-[1.02] transition-all">
                    <BrainCircuit className="h-8 w-8 group-hover:animate-pulse" /> 
                    <div className="flex flex-col items-start">
                      <span className="text-xs leading-none">Generation</span>
                      <span className="text-lg leading-none mt-1">Workstation</span>
                    </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <p className="text-[10px] font-bold">{tooltip('generateDraftPerBar')} — total depends on sections selected</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Card className="border-sky-500/30 bg-sky-500/5 shadow-sm overflow-hidden" data-tour="track-status">
              <CardHeader className="p-4 h-12 flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-sky-400 font-headline uppercase"><FilePenLine className="h-4 w-4" /> Track Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-sky-400/70 tracking-widest">Title</Label>
                    <Input value={track.title} onChange={(e) => onUpdateTrack({ title: e.target.value })} className="font-headline border-sky-500/20 bg-background/50 h-9 text-xs" />
                  </div>
                  <div className="space-y-2 pt-1 border-t border-sky-500/15">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[10px] uppercase font-bold text-sky-400/70 tracking-widest">Completion</Label>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] font-bold uppercase h-5 px-2 leading-none whitespace-nowrap shrink-0 max-w-full truncate',
                          track.status === 'complete'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-sky-500/30 bg-sky-500/5 text-sky-300'
                        )}
                      >
                        {track.status === 'complete' ? 'Complete' : 'In Progress'}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-snug">
                      Lock the track when lyrics are finished — counts toward weekly goals and achievements.
                    </p>
                    <Button
                      variant={track.status === 'complete' ? 'outline' : 'default'}
                      size="sm"
                      className={cn(
                        'w-full min-w-0 text-[9px] font-bold h-9 uppercase justify-start leading-none px-2',
                        track.status === 'complete'
                          ? 'border-sky-500/30 text-sky-300 hover:bg-sky-500/10'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                      )}
                      onClick={() => {
                        const next = track.status === 'complete' ? 'in_progress' : 'complete';
                        onUpdateTrack({ status: next });
                        toast({
                          title: next === 'complete' ? 'Track Locked' : 'Track Reopened',
                          description:
                            next === 'complete'
                              ? 'Marked complete — weekly progress and XP will update on save.'
                              : 'Track is back in progress.',
                        });
                      }}
                    >
                      {track.status === 'complete' ? (
                        <>
                          <Pencil className="mr-2 h-4 w-4" /> Reopen Track
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Track Complete
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-2 min-w-0">
                    {isPro ? (
                      <Button variant="secondary" size="sm" className="w-full min-w-0 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[9px] font-bold h-9 uppercase justify-start leading-none px-2" onClick={() => window.open(`${window.location.pathname}/perform`, '_blank')}><MonitorPlay className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate">Performance Mode</span></Button>
                    ) : (
                      <UpgradeTooltip feature="Performance Mode" benefit="Full-screen teleprompter with scroll-synced lyrics for stage and studio sessions." example="Rehearse hooks without losing your place mid-verse.">
                        <Button variant="secondary" size="sm" className={cn('w-full min-w-0 text-[9px] font-bold h-9 uppercase justify-start leading-none px-2', proLockShell('md'), proLockText())} onClick={() => router.push('/usage?tab=cloud')}><Lock className={cn('mr-2 h-4 w-4 shrink-0', proLockIcon())} /> <span className="truncate">Performance Mode</span></Button>
                      </UpgradeTooltip>
                    )}
                    <Button variant="secondary" size="sm" className="w-full min-w-0 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold h-9 uppercase justify-start leading-none px-2" onClick={() => setExportDialogOpen(true)}><FileDown className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate">Export Track</span></Button>
                    {isPro ? (
                      <Button variant="secondary" size="sm" data-tour="dna-drop" className="w-full min-w-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[9px] font-bold h-9 uppercase justify-start leading-none px-2" onClick={() => setShareDialogOpen(true)}><Globe className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate">DNA Drop (Share)</span></Button>
                    ) : (
                      <UpgradeTooltip feature="DNA Drop" benefit="Publish a shareable link to your track blueprint for collab and feedback." example="Drop a link so collaborators can import your structure.">
                        <Button variant="secondary" size="sm" className={cn('w-full min-w-0 text-[9px] font-bold h-9 uppercase justify-start leading-none px-2', proLockShell('md'), proLockText())} onClick={() => router.push('/usage?tab=cloud')}><Lock className={cn('mr-2 h-4 w-4 shrink-0', proLockIcon())} /> <span className="truncate">DNA Drop (Share)</span></Button>
                      </UpgradeTooltip>
                    )}
                  </div>
              </CardContent>
          </Card>
          
          <Card className="border-yellow-500/20 bg-[#1a1a14] shadow-lg overflow-hidden p-0">
            <div className="flex items-center gap-2 p-4 pb-2 border-b border-white/5">
                <GitMerge className="h-4 w-4 text-yellow-500" />
                <h3 className="font-headline font-bold text-lg text-yellow-500 uppercase tracking-tight">Structure</h3>
            </div>
            <div className="space-y-1 px-2 py-3">
                {track.sections?.map((s: any, idx: number) => (
                    <div key={s.id} onClick={() => setActiveSectionId(s.id)} className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer border border-transparent",
                        activeSectionId === s.id ? "bg-yellow-500/10 border-yellow-500/20" : "hover:bg-yellow-500/5"
                    )}>
                        <div className="flex items-center gap-2 min-w-0">
                             <Badge
                               variant="outline"
                               className="h-4 px-1 text-[7px] font-mono border-white/10 text-muted-foreground"
                               title={`${s.bars.length} lines · ${linesToRhymeBars(s.bars.length)} bars`}
                             >
                               {linesToRhymeBars(s.bars.length)}
                             </Badge>
                             <span className="font-bold text-xs text-white uppercase truncate">{s.type}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-yellow-500" onClick={(e) => { e.stopPropagation(); handleMoveSection(s.id, 'up'); }} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-yellow-500" onClick={(e) => { e.stopPropagation(); handleMoveSection(s.id, 'down'); }} disabled={idx === track.sections.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500/60 hover:text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); onUpdateTrack({ sections: track.sections.filter((sec:any) => sec.id !== s.id) }); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 pt-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full h-10 border-yellow-500/20 bg-background/40 hover:bg-yellow-500/5 text-yellow-500 font-bold text-xs uppercase gap-2 shadow-inner">
                            <PlusCircle className="h-4 w-4" /> Add Section
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 bg-card border-yellow-500/20">
                        {['verse', 'hook', 'bridge', 'intro', 'outro', 'chorus', 'pre'].map(type => (
                            <DropdownMenuItem key={type} onClick={() => { 
                                const ns = { id: `section-${Date.now()}`, type, bars: [{idx:1, text:'', accepted:true, syllables:0, rhymeKey:'?'}] }; 
                                onUpdateTrack({ sections: [...(track.sections || []), ns] }); 
                                setActiveSectionId(ns.id); 
                            }} className="capitalize font-bold text-xs hover:bg-yellow-500/10">{type}</DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2 flex-col items-start gap-1 space-y-0">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-500 font-headline uppercase"><Waves className="h-4 w-4" /> Vibe Suggester</CardTitle>
                <p className="text-[9px] text-muted-foreground leading-snug font-code normal-case tracking-normal">
                  Scans your lyrics and suggests genre, tempo, and production feel for this track — ready to paste into Suno or Udio.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 font-code">
                <div className="p-3 bg-background/40 rounded border border-amber-500/20">
                  <p className="text-[11px] font-bold uppercase text-amber-700">{track.vibe.genre || 'Undefined'}</p>
                  <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{track.vibe.feeling?.join(', ')}</p>
                </div>
                <Hint
                  skipOnTouch
                  side="bottom"
                  align="center"
                  className="max-w-[min(calc(100vw-2rem),16rem)] space-y-1"
                  content={
                    <>
                      <p className="text-[10px] font-bold leading-snug">Analyze lyrics → fill Track Vibe fields</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">Uses your current sheet text to infer genre, BPM, mood, and instrumentation.</p>
                      <p className="text-[9px] font-mono text-primary">{tooltip('suggestVibe')}</p>
                    </>
                  }
                >
                  <Button variant="outline" size="sm" className="w-full h-9 text-[9px] font-bold uppercase border-amber-500/20 hover:bg-amber-500/10 text-amber-600" onClick={(e) => handleSuggestVibe(e)}><RefreshCw className="mr-2 h-3.5 w-3.5"/> {buttonLabel('suggestVibe')}</Button>
                </Hint>
              </CardContent>
          </Card>

          <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2 flex-col items-start gap-1 space-y-0">
                <CardTitle className="text-sm flex items-center gap-2 text-indigo-400 font-headline uppercase"><Clapperboard className="h-4 w-4" /> Scene Gen</CardTitle>
                <p className="text-[9px] text-muted-foreground leading-snug font-code normal-case tracking-normal">
                  Builds a cinematic visual prompt from your lyrics and DNA, then adds it to the Scratch Pad for video or mood boards.
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-4 font-code">
                <Hint
                  skipOnTouch
                  side="bottom"
                  align="center"
                  className="max-w-[min(calc(100vw-2rem),16rem)] space-y-1"
                  content={
                    <>
                      <p className="text-[10px] font-bold leading-snug">Cinematic scene prompt → Scratch Pad</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">Combines lyrics, vibe, and direction into a shot list you can reuse in video AI tools.</p>
                      <p className="text-[9px] font-mono text-primary">{tooltip('generateCoverArt')}</p>
                    </>
                  }
                >
                  <Button variant="outline" size="sm" className="w-full h-9 text-[9px] font-bold uppercase border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-400" onClick={(e) => handleGenerateScene(e)}>
                    <Sparkles className="mr-2 h-3.5 w-3.5"/> {buttonLabel('generateCoverArt')}
                  </Button>
                </Hint>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NeuralStripItem({ text, active, color, onClick }: { text: string, active?: boolean, color: string, onClick: () => void }) {
    return (
      <div 
        onClick={onClick}
        className="flex flex-col items-center gap-3 py-3 cursor-pointer transition-all duration-500 w-full group shrink-0"
      >
        <div 
          style={{ 
              backgroundColor: color,
              boxShadow: active ? `0 0 12px ${color}` : 'none'
          }}
          className={cn(
              "w-1.5 h-12 rounded-full transition-all duration-700",
              active ? "opacity-100" : "opacity-20 group-hover:opacity-40"
          )} 
        />
        <div 
          style={{ 
              color: color,
              filter: active ? `drop-shadow(0 0 4px ${color})` : 'none'
          }}
          className={cn(
              "flex flex-col items-center gap-0.5 text-[9px] font-bold leading-none tracking-[0.2em] uppercase font-code transition-all duration-500",
              active ? "opacity-100" : "opacity-20 group-hover:opacity-100"
          )}
        >
          {text.split('').map((char, i) => <span key={i}>{char}</span>)}
        </div>
      </div>
    );
}

// --- Center Panel Component ---

function CenterPanel({ track, onUpdateTrack, handleSharedLineGeneration, activeGeneratorBar, setActiveGeneratorBar, activeBarText, setActiveBarText, setFreestyleOpen, album, setSmartStructureOpen, isRhymeLoading, activeSectionId, handleRunRhymeScan, generationOptions, setGenerationOptions, handleAcceptOption, handleUndo, canUndo, isMinimized, setIsMinimized, mobileActive = true, leftCollapsed = false, rightCollapsed = false }: any) {
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'md' | 'lg'>('md');
  const lyricsViewportRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { tooltip, buttonLabel, getCost, getEffectiveCost } = useInkCosts();
  const { toast } = useToast();
  
  const fontSizes = { xs: 'text-[14px]', sm: 'text-[16px]', md: 'text-[24px]', lg: 'text-[36px]' };
  const lineHeights = { xs: '20px', sm: '22px', md: '32px', lg: '40px' };
  const activeLineHeight = lineHeights[fontSize];

  const snapBarTextareaHeight = useCallback(
    (el: HTMLTextAreaElement) => {
      const lineHeightPx = parseInt(lineHeights[fontSize], 10);
      el.style.minHeight = '0px';
      el.style.height = '0px';
      const scrollH = el.scrollHeight;
      // Avoid rounding a single line up to two rows (caused blank gaps between bar numbers)
      const lineCount = Math.max(1, Math.floor((scrollH + lineHeightPx * 0.2) / lineHeightPx));
      const snapped = lineCount * lineHeightPx;
      el.style.height = `${snapped}px`;
      el.style.minHeight = `${lineHeightPx}px`;
    },
    [fontSize]
  );

  const syncHeights = useCallback(() => {
    const run = () => {
      document.querySelectorAll<HTMLTextAreaElement>('textarea[id^="bar-input-"]').forEach(snapBarTextareaHeight);
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => requestAnimationFrame(run));
    }
    window.setTimeout(run, 120);
  }, [snapBarTextareaHeight]);

  useEffect(() => {
    syncHeights();
  }, [fontSize, track.sections, syncHeights, mobileActive, leftCollapsed, rightCollapsed]);

  useEffect(() => {
    const viewport = lyricsViewportRef.current;
    if (!viewport) return;

    let raf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => syncHeights());
    });
    observer.observe(viewport);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [syncHeights]);

  const notebookStyle = {
    backgroundColor: 'transparent',
    backgroundImage: `
      linear-gradient(90deg, transparent var(--lyrics-gutter, 100px), rgba(255, 0, 0, 0.2) var(--lyrics-gutter, 100px), rgba(255, 0, 0, 0.2) calc(var(--lyrics-gutter, 100px) + 1px), transparent calc(var(--lyrics-gutter, 100px) + 1px)),
      repeating-linear-gradient(transparent, transparent ${parseInt(activeLineHeight) - 1}px, rgba(255, 255, 255, 0.08) ${parseInt(activeLineHeight) - 1}px, rgba(255, 255, 255, 0.08) ${activeLineHeight})
    `,
    backgroundSize: `100% ${activeLineHeight}`,
    backgroundAttachment: 'local'
  } as React.CSSProperties;

  const handleDeleteBar = (sId: string, bIdx: number) => {
      onUpdateTrack({
          sections: track.sections.map((s: any) => 
              s.id === sId 
                  ? { ...s, bars: s.bars.filter((b: any) => b.idx !== bIdx).map((b: any, i: number) => ({...b, idx: i + 1})) } 
                  : s
          )
      });
      if (activeGeneratorBar?.sectionId === sId && activeGeneratorBar?.idx === bIdx) {
          setActiveGeneratorBar(null);
          setActiveBarText('');
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent, sId: string, bIdx: number) => {
    const target = e.target as HTMLTextAreaElement;
    const { selectionStart, value } = target;

    if (e.key === 'Enter') {
        e.preventDefault();
        const textBefore = value.slice(0, selectionStart);
        const textAfter = value.slice(selectionStart);

        onUpdateTrack({
            sections: track.sections.map((s: any) => {
                if (s.id !== sId) return s;
                const newBars: any[] = [];
                s.bars.forEach((b: any) => {
                    if (b.idx < bIdx) newBars.push(b);
                    else if (b.idx === bIdx) {
                        newBars.push({ ...b, text: textBefore.trim() });
                        newBars.push(
                          withLineSource(
                            {
                              idx: bIdx + 1,
                              text: textAfter.trim(),
                              accepted: true,
                              syllables: textAfter.trim().split(' ').length,
                              rhymeKey: '?',
                            },
                            'written'
                          )
                        );
                    } else {
                        newBars.push({ ...b, idx: b.idx + 1 });
                    }
                });
                return { ...s, bars: newBars };
            })
        });

        setActiveGeneratorBar({ sectionId: sId, idx: bIdx + 1 });
        setActiveBarText(textAfter.trim());

        setTimeout(() => {
            const nextEl = document.getElementById(`bar-input-${sId}-${bIdx + 1}`) as HTMLTextAreaElement;
            if (nextEl) { 
                nextEl.focus(); 
                nextEl.setSelectionRange(0, 0); 
                syncHeights();
            }
        }, 50);
    } else if (e.key === 'Backspace' && selectionStart === 0 && bIdx > 1) {
        e.preventDefault();
        const section = track.sections.find((s: any) => s.id === sId);
        const prevBar = section.bars.find((b: any) => b.idx === bIdx - 1);
        const mergedText = (prevBar.text || '') + (value || '');
        
        onUpdateTrack({
            sections: track.sections.map((s: any) => 
                s.id === sId 
                    ? { ...s, bars: s.bars.filter((b: any) => b.idx !== bIdx).map((b: any) => b.idx === bIdx - 1 ? { ...b, text: mergedText } : b).map((b: any, i: number) => ({...b, idx: i + 1})) } 
                    : s
            )
        });
        
        setActiveGeneratorBar({ sectionId: sId, idx: bIdx - 1 });
        setActiveBarText(mergedText);
        setTimeout(() => {
            const el = document.getElementById(`bar-input-${sId}-${bIdx - 1}`) as HTMLTextAreaElement;
            if (el) { 
                el.focus(); 
                el.setSelectionRange(prevBar.text.length, prevBar.text.length); 
                syncHeights();
            }
        }, 50);
    }
  };

  const activeBarLabel = useMemo(() => {
    if (!activeGeneratorBar) return 'LINE: 0';
    const section = track.sections.find((s:any) => s.id === activeGeneratorBar.sectionId);
    return `${section?.type?.toUpperCase() || 'LINE'} - LINE: ${activeGeneratorBar.idx}`;
  }, [activeGeneratorBar, track.sections]);

  const ruleBadges = useMemo(() => getWorkstationRuleBadges(track, album), [
    album?.direction,
    track.direction,
    track.vibe,
    track.intentsEnabled,
    track.checkedIntents,
    track.endWith,
    track.guardrails,
    track.styleEnabled,
  ]);

  const handleBarSyncEnter = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (!activeBarText.trim()) return;

          if (!activeGeneratorBar) {
              if (!track.sections || track.sections.length === 0) {
                  const nsId = `section-${Date.now()}`;
                  onUpdateTrack({ 
                      sections: [{ 
                        id: nsId, 
                        type: 'verse', 
                        bars: [
                          withLineSource(
                            {
                              idx: 1,
                              text: activeBarText.trim(),
                              accepted: true,
                              syllables: activeBarText.trim().split(' ').length,
                              rhymeKey: '?',
                            },
                            'written'
                          ),
                        ], 
                      }] 
                  });
                  setActiveGeneratorBar({ sectionId: nsId, idx: 1 });
              } else {
                  const section = track.sections[0];
                  const newIdx = section.bars.length + 1;
                  const nextSections = track.sections.map((s:any) =>
                    s.id === section.id
                      ? {
                          ...s,
                          bars: [
                            ...s.bars,
                            withLineSource(
                              {
                                idx: newIdx,
                                text: activeBarText.trim(),
                                accepted: true,
                                syllables: activeBarText.trim().split(' ').length,
                                rhymeKey: '?',
                              },
                              'written'
                            ),
                          ],
                        }
                      : s
                  );
                  onUpdateTrack({ sections: markBarAnchorGlow(nextSections, section.id, newIdx) });
                  setActiveGeneratorBar({ sectionId: section.id, idx: newIdx });
              }
              setActiveBarText('');
              syncHeights();
              return;
          }

          const section = track.sections.find((s:any) => s.id === activeGeneratorBar.sectionId);
          if (section) {
              const nextIdx = activeGeneratorBar.idx + 1;
              const nextSections = track.sections.map((s:any) => s.id === section.id ? { ...s, bars: [...s.bars, { idx: nextIdx, text: '', accepted: true, syllables: 0, rhymeKey: '?' }] } : s);
              onUpdateTrack({ sections: markBarAnchorGlow(nextSections, section.id, nextIdx) });
              setActiveGeneratorBar({ sectionId: section.id, idx: nextIdx });
              setActiveBarText('');
              setTimeout(() => {
                  const el = document.getElementById(`bar-input-${section.id}-${nextIdx}`) as HTMLTextAreaElement;
                  if (el) { el.focus(); syncHeights(); }
              }, 50);
          }
      }
  }

  const handleOpenFreestyle = () => {
    if (user?.subscriptionStatus !== 'active') return;
    setFreestyleOpen(true);
  };

  return (
        <div className={cn("flex flex-1 flex-col min-w-0 basis-0 h-full relative overflow-hidden", mobileLyricsPanelClass(mobileActive))}>
      <div className="h-14 max-md:h-auto max-md:min-h-[3.25rem] max-md:py-1.5 px-2 max-md:px-2 md:px-4 flex flex-row items-center gap-2 bg-card z-20 border-b shrink-0 min-w-0 max-md:overflow-x-auto max-md:overflow-y-hidden md:overflow-hidden studio-scrollbar">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
            <Hint
              skipOnTouch
              side="bottom"
              content={<p className="text-[10px] font-bold">{tooltip('analyzeStructure')}</p>}
            >
              <Button variant="outline" size="sm" data-tour="smart-structure" className="h-8 max-md:px-2 max-md:text-[9px] px-3 font-bold text-[10px] md:text-xs uppercase tracking-widest border-border/40 hover:bg-primary/5 text-muted-foreground hover:text-primary shrink-0" onClick={() => setSmartStructureOpen(true)}>
                  <span className="max-md:hidden truncate max-w-[10rem]">{buttonLabel('analyzeStructure')}</span>
                  <span className="md:hidden">Paste</span>
              </Button>
            </Hint>
        </div>
        <div className="flex flex-1 min-w-0 items-center justify-end gap-2 max-md:flex-nowrap overflow-x-auto studio-scrollbar">
          <div className="flex items-center gap-1.5 md:gap-2 bg-muted/40 px-2 py-1 rounded-full border border-border/40 shrink-0">
             <div className="flex items-center gap-1 md:gap-1.5">
                <Hint
                  skipOnTouch
                  side="bottom"
                  content={<p className="text-[10px] font-bold uppercase">Undo Last Action</p>}
                >
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-all disabled:opacity-20 shrink-0"
                      onClick={handleUndo}
                      disabled={!canUndo}
                  >
                      <Undo2 className="h-4 w-4" />
                  </Button>
                </Hint>
                <div className="w-px h-4 bg-border/40 hidden lg:block shrink-0" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground hidden xl:inline shrink-0">Rhyme Focus</span>
                <Switch 
                  checked={track.rhymeHighlightingEnabled} 
                  onCheckedChange={(c) => onUpdateTrack({ rhymeHighlightingEnabled: c })} 
                  className="scale-75 shrink-0"
                />
                <div className="w-px h-4 bg-border/40 shrink-0" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground hidden xl:inline shrink-0">Rhyme Pulse</span>
                <Hint
                  skipOnTouch
                  side="bottom"
                  content={<p className="text-[10px] font-bold">{tooltip('findRhymes')}</p>}
                >
                  <div data-tour="rhyme-pulse" className="inline-flex shrink-0">
                  <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                          "rounded-full h-8 w-8 p-0 transition-all active:scale-90 bg-background border-primary/40 hover:bg-primary/5 group shadow-lg flex items-center justify-center shrink-0",
                          isRhymeLoading && "animate-pulse"
                      )}
                      onClick={handleRunRhymeScan}
                      disabled={isRhymeLoading}
                  >
                      {isRhymeLoading ? <RefreshCw className="h-4 w-4 animate-spin text-primary" /> : <Target className="h-4 w-4 text-primary" />}
                  </Button>
                  </div>
                </Hint>
                <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-bold border-primary/20 text-primary shrink-0 leading-none whitespace-nowrap">{getEffectiveCost('findRhymes')} INK</Badge>
             </div>
          </div>
          <ToggleGroup
            type="single"
            value={fontSize}
            onValueChange={(val) => val && setFontSize(val as 'xs' | 'sm' | 'md' | 'lg')}
            className="flex bg-muted/40 border border-border/40 rounded-lg p-0.5 shrink-0 max-md:max-w-[min(42vw,11rem)] max-md:overflow-x-auto max-md:studio-scrollbar"
            aria-label="Lyrics text size"
          >
            <ToggleGroupItem value="xs" className="h-7 w-6 max-md:h-6 max-md:w-5 text-[9px] font-bold px-0" aria-label="Smaller text">T</ToggleGroupItem>
            <ToggleGroupItem value="sm" className="h-7 w-6 max-md:h-6 max-md:w-5 text-[10px] font-bold px-0" aria-label="Small text">T</ToggleGroupItem>
            <ToggleGroupItem value="md" className="h-7 w-6 max-md:h-6 max-md:w-5 text-sm font-bold px-0" aria-label="Medium text">T</ToggleGroupItem>
            <ToggleGroupItem value="lg" className="h-7 w-7 max-md:h-6 max-md:w-6 text-lg font-bold px-0" aria-label="Large text">T</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      
      <div id="lyrics-viewport" ref={lyricsViewportRef} data-tour="lyrics-sheet" className="flex-1 relative overflow-x-hidden overflow-y-auto min-h-0 studio-scrollbar max-md:[--lyrics-gutter:2rem]" style={notebookStyle}>
        <div className="w-full max-full pb-12">
          {!track.sections || track.sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-center gap-6 animate-in fade-in zoom-in duration-1000">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-2xl">
                      <NotebookPen className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline text-3xl font-bold uppercase tracking-tight text-white">Initialize Studio</h3>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Select a section in the left panel to begin your sheet.</p>
                  </div>
              </div>
          ) : (
            (track.sections || []).map((section: any) => (
                <div key={section.id} className="relative">
                <div id={`section-header-${section.id}`} style={{ height: `calc(${activeLineHeight} * 2)` }} className="flex items-end pl-[120px] max-md:pl-[2rem]">
                    <h3 className="text-lg md:text-2xl font-headline font-bold text-sky-400 uppercase leading-none">[{section.type}]</h3>
                </div>
                {(section.bars || []).map((bar: any) => {
                    const isSelected = activeGeneratorBar?.sectionId === section.id && activeGeneratorBar?.idx === bar.idx;
                    return (
                        <div key={`${section.id}-${bar.idx}`} className={cn("group relative flex max-md:flex-row md:block items-start transition-colors max-md:px-1", isSelected && "bg-primary/10", bar.justGenerated && "animate-line-glow")}>
                        <span className={cn(
                          "font-mono text-muted-foreground/40 text-right font-bold shrink-0 z-10",
                          "max-md:relative max-md:w-7 max-md:mr-0.5 max-md:text-[10px]",
                          "md:absolute md:left-[50px] md:w-10 md:text-muted-foreground/30",
                          fontSizes[fontSize]
                        )} style={{ lineHeight: activeLineHeight }}>{String(bar.idx).padStart(2, '0')}</span>
                        
                        <div className={cn(
                          "absolute right-1 md:right-4 top-0 h-full flex items-center gap-0.5 transition-opacity z-20",
                          isSelected ? "opacity-100" : "max-md:opacity-0 max-md:pointer-events-none",
                          !isSelected && "md:opacity-0 md:group-hover:opacity-100"
                        )}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-primary hover:bg-primary/10" onClick={(e) => handleSharedLineGeneration('next', e, section.id, bar.idx)}><ArrowDown className="h-3.5 w-3.5 md:h-4 md:w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-primary hover:bg-primary/10" onClick={(e) => handleSharedLineGeneration('previous', e, section.id, bar.idx)}><ArrowUp className="h-3.5 w-3.5 md:h-4 md:w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBar(section.id, bar.idx)}><Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4"/></Button>
                        </div>

                        <div className="flex-grow flex items-start min-w-0 h-full max-md:flex-1 relative overflow-hidden">
                            <textarea 
                            id={`bar-input-${section.id}-${bar.idx}`} 
                            value={bar.text} 
                            rows={1}
                            onKeyDown={(e) => handleKeyDown(e, section.id, bar.idx)}
                            onChange={(e: any) => { 
                                const text = e.target.value;
                                snapBarTextareaHeight(e.target);
                                onUpdateTrack({
                                  sections: track.sections.map((s: any) =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          bars: s.bars.map((b: any) =>
                                            b.idx === bar.idx
                                              ? withLineSource(
                                                  {
                                                    ...b,
                                                    text,
                                                    accepted: true,
                                                    syllables: text.trim().split(' ').length,
                                                  },
                                                  'written'
                                                )
                                              : b
                                          ),
                                        }
                                      : s
                                  ),
                                });
                                setActiveBarText(text); 
                            }} 
                            onFocus={(e: any) => { 
                                setActiveGeneratorBar({ sectionId: section.id, idx: bar.idx }); 
                                setActiveBarText(bar.text || '');
                                snapBarTextareaHeight(e.target);
                            }} 
                            className={cn(
                                "border-0 bg-transparent p-0 focus-visible:ring-0 font-code font-bold w-full shadow-none z-10 tracking-normal resize-none overflow-hidden whitespace-pre-wrap break-words",
                                "max-md:pl-1 max-md:pr-12 max-md:indent-0",
                                "md:pr-24 md:pl-[145px] md:-indent-[25px]",
                                "antialiased text-rendering-geometric",
                                fontSizes[fontSize]
                            )} 
                            style={{ minHeight: activeLineHeight, lineHeight: activeLineHeight, fontVariantLigatures: 'none' }}
                            placeholder="..." 
                            />
                            {track.rhymeHighlightingEnabled && bar.text && (
                            <div className="absolute inset-0 pointer-events-none flex items-start pl-0 max-md:pl-1 md:pl-0 pr-12 md:pr-24 z-0 h-full overflow-hidden">
                                <p className={cn(
                                    "font-code font-bold tracking-normal whitespace-pre-wrap break-words w-full text-transparent m-0",
                                    "max-md:indent-0",
                                    "md:pl-[145px] md:-indent-[25px]",
                                    "antialiased text-rendering-geometric",
                                    fontSizes[fontSize]
                                )} style={{ lineHeight: activeLineHeight, fontVariantLigatures: 'none' }}>
                                    <HighlightedText text={bar.text} rhymeGroups={track.rhymeGroups || []} transparent={true} />
                                </p>
                            </div>
                            )}
                        </div>
                        </div>
                    );
                    })}
                </div>
            ))
          )}
        </div>
      </div>

      <div data-tour="bar-workstation" className={cn("bg-card border-t shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0 z-[40] relative w-full min-w-0 overflow-hidden", isMinimized ? "h-10" : "h-[115px] max-md:h-auto max-md:max-h-[38dvh] max-md:overflow-y-auto max-md:studio-scrollbar")}>
        <div className="w-full min-w-0 h-full px-2 md:px-4 lg:px-6 flex flex-col justify-start pt-2 pb-2 gap-1 overflow-hidden">
            <div className="flex flex-row items-center justify-between gap-2 border-b border-white/5 shrink-0 h-6 min-w-0">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0 overflow-hidden">
                    <h4 className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] text-primary flex items-center gap-1 shrink-0 leading-none whitespace-nowrap"><Zap className="h-3 w-3 shrink-0" /> BAR WS</h4>
                    <Hint
                      side="top"
                      className="max-w-[240px] text-[9px] leading-snug"
                      content={
                        <>AI suggestions are assistive only — review before use. See Terms of Service (§5) for full AI &amp; content policies.</>
                      }
                    >
                      <button type="button" className="text-muted-foreground/40 hover:text-muted-foreground shrink-0 touch-manipulation" aria-label="AI disclaimer">
                        <Info className="h-3 w-3" />
                      </button>
                    </Hint>
                    <span className="text-muted-foreground font-code text-[8px] md:text-[9px] font-bold tracking-widest uppercase min-w-0 truncate leading-none">{activeBarLabel}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0 shrink">
                    <div className="flex items-center gap-1 overflow-x-auto studio-scrollbar flex-nowrap max-w-[min(52vw,14rem)] md:max-w-[min(40vw,18rem)] lg:max-w-none">
                        {ruleBadges.map(b => (
                          <Badge key={b.id} variant="outline" className={cn("text-[7px] font-bold uppercase h-4 px-1.5 leading-none whitespace-nowrap shrink-0 max-w-[4.25rem] truncate bg-background/20", b.color, b.id === 'END WITH' && "animate-pulse")}>{b.id}</Badge>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0" onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            {!isMinimized && (
                <div className="flex max-md:flex-col md:flex-row md:items-center gap-2 mt-1 min-h-0 min-w-0 flex-1 overflow-hidden">
                    {generationOptions ? (
                        <div className="flex-grow flex max-md:flex-col md:flex-row gap-2 animate-in fade-in slide-in-from-bottom-4 min-h-0 min-w-0 py-0.5 w-full overflow-hidden">
                            {generationOptions.map((opt, i) => (
                                <Button 
                                    key={i} 
                                    variant="outline" 
                                    className="flex-1 min-w-0 h-14 py-1 px-2 md:px-4 font-bold bg-primary/10 border-primary/40 hover:bg-primary/20 text-white text-left justify-start gap-2 group border-2 shadow-2xl transition-all w-full"
                                    onClick={() => handleAcceptOption(opt.line)}
                                >
                                    <div className="flex flex-col gap-0.5 shrink-0 border-r border-white/10 pr-2">
                                        <Badge className="bg-primary text-[8px] h-4 px-1 uppercase leading-none whitespace-nowrap">Opt {i+1}</Badge>
                                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter leading-none">{opt.syllables} SYLL</span>
                                    </div>
                                    <span className="text-xs md:text-sm leading-tight tracking-tight flex-1 min-w-0 break-words line-clamp-2">{opt.line}</span>
                                </Button>
                            ))}
                            <Button variant="ghost" size="icon" onClick={() => setGenerationOptions(null)} className="h-10 w-10 md:h-14 md:w-10 shrink-0 text-muted-foreground hover:text-red-500 bg-white/5 border border-white/10 rounded-lg">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex max-md:flex-col md:flex-row md:items-center gap-2 min-w-0 w-full flex-1 overflow-hidden">
                            <textarea 
                                placeholder="Tap to edit active line..."
                                value={activeBarText} 
                                onKeyDown={handleBarSyncEnter}
                                onChange={(e: any) => { 
                                    setActiveBarText(e.target.value); 
                                    if (activeGeneratorBar) onUpdateTrack({ sections: track.sections.map((s: any) => s.id === activeGeneratorBar.sectionId ? { ...s, bars: s.bars.map((b: any) => b.idx === activeGeneratorBar.idx ? { ...b, text: e.target.value } : b) } : s) }); 
                                }} 
                                className="bg-background/40 border border-white/10 w-full md:flex-1 md:min-w-[5rem] px-3 py-2 font-code font-bold text-sm shadow-inner rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 tracking-tight resize-none h-14 max-h-14 shrink-0 min-w-0" 
                            />
                            <div className={cn(
                              "flex flex-row flex-nowrap items-center gap-1.5 shrink-0 min-w-0 max-md:w-full overflow-x-auto studio-scrollbar md:overflow-visible md:max-w-[min(100%,22rem)] lg:max-w-none",
                              !activeGeneratorBar && "max-md:hidden"
                            )}>
                                <Hint skipOnTouch content={<p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p>}>
                                  <Button variant="outline" size="sm" aria-label="Generate next line" className="h-10 md:h-14 px-2 md:px-3 font-bold text-[10px] uppercase border-border/40 gap-1 shadow-lg shrink-0" onClick={(e) => handleSharedLineGeneration('next', e)}>
                                      <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="hidden sm:inline truncate">Next</span>
                                  </Button>
                                </Hint>
                                <Hint skipOnTouch content={<p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p>}>
                                  <Button variant="outline" size="sm" aria-label="Generate previous line" className="h-10 md:h-14 px-2 md:px-3 font-bold text-[10px] uppercase border-border/40 gap-1 shadow-lg shrink-0" onClick={(e) => handleSharedLineGeneration('previous', e)}>
                                      <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="hidden sm:inline truncate">Prev</span>
                                  </Button>
                                </Hint>
                                <Button variant="outline" size="sm" aria-label="Delete line" className="h-10 md:h-14 w-10 md:w-11 font-bold border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 shadow-lg shrink-0 px-0" onClick={() => { if(activeGeneratorBar) handleDeleteBar(activeGeneratorBar.sectionId, activeGeneratorBar.idx); }}><Trash2 className="h-4 w-4 mx-auto" /></Button>
                                {user?.subscriptionStatus === 'active' ? (
                                  <Button variant="secondary" size="sm" aria-label="Freestyle recording" className="h-10 md:h-14 px-2 md:px-4 font-bold text-[10px] uppercase tracking-wide gap-1 bg-primary/20 text-primary border border-primary/20 shadow-lg shrink-0 min-w-0" onClick={handleOpenFreestyle} title={tooltip('freestyleTranscription')}>
                                    <Mic className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate hidden md:inline">Free</span>
                                  </Button>
                                ) : (
                                  <UpgradeTooltip
                                    feature="Freestyle Recording"
                                    benefit="Capture voice memos and drop transcribed bars onto your sheet in the flow."
                                    example="Record a 30-second freestyle and paste the bars mid-verse without leaving the workstation."
                                  >
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      type="button"
                                      aria-label="Freestyle recording — Studio Pro"
                                      className={cn('h-10 md:h-14 px-2 md:px-4 font-bold text-[10px] uppercase tracking-wide gap-1 shadow-lg shrink-0 min-w-0', proLockShell('md'), proLockText())}
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      <Lock className={cn('h-3.5 w-3.5 shrink-0', proLockIcon())} />
                                      <span className="truncate hidden md:inline">Free</span>
                                    </Button>
                                  </UpgradeTooltip>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

// --- Right Panel Component ---

function RightPanel({ track, album, onUpdateTrack, styleProfile, updateStyleProfile, scratchPadRef, activeSectionId, rightCollapsed, onCollapse, improveStyleOpen, setImproveStyleOpen, styleVaultOpen, setStyleVaultOpen, handleSharedLineGeneration, updateAlbum, clearStyleProfile, setSaveStyleNamingOpen, isPro, sectionOpen, onSectionChange, mobileActive = false }: any) {
  const { tooltip, buttonLabel } = useInkCosts();
  const activeSection = track.sections.find((s:any) => s.id === activeSectionId);
  const { toast } = useToast();
  const [dnaVaultOpen, setDNAVaultOpen] = useState(false);
  const [vibeVaultOpen, setVibeVaultOpen] = useState(false);
  const [archivalDialog, setArchivalDialog] = useState<{ open: boolean, type: 'DNA' | 'Vibe' }>({ open: false, type: 'DNA' });
  const [editIntentDialog, setEditIntentDialog] = useState<{ open: boolean, intent: string }>({ open: false, intent: '' });
  const [newIntent, setNewIntent] = useState('');

  const currentMetrics = styleProfile?.history[0]?.metrics;

  const handleToggleDNA = (enabled: boolean) => {
    onUpdateTrack({ direction: { ...track.direction, enabled } });
  };

  const handleDNAFieldUpdate = (field: keyof Direction, value: string) => {
      onUpdateTrack({ direction: { ...(track.direction || {}), [field]: value } });
  };

  const handleIntentCheck = (intent: string, checked: boolean) => {
      const current = track.checkedIntents || [];
      let updated = checked ? [...current, intent] : current.filter(i => i !== intent);
      
      const updates: Partial<Track> = { 
        checkedIntents: updated,
        intentsEnabled: updated.length > 0 ? (track.intentsEnabled ?? true) : false
      };
      
      if (!checked && track.endWith === intent) {
          updates.endWith = null;
      }
      onUpdateTrack(updates);
  };

  const handleIntentPrecisionLock = (intent: string) => {
      if (track.endWith === intent) {
          onUpdateTrack({ endWith: null });
          toast({ title: "Precision Lock Removed" });
          return;
      }
      const currentChecked = track.checkedIntents || [];
      const updatedChecked = Array.from(new Set([...currentChecked, intent]));
      onUpdateTrack({ endWith: intent, checkedIntents: updatedChecked, intentsEnabled: true });
      toast({ title: "Precision Lock Active", description: `Synthesizer forced to end with: "${intent}"` });
  };

  const handleAddIntent = () => {
    if (!newIntent.trim() || !album) return;
    const existing = album.thingsToSay || [];
    updateAlbum(album.id, { thingsToSay: [...existing, newIntent.trim()] });
    setNewIntent('');
    toast({ title: "Intent Added" });
  };

  const handleConfirmEditIntent = (newValue: string) => {
      if (!album) return;
      const oldIntent = editIntentDialog.intent;
      const updated = (album.thingsToSay || []).map(i => i === oldIntent ? newValue : i);
      updateAlbum(album.id, { thingsToSay: updated });
      if (track.endWith === oldIntent) onUpdateTrack({ endWith: newValue });
      toast({ title: "Motif Updated" });
  };

  const handleDeleteIntent = (intent: string) => {
      if (!album) return;
      const updatedThings = (album.thingsToSay || []).filter(i => i !== intent);
      updateAlbum(album.id, { thingsToSay: updatedThings });
      
      const updatedChecked = (track.checkedIntents || []).filter(i => i !== intent);
      const updates: Partial<Track> = { 
        checkedIntents: updatedChecked,
        intentsEnabled: updatedChecked.length > 0 ? (track.intentsEnabled ?? true) : false
      };
      if (track.endWith === intent) updates.endWith = null;
      onUpdateTrack(updates);
      toast({ title: "Motif Deleted" });
  };

  const handleConfirmSaveDNA = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Archive custom DNA strains with Studio Pro.' });
        return;
      }
      if (!album) return;
      const profile = buildDnaPresetFromDirection({
          name,
          sourceTrackTitle: track.title,
          direction: track.direction ?? { enabled: true },
          intents: track.checkedIntents,
      });
      const existing = album.dnaPresets || [];
      updateAlbum(album.id, { dnaPresets: [...existing, profile] });
      toast({ title: "DNA Archived", description: `"${name}" saved to vault.` });
      void postGamificationEvent('dna_preset_saved');
  };

  const handleConfirmSaveVibe = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Save vibe presets with Studio Pro.' });
        return;
      }
      if (!track.vibe) return;
      const preset = { ...track.vibe, name };
      const existing = track.vibePresets || [];
      onUpdateTrack({ vibePresets: [...existing, preset] });
      toast({ title: "Vibe Preset Saved", description: `"${name}" added to vault.` });
  };

  if (rightCollapsed && !mobileActive) {
    return (
        <div className={cn("flex flex-col items-center h-full bg-card border-l w-[56px] shrink-0 overflow-hidden py-6 z-30", mobileLyricsPanelClass(mobileActive, 'right'))}>
            <NeuralStripItem text="DNA" color="#10b981" active={isTrackDnaActive(track) || isAlbumDnaActive(track, album)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="VIBE" color="#f59e0b" active={isVibeActive(track)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="INTENT" color="#0ea5e9" active={isIntentsActive(track)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="GUARD" color="#f43f5e" active={isGuardrailsActive(track)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="STYLE" color="#d946ef" active={isStyleActive(track)} onClick={() => onCollapse(false)} />
        </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-card border-l relative overflow-hidden w-[340px] shrink-0 z-30", mobileLyricsPanelClass(mobileActive, 'right'))}>
      <div className={cn("flex items-center justify-between p-4 border-b shrink-0 h-14", mobileActive && "justify-center")}>
        {!mobileActive && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCollapse(true)}><PanelRightClose className="h-4 w-4" /></Button>
        )}
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground">Co-Writer Panel</h3>
        {mobileActive && <span className="w-8 shrink-0 md:hidden" aria-hidden />}
      </div>
      <div className="flex-grow overflow-y-auto studio-scrollbar">
        <div className="p-4 space-y-4 pb-32">
          
          <Collapsible open={sectionOpen.dna} onOpenChange={(o) => onSectionChange('dna', o)} className="space-y-1">
            <Card className="border-green-500/30 bg-green-500/5" data-tour="dna-suite">
                <div className="p-4 flex flex-row items-center justify-between space-y-0">
                    <CollapsibleTrigger asChild>
                        <div className="space-y-0.5 cursor-pointer flex-grow min-w-0 overflow-hidden min-w-0 overflow-hidden">
                            <CardTitle className="text-sm flex items-center gap-2 text-green-500 font-headline uppercase leading-none truncate"><Dna className="h-4 w-4 shrink-0" /> DNA Suite</CardTitle>
                            <p className="text-[8px] text-green-600/60 font-bold uppercase tracking-widest leading-none truncate">Creative Direction Questions</p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); setArchivalDialog({ open: true, type: 'DNA' }); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton
                            feature="DNA Archive"
                            benefit="Save your own DNA strains to the vault. Free artists load from 2 system presets."
                            example='Example: save "Chicago Noir DNA" once, load it on every track in the album.'
                          />
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); setDNAVaultOpen(true); }}><FolderOpen className="h-4 w-4" /></Button>
                        <Switch checked={track.direction?.enabled ?? true} onCheckedChange={handleToggleDNA} />
                    </div>
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-3 px-4 pb-4 font-code">
                        <div className="flex items-center justify-between py-1 border-b border-green-500/10">
                            <span className="text-[9px] font-bold text-green-700 uppercase">Inherit From Album</span>
                            <Switch 
                                checked={track.direction?.inheritFromAlbum ?? true} 
                                onCheckedChange={(c) => onUpdateTrack({ direction: { ...track.direction, inheritFromAlbum: c } })}
                                className="scale-75"
                            />
                        </div>
                        {[
                            { id: 'setting_world', label: '1. Setting / World', placeholder: 'It takes place in ____.' },
                            { id: 'emotion_core', label: '2. Emotion / Core', placeholder: 'It feels like ____.' },
                            { id: 'trigger_moment', label: '3. Trigger Moment', placeholder: 'Everything changed when ____.' },
                            { id: 'message_truth', label: '4. Message / Truth', placeholder: 'Deep down, it’s really about ____.' },
                            { id: 'tone_palette', label: '5. Tone / Palette', placeholder: 'It sounds/looks like ____.' }
                        ].map(f => (
                            <div key={f.id} className="space-y-1">
                                <Label className="text-[9px] font-bold uppercase text-green-700/70">{f.label}</Label>
                                <textarea 
                                    placeholder={f.placeholder} 
                                    className="w-full bg-background/40 border border-green-500/10 rounded-md p-2 text-[11px] studio-scrollbar resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-green-500/30" 
                                    style={{ minHeight: '40px' }}
                                    value={track.direction?.[f.id as keyof Direction] as string || ''}
                                    onChange={(e:any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                        handleDNAFieldUpdate(f.id as any, e.target.value);
                                    }}
                                    onFocus={(e:any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />
                            </div>
                        ))}
                    </CardContent>
                </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={sectionOpen.vibe} onOpenChange={(o) => onSectionChange('vibe', o)} className="space-y-1">
            <Card className="border-amber-500/30 bg-amber-500/5">
                <div className="p-4 flex flex-row items-center justify-between space-y-0">
                    <CollapsibleTrigger asChild>
                        <div className="space-y-0.5 cursor-pointer flex-grow min-w-0 overflow-hidden">
                            <CardTitle className="text-sm flex items-center gap-2 text-amber-500 font-headline uppercase leading-none truncate"><Palette className="h-4 w-4 shrink-0" /> Track Vibe</CardTitle>
                            <p className="text-[8px] text-amber-600/60 font-bold uppercase tracking-widest leading-none truncate">Instrumentation & Atmosphere</p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600 hover:bg-amber-500/10" onClick={(e) => { e.stopPropagation(); setArchivalDialog({ open: true, type: 'Vibe' }); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton
                            feature="Vibe Archive"
                            benefit="Save custom track vibes. Free artists load from 2 system vibe presets."
                            example="Example: save your 90 BPM lofi-hop vibe and reload it on the next song."
                          />
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600 hover:bg-amber-500/10" onClick={(e) => { e.stopPropagation(); setVibeVaultOpen(true); }}><FolderOpen className="h-4 w-4" /></Button>
                        <Switch checked={track.vibe?.enabled ?? true} onCheckedChange={(c) => onUpdateTrack({ vibe: { ...track.vibe, enabled: c } })} />
                    </div>
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-3 px-4 pb-4 font-code">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-bold uppercase text-amber-700/70">Genre</Label>
                                <Input 
                                    value={track.vibe.genre} 
                                    onChange={(e) => onUpdateTrack({ vibe: { ...track.vibe, genre: e.target.value } })}
                                    className="h-8 text-[11px] bg-background/40 border-amber-500/10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-bold uppercase text-amber-700/70">BPM</Label>
                                <Input 
                                    type="number" 
                                    value={track.vibe.tempoBPM} 
                                    onChange={(e) => onUpdateTrack({ vibe: { ...track.vibe, tempoBPM: parseInt(e.target.value) || 90 } })}
                                    className="h-8 text-[11px] bg-background/40 border-amber-500/10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-amber-700/70">Instrumentation</Label>
                            <div className="relative group/instr">
                                <textarea 
                                    placeholder="Atmospheric pads, 808s..."
                                    value={track.vibe.instrumentation || ''}
                                    onChange={(e: any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                        onUpdateTrack({ vibe: { ...track.vibe, instrumentation: e.target.value } });
                                    }}
                                    onFocus={(e: any) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    className="w-full bg-background/40 border border-amber-500/10 rounded-md p-2 pr-8 text-[11px] studio-scrollbar resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                                    style={{ minHeight: '60px' }}
                                />
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/instr:opacity-100 transition-opacity bg-background/60 hover:bg-background"
                                    onClick={() => {
                                        navigator.clipboard.writeText(track.vibe.instrumentation || '');
                                        toast({ title: "Copied to clipboard" });
                                    }}
                                >
                                    <Copy className="h-3 w-3 text-amber-600" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={sectionOpen.intents} onOpenChange={(o) => onSectionChange('intents', o)} className="space-y-1">
            <Card className="border-sky-500/30 bg-[#0c1a26] shadow-xl overflow-hidden p-0">
                <div className="flex items-center justify-between p-4 pb-2">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CollapsibleTrigger asChild>
                            <div className="space-y-1 cursor-pointer flex-grow min-w-0 overflow-hidden text-left">
                              <div className="flex items-center gap-2 min-w-0">
                                  <Target className="h-5 w-5 text-sky-400 shrink-0" />
                                  <h3 className="font-headline font-bold text-xl text-sky-400 uppercase tracking-tighter truncate">Intents</h3>
                              </div>
                              <p className="text-[9px] text-muted-foreground leading-snug font-code normal-case tracking-normal truncate">
                                Punchlines and lines to weave into this track.
                              </p>
                            </div>
                          </CollapsibleTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[260px] space-y-1">
                          <p className="text-[10px] font-bold leading-snug">Intents (motifs)</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            Motifs are punchlines or lines you want in the song. Add as many as you need — check any combination. To end the next line exactly as written, press the middle arrow on that motif.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex items-center gap-4">
                        <Switch checked={track.intentsEnabled ?? (track.checkedIntents?.length > 0)} onCheckedChange={(c) => onUpdateTrack({ intentsEnabled: c })} />
                        <CollapsibleTrigger asChild><ChevronDown className="h-4 w-4 text-sky-500/40 cursor-pointer" /></CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-4 p-4 pt-4 min-w-0">
                        <div className="space-y-2 min-w-0">
                            {(album?.thingsToSay || []).map((intent: string) => {
                                const isLocked = track.endWith === intent;
                                const isChecked = (track.checkedIntents || []).includes(intent);
                                return (
                                    <div key={intent} className={cn(
                                        "flex items-start gap-2 sm:gap-3 p-3 rounded-lg border transition-all group min-w-0 overflow-hidden",
                                        isLocked ? "bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.1)]" : "bg-[#142633] border-white/5 hover:bg-[#1a3040]"
                                    )}>
                                        <Checkbox 
                                            checked={isChecked || isLocked} 
                                            onCheckedChange={(c) => handleIntentCheck(intent, !!c)} 
                                            className="border-sky-500 data-[state=checked]:bg-sky-500 shrink-0 mt-0.5"
                                        />
                                        <span className={cn(
                                            "text-xs font-code flex-1 min-w-0 whitespace-normal break-words leading-snug",
                                            isLocked ? "text-sky-300 font-bold" : "text-white/70"
                                        )}>{intent}</span>
                                        <TooltipProvider delayDuration={300}>
                                            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 flex-none self-start sm:self-center">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-sky-400/40 hover:text-sky-400 hover:bg-sky-500/10" onClick={(e) => { e.stopPropagation(); setEditIntentDialog({ open: true, intent }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-[240px] space-y-1">
                                                        <p className="text-[10px] font-bold leading-snug">Edit motif</p>
                                                        <p className="text-[10px] text-muted-foreground leading-snug">Rename or refine this phrase for the whole album. Updates apply everywhere the motif appears.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className={cn("h-7 w-7 transition-colors", isLocked ? "text-sky-400" : "text-sky-400/40 hover:text-sky-400 hover:bg-sky-500/10")}
                                                            onClick={(e) => { e.stopPropagation(); handleIntentPrecisionLock(intent); }}
                                                        >
                                                            <ArrowUpRight className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-[240px] space-y-1">
                                                        <p className="text-[10px] font-bold leading-snug">{isLocked ? 'Release Precision Lock' : 'Precision Lock'}</p>
                                                        <p className="text-[10px] text-muted-foreground leading-snug">
                                                            {isLocked
                                                                ? 'The synthesizer is forced to end its next suggestion on this phrase. Click again to release the lock.'
                                                                : 'Force the next suggestion to land exactly on this motif — ideal for hooks and punchlines. Also checks the motif for this track.'}
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDeleteIntent(intent); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-[240px] space-y-1">
                                                        <p className="text-[10px] font-bold leading-snug">Delete motif</p>
                                                        <p className="text-[10px] text-muted-foreground leading-snug">Remove from the album vault and clear it from this track&apos;s checked list and any active lock.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TooltipProvider>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <Input 
                                placeholder="New motif..." 
                                className="h-9 bg-background/40 border-sky-500/10 text-xs font-code" 
                                value={newIntent}
                                onChange={(e) => setNewIntent(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddIntent()}
                            />
                            <Button size="sm" className="h-9 px-3 bg-sky-600 hover:bg-sky-700" onClick={handleAddIntent}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={sectionOpen.guardrails} onOpenChange={(o) => onSectionChange('guardrails', o)} className="space-y-1">
            <Card className="border-rose-500/30 bg-rose-500/5">
                <CollapsibleTrigger asChild>
                    <CardHeader className="p-4 flex-row items-center justify-between cursor-pointer space-y-0">
                        <div className="space-y-0.5">
                            <CardTitle className="text-sm flex items-center gap-2 text-rose-500 font-headline uppercase leading-none"><Shield className="h-4 w-4" /> Guardrails</CardTitle>
                            <p className="text-[8px] text-rose-600/60 font-bold uppercase tracking-widest leading-none truncate">Content Restrictions</p>
                        </div>
                        <Switch checked={track.guardrails?.enabled ?? true} onCheckedChange={(c) => onUpdateTrack({ guardrails: { ...track.guardrails, enabled: c } })} onClick={(e) => e.stopPropagation()} />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-3 px-4 pb-4 font-code">
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-rose-800/70">Negative Prompt (Avoid)</Label>
                            <Textarea 
                                placeholder="e.g. violence, generic love cliches..." 
                                className="text-[10px] bg-background/50 border-rose-500/10 min-h-[40px]" 
                                defaultValue={track.guardrails?.negativePrompt}
                                onBlur={(e) => onUpdateTrack({ guardrails: { ...track.guardrails, negativePrompt: e.target.value } })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-rose-800/70">Forbidden Words</Label>
                            <Input 
                                placeholder="Must be separated by comma" 
                                className="h-8 text-[10px] bg-background/50 border-rose-500/10" 
                                defaultValue={(track.guardrails?.forbiddenWords || []).join(', ')}
                                onBlur={(e) => onUpdateTrack({ guardrails: { ...track.guardrails, forbiddenWords: e.target.value.split(',').map(w => w.trim()).filter(Boolean) } })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-rose-800/70">Must-Include Words</Label>
                            <Input 
                                placeholder="Must include specific phrase" 
                                className="h-8 text-[10px] bg-background/50 border-rose-500/10" 
                                defaultValue={(track.guardrails?.mustIncludeWords || []).join(', ')}
                                onBlur={(e) => onUpdateTrack({ guardrails: { ...track.guardrails, mustIncludeWords: e.target.value.split(',').map(w => w.trim()).filter(Boolean) } })}
                            />
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={sectionOpen.coWriter} onOpenChange={(o) => onSectionChange('coWriter', o)} className="space-y-1">
            <Card className="border-fuchsia-500/30 bg-fuchsia-500/5 shadow-xl">
                <div className="p-4 flex flex-row items-center justify-between space-y-0">
                    <CollapsibleTrigger asChild>
                        <div className="space-y-0.5 cursor-pointer flex-grow min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-fuchsia-500 font-headline uppercase leading-none"><BrainCircuit className="h-4 w-4" /> AI Co-Writer</CardTitle>
                            </div>
                            <p className="text-[8px] text-fuchsia-600/60 font-bold uppercase tracking-widest leading-none truncate">Neural Sharpening Tools</p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-fuchsia-500 hover:bg-fuchsia-500/10" onClick={(e) => { e.stopPropagation(); setSaveStyleNamingOpen(true); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton
                            feature="Style DNA Archive"
                            benefit="Save your trained style profile. Free artists load from 2 system style presets."
                            example="Example: archive your clipped cadence profile after Style Training."
                          />
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-fuchsia-500 hover:bg-fuchsia-500/10" onClick={(e) => { e.stopPropagation(); setStyleVaultOpen(true); }}><FolderOpen className="h-4 w-4" /></Button>
                        <Switch checked={track.styleEnabled === true} onCheckedChange={(c) => onUpdateTrack({ styleEnabled: c })} />
                    </div>
                </div>
                <CollapsibleContent>
                    <CardContent className="px-4 pb-4 space-y-4 font-code">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-[9px] font-bold uppercase text-fuchsia-700/70">Technical DNA</Label>
                                <div className="flex items-center gap-1.5">
                                    <Hint
                                      side="left"
                                      content={<p className="text-[10px] font-bold">Clear Style History</p>}
                                    >
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-fuchsia-400 hover:bg-fuchsia-500/10" onClick={() => clearStyleProfile()}><X className="h-3.5 w-3.5" /></Button>
                                    </Hint>
                                    <Hint
                                      side="left"
                                      className="max-w-[240px] p-3 text-[10px] leading-relaxed"
                                      content={
                                        <>
                                          <p className="font-bold mb-1 uppercase text-primary">How to Use:</p>
                                          This is your Global Artist Profile. It learns your cadence across ALL songs. Press Train to feed your latest sheet into the co-writer&apos;s brain.
                                        </>
                                      }
                                    >
                                      <button type="button" className="text-fuchsia-500/50 hover:text-fuchsia-400 touch-manipulation" aria-label="Style profile help">
                                        <HelpCircle className="h-3.5 w-3.5" />
                                      </button>
                                    </Hint>
                                </div>
                            </div>
                            
                            <div className="space-y-3 p-3 bg-background/40 rounded border border-fuchsia-500/10">
                                {currentMetrics ? (
                                    <>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[8px] font-bold uppercase"><span>Vocab Variety</span><span>{currentMetrics.vocabularyScore}%</span></div>
                                            <Progress value={currentMetrics.vocabularyScore} className="h-1 bg-fuchsia-500/10" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[8px] font-bold uppercase"><span>Rhyme Complexity</span><span>{currentMetrics.rhymeComplexity}%</span></div>
                                            <Progress value={currentMetrics.rhymeComplexity} className="h-1 bg-fuchsia-500/10" />
                                        </div>
                                        <div className="pt-1 flex items-center gap-2">
                                            <Badge variant="outline" className="text-[8px] border-fuchsia-500/20 text-fuchsia-400 py-0.5 px-2 bg-fuchsia-500/5 uppercase">{currentMetrics.cadenceMap}</Badge>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground leading-relaxed italic border-t border-white/5 pt-2 mt-1">"{styleProfile?.history[0]?.analysis}"</p>
                                    </>
                                ) : (
                                    <div className="py-4 text-center">
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Awaiting neural training...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 h-9 font-bold text-[9px] uppercase border-border/40 gap-2 shadow-sm" onClick={(e) => handleSharedLineGeneration('previous', e)} title={tooltip('generateNextLine')}>
                                <ArrowUp className="h-3 w-3 text-primary" /> PREV
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 h-9 font-bold text-[9px] uppercase border-border/40 gap-2 shadow-sm" onClick={(e) => handleSharedLineGeneration('next', e)}>
                                <ArrowDown className="h-3 w-3 text-primary" /> NEXT
                            </Button>
                        </div>

                        <Button variant="outline" className="w-full h-10 border-fuchsia-500/20 bg-background/40 text-fuchsia-600 font-bold text-[10px] uppercase gap-2 hover:bg-fuchsia-500/5 shadow-inner" onClick={() => setImproveStyleOpen(true)}>
                            <Fingerprint className="h-4 w-4" /> {buttonLabel('improveMyStyle')}
                        </Button>
                    </CardContent>
                </CollapsibleContent>
            </Card>
          </Collapsible>

          <CreativeEffectsPanel
            track={track}
            album={album}
            styleProfile={styleProfile}
            scratchPadRef={scratchPadRef}
            activeSection={activeSection}
            isPro={isPro}
            isOpen={sectionOpen.creativeEffects}
            onOpenChange={(o) => onSectionChange('creativeEffects', o)}
          />
          
          <ScratchPad
            ref={scratchPadRef}
            isOpen={sectionOpen.scratchPad}
            onOpenChange={(o) => onSectionChange('scratchPad', o)}
          />
        </div>
      </div>
      
      <DNAVaultDialog
        open={dnaVaultOpen}
        onOpenChange={setDNAVaultOpen}
        album={album}
        track={track}
        updateAlbum={updateAlbum}
        onUpdateTrack={onUpdateTrack}
        onLoadPreset={(p: DnaPreset) => {
          const intents = p.intents?.length ? p.intents : p.analysis?.motifs ?? [];
          onUpdateTrack({
            direction: { ...(track.direction ?? {}), ...p.mapping, enabled: true },
            checkedIntents: intents,
            intentsEnabled: intents.length > 0,
            styleEnabled: !!(p.styleAnalysis?.trim() || p.analysis?.styleAnalysis?.trim()),
          });
          if (album && intents.length) {
            const existing = album.thingsToSay || [];
            const novel = intents.filter((m) => !existing.includes(m));
            if (novel.length) {
              updateAlbum(album.id, { thingsToSay: [...existing, ...novel] });
            }
          }
          const savedStyle = p.styleAnalysis?.trim() || p.analysis?.styleAnalysis?.trim();
          if (savedStyle) {
            updateStyleProfile(savedStyle, p.styleMetrics ?? p.analysis?.styleMetrics ?? DEFAULT_STYLE_METRICS);
          }
          toast({ title: 'Full DNA Profile Loaded' });
        }}
        updateStyleProfile={updateStyleProfile}
        isPro={isPro}
      />
      <VibeVaultDialog open={vibeVaultOpen} onOpenChange={setVibeVaultOpen} track={track} onUpdateTrack={onUpdateTrack} onApply={(v: any) => onUpdateTrack({ vibe: v })} isPro={isPro} />
      <StyleVaultDialog open={styleVaultOpen} onOpenChange={setStyleVaultOpen} album={album} updateAlbum={updateAlbum} onApply={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} isPro={isPro} />
      <ArchivalNamingDialog open={archivalDialog.open} onOpenChange={(o:any) => setArchivalDialog(prev => ({ ...prev, open: o }))} type={archivalDialog.type} onConfirm={archivalDialog.type === 'DNA' ? handleConfirmSaveDNA : handleConfirmSaveVibe} />
      <EditIntentDialog open={editIntentDialog.open} onOpenChange={(o:any) => setEditIntentDialog(prev => ({ ...prev, open: o }))} initialValue={editIntentDialog.intent} onConfirm={handleConfirmEditIntent} />
    </div>
  );
}

// --- Main Workstation Component ---

function TrackEditorImplementation({ trackId, albumId }: { trackId: string, albumId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const isPro = isProUser(user);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const { toast } = useToast();
  const { getTrackById, updateTrack, styleProfile, updateStyleProfile, updateAlbum } = useContext(DataContext);
  const { setGenerating } = useUIState();
  const { refundInk, addUsageLog, registerAiContext } = useUsage();
  const { getCost } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();
  const searchParams = useSearchParams();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState<MobileLyricsTab>('lyrics');
  const [sectionOpen, setSectionOpen] = useState<CoWriterSections>(DEFAULT_SECTIONS_CLOSED);
  const uiHydratedRef = useRef(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeGeneratorBar, setActiveGeneratorBar] = useState<{ sectionId: string, idx: number } | null>(null);
  const [activeBarText, setActiveBarText] = useState('');
  
  const [generateDraftOpen, setGenerateDraftOpen] = useState(false);
  const [smartStructureOpen, setSmartStructureOpen] = useState(false);
  const [improveStyleOpen, setImproveStyleOpen] = useState(false);
  const [styleVaultOpen, setStyleVaultOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [freestyleOpen, setFreestyleOpen] = useState(false);
  const [isRhymeLoading, setIsRhymeLoading] = useState(false);
  const [saveStyleNamingOpen, setSaveStyleNamingOpen] = useState(false);

  const [sectionsHistory, setSectionsHistory] = useState<TrackSection[][]>([]);

  const [generationOptions, setGenerationOptions] = useState<any[] | null>(null);
  const [pendingGenCtx, setPendingGenCtx] = useState<{ mode: 'next' | 'previous', sId: string, bIdx: number } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const tourAutoStartRef = useRef(false);

  const scratchPadRef = useRef<any>(null);

  const { track, album } = useMemo(() => getTrackById(albumId, trackId), [getTrackById, albumId, trackId]);

  useEffect(() => {
    if (!track || !user) return;
    trackStudioEvent(ANALYTICS_EVENTS.TRACK_EDITOR_OPEN, { trackId, albumId });
  }, [trackId, albumId, track?.id, user?.id]);

  const effectiveStyleProfile = useMemo((): StyleProfile => {
    if (styleProfile) return styleProfile;
    return {
      id: `style-${user?.id || 'guest'}`,
      ownerId: user?.id || '',
      history: [{ timestamp: new Date().toISOString(), analysis: '' }],
      trainingRefs: [],
      updatedAt: new Date().toISOString(),
    };
  }, [styleProfile, user?.id]);

  useEffect(() => {
    uiHydratedRef.current = false;
    const ui = loadTrackUILayout(trackId);
    setLeftCollapsed(ui.leftCollapsed);
    setRightCollapsed(ui.rightCollapsed);
    setSectionOpen(ui.sections);
    uiHydratedRef.current = true;
  }, [trackId]);

  useEffect(() => {
    if (!uiHydratedRef.current) return;
    saveTrackUILayout(trackId, { leftCollapsed, rightCollapsed, sections: sectionOpen });
  }, [trackId, leftCollapsed, rightCollapsed, sectionOpen]);

  const handleSectionChange = useCallback((key: CoWriterSectionKey, open: boolean) => {
    setSectionOpen(prev => ({ ...prev, [key]: open }));
  }, []);

  useEffect(() => {
    if (track && album) {
      registerAiContext({ track, album, styleProfile: effectiveStyleProfile });
    }
    return () => registerAiContext(null);
  }, [track, album, effectiveStyleProfile, registerAiContext]);

  useEffect(() => {
    setInitTimedOut(false);
    const t = setTimeout(() => setInitTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [albumId, trackId]);

  useEffect(() => {
    if (searchParams.get('openGenerator') === 'true') {
        setGenerateDraftOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PENDING_TOUR_REPLAY_KEY)) {
        sessionStorage.removeItem(PENDING_TOUR_REPLAY_KEY);
        setTourStep(0);
        setTourActive(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user || !track || tourAutoStartRef.current) return;
    if (user.lyricsTutorialCompletedAt) return;
    tourAutoStartRef.current = true;
    const t = setTimeout(() => setTourActive(true), 1200);
    return () => clearTimeout(t);
  }, [user, track]);

  useEffect(() => {
    const onReplay = () => {
      setTourStep(0);
      setTourActive(true);
    };
    window.addEventListener(REPLAY_GUIDED_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_GUIDED_TOUR_EVENT, onReplay);
  }, []);

  const handleTourBeforeStep = useCallback((step: LyricsTourStep) => {
    if (step.id === 'dna') {
      setRightCollapsed(false);
      setMobilePanelTab('cowriter');
      handleSectionChange('dna', true);
    } else if (step.id === 'generation' || step.id === 'save' || step.id === 'dna-drop') {
      setLeftCollapsed(false);
      setMobilePanelTab('workstation');
    } else if (['paste', 'sheet', 'bar-workstation', 'rhyme-pulse'].includes(step.id)) {
      setMobilePanelTab('lyrics');
      if (step.id === 'bar-workstation') setIsMinimized(false);
    }
  }, [handleSectionChange]);

  const handleTourComplete = useCallback(async (skipped: boolean) => {
    setTourActive(false);
    if (user && !user.lyricsTutorialCompletedAt) {
      try {
        await markLyricsTutorialComplete(user.id);
      } catch (e) {
        console.warn('Failed to save tutorial completion', e);
      }
    }
    if (!skipped) {
      void postGamificationEvent('tour_complete');
    }
  }, [user]);

  useEffect(() => {
    if (track && track.sections.length > 0 && !activeSectionId) {
        setActiveSectionId(track.sections[0].id);
    }
  }, [track, activeSectionId]);

  useEffect(() => {
    if (!track) return;
    const hasFlash = track.sections.some(s => s.bars.some(b => b.justGenerated));
    if (hasFlash) {
        const timer = setTimeout(() => {
            const cleared = track.sections.map(s => ({
                ...s,
                bars: s.bars.map(b => ({ ...b, justGenerated: false }))
            }));
            updateTrack(albumId, trackId, { sections: cleared });
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [track?.sections, albumId, trackId, updateTrack]);

  const handleUpdateTrack = useCallback((updates: Partial<Track>) => {
    if (!track) return;
    if (updates.sections) setSectionsHistory(prev => [track.sections, ...prev].slice(0, 20));
    updateTrack(albumId, trackId, updates);
  }, [track, albumId, trackId, updateTrack]);

  const handleUndo = useCallback(() => {
    if (sectionsHistory.length === 0) return;
    const [previousState, ...remainingHistory] = sectionsHistory;
    setSectionsHistory(remainingHistory);
    updateTrack(albumId, trackId, { sections: previousState });
    toast({ title: "Undo Successful" });
  }, [sectionsHistory, albumId, trackId, updateTrack, toast]);

  const handleRunRhymeScan = async (e: any) => {
    if (!track) return;
    const cost = getCost('findRhymes');
    runWithInk('findRhymes', cost, 'findRhymes', e, async () => {
      setIsRhymeLoading(true);
      setGenerating(true, 'Initializing Rhyme Pulse...');
      try {
        const fullLyrics = track.sections.flatMap((s) => s.bars.map((b) => b.text)).join('\n');
        const res = await findRhymes(await withAiAuth({ text: fullLyrics, userName: user?.displayName }));
        handleUpdateTrack({ rhymeGroups: res.rhymeGroups });
        addUsageLog({ flowName: 'findRhymes', inkCost: cost, status: 'success' });
        toast({ title: 'Rhyme Pulse Complete' });
        void postGamificationEvent('rhyme_pulse_on');
      } catch (err: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Scan Failed', description: err.message });
      } finally {
        setIsRhymeLoading(false);
        setGenerating(false);
      }
    });
  };

  const handleSharedLineGeneration = async (mode: 'next' | 'previous', e: any, sId?: string, bIdx?: number) => {
    if (!track || !album) return;
    const sectionId = sId || activeGeneratorBar?.sectionId;
    const barIdx = bIdx || activeGeneratorBar?.idx;
    if (!sectionId || !barIdx) { toast({ variant: 'destructive', title: 'Selection Required' }); return; }
    const cost = getCost('generateNextLine');
    const inkKey = `generateNextLine-${mode}-${sectionId}-${barIdx}`;
    runWithInk(inkKey, cost, 'generateNextLine', e, async () => {
      setGenerating(true, 'Neural Synthesis Active...');
      try {
        const section = track.sections.find((s) => s.id === sectionId);
        const priorLines = section.bars.filter((b) => b.idx < barIdx).map((b) => b.text);
        const nextLines = section.bars.filter((b) => b.idx > barIdx).map((b) => b.text);
        const targetLine = section.bars.find((b) => b.idx === barIdx)?.text || '';
        if (mode === 'next') priorLines.push(targetLine);
        else nextLines.unshift(targetLine);
        const res = await generateNextLine(
          await withAiAuth({
            userName: user?.displayName,
            priorLines,
            nextLines,
            sectionType: section.type,
            vibe: track.vibe ?? { genre: 'General', tempoBPM: 90, feeling: ['neutral'] },
            intents: isIntentsActive(track) ? track.checkedIntents || [] : [],
            styleProfileSummary: isStyleActive(track)
              ? effectiveStyleProfile?.history[0]?.analysis || 'Initial neutral style profile.'
              : 'Initial neutral style profile.',
            rhymeMode: 'continue',
            theme: track.title || album.title || 'Untitled',
            endWith: isIntentsActive(track) ? track.endWith : null,
            mergedDirection: mergeDirection(album.direction, track.direction),
            negativePrompt: isGuardrailsActive(track) ? track.guardrails?.negativePrompt : undefined,
            forbiddenWords: isGuardrailsActive(track) ? track.guardrails?.forbiddenWords : undefined,
            mustIncludeWords: isGuardrailsActive(track) ? track.guardrails?.mustIncludeWords : undefined,
          })
        );
        if (!res || res.length === 0) throw new Error('Synthesis produced no results.');
        setGenerationOptions(res);
        setIsMinimized(false);
        setPendingGenCtx({ mode, sId: sectionId, bIdx: barIdx });
        addUsageLog({ flowName: 'generateNextLine', inkCost: cost, status: 'success' });
      } catch (err: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Synthesis Failed', description: err.message });
      } finally {
        setGenerating(false);
      }
    });
  };

  const handleAcceptOption = (line: string) => {
    if (!pendingGenCtx || !track) return;
    const { mode, sId, bIdx } = pendingGenCtx;
    const insertIdx = mode === 'next' ? bIdx + 1 : bIdx;
    const newSections = track.sections.map(s => {
        if (s.id !== sId) return s;
        const updatedBars = s.bars.map(b => ({ ...b }));
        updatedBars.forEach(b => { if (b.idx >= insertIdx) b.idx += 1; });
        updatedBars.push(
          withLineSource(
            {
              idx: insertIdx,
              text: line.trim(),
              accepted: true,
              syllables: line.trim().split(' ').length,
              rhymeKey: '?',
            },
            'generated'
          )
        );
        return { ...s, bars: updatedBars.sort((a, b) => a.idx - b.idx) };
    });
    // Glow the row where the new line landed (insertion slot), not the source bar
    handleUpdateTrack({ sections: markBarAnchorGlow(newSections, sId, insertIdx) });
    setGenerationOptions(null);
    setPendingGenCtx(null);
    setTimeout(() => { const el = document.getElementById(`bar-input-${sId}-${insertIdx}`) as HTMLTextAreaElement; if (el) { el.focus(); } }, 100);
  };

  const handleConfirmSaveStyle = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Archive Style DNA with Studio Pro.' });
        return;
      }
      if (!styleProfile?.history[0] || !album) return;
      const preset = { name, createdAt: new Date().toISOString(), analysis: styleProfile.history[0].analysis, metrics: styleProfile.history[0].metrics! };
      const existing = album.stylePresets || [];
      updateAlbum(album.id, { stylePresets: [...existing, preset] });
      toast({ title: "Style DNA Archived" });
      setSaveStyleNamingOpen(false);
  };

  if (!track || !album) {
    if (initTimedOut) {
      return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground font-code uppercase tracking-widest">Workstation could not initialize.</p>
          <Button className="font-bold uppercase text-xs" onClick={() => router.push('/')}>Return to Vault</Button>
        </div>
      );
    }
    return <div className="flex h-screen items-center justify-center"><StudioLoader size="lg" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-md:h-[calc(100dvh-3.5rem)] w-full overflow-hidden max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
      <FreeTierExpectationsBanner isPro={isPro} />
      <div className="flex flex-1 min-h-0 overflow-hidden w-full">
      <LeftPanel track={track} album={album} onUpdateTrack={handleUpdateTrack} activeSectionId={activeSectionId} setActiveSectionId={setActiveSectionId} setExportDialogOpen={setExportDialogOpen} setShareDialogOpen={setShareDialogOpen} onCollapse={setLeftCollapsed} leftCollapsed={leftCollapsed} setGenerateDraftOpen={setGenerateDraftOpen} scratchPadRef={scratchPadRef} isPro={isPro} mobileActive={mobilePanelTab === 'workstation'} />
      <CenterPanel track={track} onUpdateTrack={handleUpdateTrack} handleSharedLineGeneration={handleSharedLineGeneration} activeGeneratorBar={activeGeneratorBar} setActiveGeneratorBar={setActiveGeneratorBar} activeBarText={activeBarText} setActiveBarText={setActiveBarText} setFreestyleOpen={setFreestyleOpen} album={album} setSmartStructureOpen={setSmartStructureOpen} isRhymeLoading={isRhymeLoading} activeSectionId={activeSectionId} handleRunRhymeScan={handleRunRhymeScan} generationOptions={generationOptions} setGenerationOptions={setGenerationOptions} handleAcceptOption={handleAcceptOption} handleUndo={handleUndo} canUndo={sectionsHistory.length > 0} isMinimized={isMinimized} setIsMinimized={setIsMinimized} mobileActive={mobilePanelTab === 'lyrics'} leftCollapsed={leftCollapsed} rightCollapsed={rightCollapsed} />
      <RightPanel 
        track={track} 
        album={album} 
        onUpdateTrack={handleUpdateTrack} 
        styleProfile={effectiveStyleProfile} 
        updateStyleProfile={updateStyleProfile}
        scratchPadRef={scratchPadRef} 
        activeSectionId={activeSectionId} 
        rightCollapsed={rightCollapsed} 
        onCollapse={setRightCollapsed} 
        improveStyleOpen={improveStyleOpen}
        setImproveStyleOpen={setImproveStyleOpen} 
        styleVaultOpen={styleVaultOpen}
        setStyleVaultOpen={setStyleVaultOpen} 
        handleSharedLineGeneration={handleSharedLineGeneration} 
        updateAlbum={updateAlbum} 
        clearStyleProfile={() => updateStyleProfile('')} 
        setSaveStyleNamingOpen={setSaveStyleNamingOpen}
        isPro={isPro}
        sectionOpen={sectionOpen}
        onSectionChange={handleSectionChange}
        mobileActive={mobilePanelTab === 'cowriter'}
      />
      <GenerateSongDraftDialog open={generateDraftOpen} onOpenChange={setGenerateDraftOpen} track={track} styleProfile={effectiveStyleProfile} onDraftGenerated={(sections) => handleUpdateTrack({ sections })} />
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} album={album} tracks={[track]} exportType="track" />
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} type="track" id={track.id} title={track.title} albumId={album.id} existingShareId={track.shareId} />
      <FreestylePad open={freestyleOpen} onOpenChange={setFreestyleOpen} onAddFreestyle={(text) => { const lines = text.split('. ').filter(l => l.trim()); const activeS = track.sections.find(s => s.id === activeSectionId) || track.sections[0]; const startIdx = activeS.bars.length + 1; const newBars = lines.map((l, i) => withLineSource({ idx: startIdx + i, text: l.trim(), accepted: true, syllables: l.trim().split(' ').length, rhymeKey: '?' }, 'written')); handleUpdateTrack({ sections: track.sections.map(s => s.id === activeS.id ? { ...s, bars: [...s.bars, ...newBars] } : s) }); setFreestyleOpen(false); }} disabled={false} trackVibe={track.vibe} albumTheme={album.theme} styleProfileSummary={styleProfile.history[0]?.analysis || ''} isPro={user?.subscriptionStatus === 'active'} />
      <SmartStructureDialog
        open={smartStructureOpen}
        onOpenChange={setSmartStructureOpen}
        onApply={(sections: any) => {
          handleUpdateTrack({ sections });
          void postGamificationEvent('smart_structure_used');
        }}
      />
      <ImproveMyStyleDialog open={improveStyleOpen} onOpenChange={setImproveStyleOpen} track={track} onUpdateStyle={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} />
      <StyleVaultDialog open={styleVaultOpen} onOpenChange={setStyleVaultOpen} album={album} updateAlbum={updateAlbum} onApply={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} />
      <ArchivalNamingDialog open={saveStyleNamingOpen} onOpenChange={setSaveStyleNamingOpen} type="Style" onConfirm={handleConfirmSaveStyle} />
      </div>
      <MobileLyricsTabBar active={mobilePanelTab} onChange={setMobilePanelTab} />
      <StudioGuidedTour
        active={tourActive}
        stepIndex={tourStep}
        onStepChange={setTourStep}
        onComplete={handleTourComplete}
        onBeforeStep={handleTourBeforeStep}
      />
      {tourActive && (
        <div className="fixed bottom-24 max-md:bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-4 max-md:left-2 max-md:right-2 max-md:w-auto z-[5999] w-64 pointer-events-auto">
          <QuestProgress
            tourStepIndex={tourStep}
            tourActive={tourActive}
            tourCompleted={Boolean(user?.lyricsTutorialCompletedAt)}
          />
        </div>
      )}
    </div>
  );
}

export function TrackEditorContent(props: { trackId: string, albumId: string }) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><StudioLoader size="lg" /></div>}>
            <TrackEditorImplementation {...props} />
        </Suspense>
    )
}
