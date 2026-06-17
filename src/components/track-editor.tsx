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
  isTrackLocked,
  isLockedTrackReopenUpdate,
  TRACK_LOCKED_TOAST,
  TRACK_COMPLETE_TOAST,
} from '@/lib/track-lock';
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
  PanelLeft,
  PanelRight,
  PanelRightClose,
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
import { DraftChest } from './draft-chest';
import {
  appendSectionsToSheet,
  mergeChestEntries,
  replaceSheetWithSections,
  snapshotsToChestEntries,
} from '@/lib/draft-chest';
import type { ApprovalDraftSnapshot } from '@/lib/approval-draft-history';
import type { DraftChestEntry } from '@/lib/types';
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
import { isProFeaturePreviewActive, isProOrTrial } from '@/lib/subscription';
import { recordProTrialVaultSave } from '@/lib/pro-trial-quest-client';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { ArchivalNamingDialog } from '@/components/archival-naming-dialog';
import { DnaVaultPresetDetails } from '@/components/dna-vault-preset-details';
import type { DnaPreset } from '@/lib/types';
import {
  STRAIN_TARGETS,
  appendDirectionField,
  buildDnaPresetFromDirection,
  COWRITER_SUITE_SECTION_KEYS,
  coWriterSectionForStrain,
  DEFAULT_STYLE_METRICS,
} from '@/lib/dna-strands';
import {
  markLyricsTutorialComplete,
  REPLAY_GUIDED_TOUR_EVENT,
  PENDING_TOUR_REPLAY_KEY,
  type LyricsTourStep,
} from '@/lib/studio-onboarding';
import { persistLastWorkedTrack } from '@/lib/studio-tips-session';
import {
  appendQuery,
  clearStaleLastWorkedTrackPath,
  consumePendingOpenGeneratorRemix,
  hasPendingOpenGeneratorRemix,
  markPendingOpenGeneratorRemix,
  OPEN_GENERATOR_REMIX_EVENT,
  resolveWorkstationTrackPath,
  trackExistsInVault,
} from '@/lib/workstation-path';
import { dispatchStudioPrivacyIntroEligible, queueStudioPrivacyIntro } from '@/lib/studio-privacy-intro';
import { StudioGuidedTour } from '@/components/studio-guided-tour';
import { QuestProgress } from '@/components/gamification/quest-progress';
import { postGamificationEvent } from '@/lib/gamification-client';
import { claimMilestone } from '@/lib/milestones-client';
import { FreeTierExpectationsBanner } from '@/components/free-tier-expectations-banner';
import { MobileLyricsTabBar, type MobileLyricsTab } from '@/components/mobile-lyrics-tab-bar';
import { useIsMobile } from '@/hooks/use-mobile';
import { UpgradeTooltip } from '@/components/upgrade-tooltip';
import {
  LockedSaveButton,
  LockedProFeatureButton,
  ProLockBadge,
  proLockShell,
  proLockIcon,
  proLockText,
  markBarAnchorGlow,
} from '@/components/pro-lock';
import {
  isTrackOverTierLimit,
  TIER_LIMIT_LOCKED_TOAST,
} from '@/lib/tier-limits';
import { getTrackLimitBanner } from '@/lib/free-vault-copy';
import { withLineSource } from '@/lib/gamification/line-attribution';
import {
  loadTrackUILayout,
  saveTrackUILayout,
  DEFAULT_SECTIONS_CLOSED,
  type CoWriterSections,
  type CoWriterSectionKey,
} from '@/lib/track-panel-state';
import {
  getWorkstationRuleBadges,
  getWorkstationRuleBadgeClass,
  coWriterSectionCardClass,
  coWriterSectionTitleClass,
  coWriterSectionAccentClass,
  coWriterIntentRowClass,
  isIntentsActive,
  isIntentsMasterEnabled,
  isGuardrailsActive,
  isGuardrailsToggleOn,
  isStyleActive,
  isVibeActive,
  isTrackDnaActive,
  isTrackDnaToggleOn,
  isAlbumDnaActive,
  isInheritFromAlbumOn,
  isLooseTrackAlbum,
  directionWithSyncedEnabled,
  hasCreativeDnaContent,
  guardrailsWithSyncedEnabled,
} from '@/lib/co-writer-rules';
import {
  isSystemPreset,
  mergeDnaVaultPresets,
  mergeStyleVaultPresets,
  mergeVibeVaultPresets,
} from '@/lib/system-presets';
import { GenerateSongDraftDialog } from './generate-song-draft-dialog';
import { ExportDialog } from './export-dialog';
import { ShareDialog } from './share-dialog';
import { DnaDropLiveIndicator } from './dna-drop-live-indicator';
import {
  lazyAnalyzeStructure,
  lazyFindRhymes,
  lazyGenerateCoverArt,
  lazyGenerateNextLine,
  lazyImproveMyStyle,
  lazySuggestVibe,
} from '@/lib/lazy-ai-flows';
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
  const { getEffectiveCost, buttonLabel, tooltip } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const handleAnalyze = async (e: any) => {
    const cost = getEffectiveCost('analyzeStructure');
    runWithInk('analyzeStructure', cost, 'analyzeStructure', e, async () => {
      setIsProcessing(true);
      setGenerating(true, 'Deconstructing Neural Structure...');
      try {
        const res = await lazyAnalyzeStructure(await withAiAuth({ text: inputText }));
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
  const { getEffectiveCost, buttonLabel, tooltip } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const handleTrain = async (e: any) => {
    const cost = getEffectiveCost('improveMyStyle');
    runWithInk('improveMyStyle', cost, 'improveMyStyle', e, async () => {
      setIsProcessing(true);
      setGenerating(true, 'Learning Artist DNA...');
      try {
        const allText = track.sections.flatMap((s: any) => s.bars.map((b: any) => b.text)).join('\n');
        if (allText.length < 50) throw new Error('Need more lyrical data to train effectively.');
        const res = await lazyImproveMyStyle(await withAiAuth({ lyrics: allText }));
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

type CoWriterDnaInjectHandlers = ReturnType<typeof createCoWriterDnaInjectHandlers>;

function createCoWriterDnaInjectHandlers(deps: {
  track: Track;
  album: Album | null | undefined;
  onUpdateTrack: (u: Partial<Track>) => void;
  updateAlbum?: (id: string, u: Partial<Album>) => void;
  updateStyleProfile?: (analysis: string, metrics?: import('@/lib/types').StyleMetrics) => void;
  openCoWriterSections?: (key: CoWriterSectionKey | CoWriterSectionKey[]) => void;
  toast: (t: { title: string; description?: string; variant?: 'destructive' }) => void;
}) {
  const { track, album, onUpdateTrack, updateAlbum, updateStyleProfile, openCoWriterSections, toast } = deps;

  const onInjectMappingField = (field: keyof Direction, value: string | undefined) => {
    if (!value) return;
    onUpdateTrack({
      direction: { ...(track.direction ?? {}), [field]: value, enabled: true },
    });
    openCoWriterSections?.('dna');
    toast({ title: `${field} loaded` });
  };

  const onInjectStrain = (title: string, content: string | string[]) => {
    const target = STRAIN_TARGETS[title];
    if (!target) return;

    if (target.kind === 'intents') {
      const motifs = Array.isArray(content) ? content : [content];
      onUpdateTrack({
        checkedIntents: [...new Set([...(track.checkedIntents ?? []), ...motifs])],
        intentsEnabled: true,
      });
      if (album) {
        const existing = album.thingsToSay || [];
        const novel = motifs.filter((m) => !existing.includes(m));
        if (novel.length) {
          updateAlbum?.(album.id, { thingsToSay: [...existing, ...novel] });
        }
      }
      openCoWriterSections?.('intents');
      toast({ title: `Motifs injected (${motifs.length})` });
      return;
    }

    if (target.kind === 'structure_guide') {
      const text = Array.isArray(content) ? content.join(', ') : content;
      const tagged = `[Structure] ${text}`;
      const prev = track.specialInstructions?.trim() ?? '';
      const next = prev.includes(text) ? prev : prev ? `${prev}\n${tagged}` : tagged;
      onUpdateTrack({ specialInstructions: next });
      openCoWriterSections?.('coWriter');
      toast({ title: 'Structure guide injected' });
      return;
    }

    if (target.kind === 'style_profile') {
      const text = Array.isArray(content) ? content.join(', ') : content;
      updateStyleProfile?.(text, DEFAULT_STYLE_METRICS);
      onUpdateTrack({ styleEnabled: true });
      openCoWriterSections?.('coWriter');
      toast({ title: 'Style DNA loaded' });
      return;
    }

    const text = Array.isArray(content) ? content.join(', ') : content;
    onUpdateTrack({
      direction: {
        ...(track.direction ?? {}),
        ...appendDirectionField(track.direction ?? {}, target.field, target.label, text),
        enabled: true,
      },
    });
    openCoWriterSections?.(coWriterSectionForStrain(title));
    toast({ title: `${title} injected` });
  };

  const onInjectStyle = (analysis: string, metrics?: import('@/lib/types').StyleMetrics) => {
    updateStyleProfile?.(analysis, metrics ?? DEFAULT_STYLE_METRICS);
    onUpdateTrack({ styleEnabled: true });
    openCoWriterSections?.('coWriter');
    toast({ title: 'Style DNA loaded' });
  };

  return { onInjectMappingField, onInjectStrain, onInjectStyle };
}

function DNAVaultDialog({
  open,
  onOpenChange,
  album,
  updateAlbum,
  track,
  onUpdateTrack,
  onLoadPreset,
  injectHandlers,
  isPro,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  album: Album | null | undefined;
  updateAlbum: (id: string, u: Partial<Album>) => void;
  track: Track;
  onUpdateTrack: (u: Partial<Track>) => void;
  onLoadPreset: (preset: DnaPreset) => void;
  injectHandlers: CoWriterDnaInjectHandlers;
  isPro: boolean;
}) {
    const { toast } = useToast();
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const presets = useMemo(() => mergeDnaVaultPresets(album?.dnaPresets, isPro), [album?.dnaPresets, isPro]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[min(92vh,calc(100dvh-2rem))] flex flex-col overflow-hidden bg-card border-2">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-green-500">
                        <FolderOpen className="h-6 w-6" /> DNA Vault
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">
                        {isPro ? 'Studio presets plus your saved vault — load strains or full profiles.' : 'Load system DNA strains — pick individual fields or apply full profiles.'}
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
                                            {isSystemPreset(p.createdAt) && (
                                                <ProLockBadge label="System" />
                                            )}
                                        </div>
                                        <p className="text-[9px] text-muted-foreground font-code mt-0.5">Source: {p.sourceTrackTitle || 'Studio Preset'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isPro && !isSystemPreset(p.createdAt) && album && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={(e) => {
                                              e.stopPropagation();
                                              updateAlbum(album.id, {
                                                dnaPresets: (album.dnaPresets ?? []).filter(
                                                  (x) => !(x.name === p.name && x.createdAt === p.createdAt)
                                                ),
                                              });
                                              toast({ title: 'DNA profile removed' });
                                            }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onLoadPreset(p); onOpenChange(false); }}><RefreshCw className="h-3.5 w-3.5" /></Button>
                                        {expandedIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </div>
                                {expandedIdx === i && (
                                    <div className="p-3 bg-black/40 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                                        <DnaVaultPresetDetails
                                            preset={p}
                                            {...injectHandlers}
                                        />
                                    </div>
                                )}
                            </Card>
                        )) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed rounded-lg p-6 text-center">
                                <div className="p-3 rounded-full bg-muted/20"><Compass className="h-8 w-8 opacity-20" /></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Vault is Empty</p>
                                    <p className="text-[9px] lowercase italic opacity-60">Save current direction to build your vault.</p>
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
    const presets = useMemo(() => mergeVibeVaultPresets(track.vibePresets, isPro), [track.vibePresets, isPro]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-2">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-amber-500">
                        <FolderOpen className="h-6 w-6" /> Vibe Vault
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">
                        {isPro ? 'Studio presets plus your saved vibes — load instrumentation and atmosphere.' : 'Choose from 2 professional system vibe presets.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] mt-4">
                    <div className="space-y-2">
                        {presets.length > 0 ? presets.map((v: any, i: number) => (
                            <div key={`${v.name}-${i}`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-white uppercase truncate">{v.name || 'Unnamed Preset'}</p>
                                        {isSystemPreset(v.createdAt) && (
                                            <ProLockBadge label="System" />
                                        )}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-code mt-0.5">{v.genre} | {v.tempoBPM} BPM</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isPro && !isSystemPreset(v.createdAt) && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={() => {
                                          onUpdateTrack({
                                            vibePresets: (track.vibePresets ?? []).filter(
                                              (p: TrackVibe & { createdAt?: string }) =>
                                                !(p.name === v.name && p.createdAt === v.createdAt)
                                            ),
                                          });
                                          toast({ title: 'Vibe Preset Erased' });
                                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    )}
                                    <Button size="sm" variant="secondary" className="h-7 text-[9px] font-bold px-3" onClick={() => { onApply({ ...v, enabled: true }); onOpenChange(false); toast({ title: "Vibe Loaded" }); }}>LOAD</Button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed rounded-lg p-6 text-center">
                                <div className="p-3 rounded-full bg-muted/20"><Palette className="h-8 w-8 opacity-20" /></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No Presets Found</p>
                                    <p className="text-[9px] lowercase italic opacity-60">Save your current instrumentation to build your vibe vault.</p>
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
    const presets = useMemo(() => mergeStyleVaultPresets(album?.stylePresets, isPro), [album?.stylePresets, isPro]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-2">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-fuchsia-500">
                        <FolderOpen className="h-6 w-6" /> Style Vault
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">
                        {isPro ? 'Studio presets plus your saved style DNA — load cadence profiles.' : 'Choose from 2 professional style DNA presets.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[300px] mt-4">
                    <div className="space-y-2">
                        {presets.length > 0 ? presets.map((s: any, i: number) => (
                            <div key={`${s.name}-${i}`} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-white uppercase truncate">{s.name}</p>
                                        {isSystemPreset(s.createdAt) && (
                                            <ProLockBadge label="System" />
                                        )}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground font-code mt-0.5 line-clamp-2 italic">"{s.analysis}"</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isPro && !isSystemPreset(s.createdAt) && album && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={() => {
                                          updateAlbum(album.id, {
                                            stylePresets: (album.stylePresets ?? []).filter(
                                              (x) => !(x.name === s.name && x.createdAt === s.createdAt)
                                            ),
                                          });
                                          toast({ title: 'Style DNA Erased' });
                                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    )}
                                    <Button size="sm" variant="secondary" className="h-7 text-[9px] font-bold px-3" onClick={() => { onApply(s.analysis, s.metrics); onOpenChange(false); toast({ title: "Style DNA Applied" }); }}>LOAD</Button>
                                </div>
                            </div>
                        )) : (
                            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-4 border-2 border-dashed rounded-lg p-6 text-center">
                                <div className="p-3 rounded-full bg-muted/20"><Fingerprint className="h-8 w-8 opacity-20" /></div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No style profiles</p>
                                    <p className="text-[9px] lowercase italic opacity-60">Save your latest style profile to populate the vault.</p>
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

function LeftPanel({ track, album, onUpdateTrack, activeSectionId, setActiveSectionId, setExportDialogOpen, setShareDialogOpen, onCollapse, leftCollapsed, setGenerateDraftOpen, scratchPadRef, isPro, mobileActive = false, trackLocked = false, tierLocked = false, completeLocked = false, workstationAttention = false, tourMobilePad = false }: any) {
  const { user } = useAuth();
  const router = useRouter();
  const { setGenerating } = useUIState();
  const { toast } = useToast();
  const { refundInk, addUsageLog } = useUsage();
  const { getEffectiveCost, tooltip, buttonLabel } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  const handleSuggestVibe = async (e: any) => {
    if (trackLocked) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
    const cost = getEffectiveCost('suggestVibe');
    runWithInk('suggestVibe', cost, 'suggestVibe', e, async () => {
      setGenerating(true, 'Analyzing Sonic Landscape...');
      try {
        const fullLyrics = track.sections.flatMap((s: any) => s.bars.map((b: any) => b.text)).join('\n');
        const res = await lazySuggestVibe(await withAiAuth({ lyrics: fullLyrics }));
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
    if (trackLocked) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
    const cost = getEffectiveCost('generateCoverArt');
    runWithInk('generateCoverArt', cost, 'generateCoverArt', e, async () => {
      setGenerating(true, 'Generating Cinematic DNA...');
      try {
        const fullLyrics = track.sections.flatMap((s: any) => s.bars.map((b: any) => b.text)).join('\n');
        const res = await lazyGenerateCoverArt(
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
      if (trackLocked) {
        toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
        return;
      }
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
        <div className={cn('p-4 space-y-6', tourMobilePad ? 'pb-28' : 'pb-24')}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setGenerateDraftOpen(true)}
                  disabled={trackLocked}
                  data-tour="generation-workstation"
                  aria-label={workstationAttention ? 'Generation Workstation — session in progress, tap to reopen' : 'Open Generation Workstation'}
                  className={cn(
                    'w-full h-20 font-bold uppercase tracking-[0.2em] gap-3 shadow-[0_0_30px_rgba(59,130,246,0.4)] bg-primary text-white border-2 border-white/10 group animate-in fade-in zoom-in duration-1000 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:pointer-events-none',
                    workstationAttention && 'animate-workstation-attention border-primary/70 ring-2 ring-primary/40 ring-offset-2 ring-offset-background'
                  )}
                >
                    <BrainCircuit className={cn('h-8 w-8', workstationAttention ? 'animate-pulse' : 'group-hover:animate-pulse')} /> 
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

          <Card
            className={cn(
              'shadow-sm overflow-hidden transition-colors',
              completeLocked
                ? 'border-amber-500/45 bg-amber-500/10 ring-1 ring-amber-400/25'
                : 'border-sky-500/30 bg-sky-500/5'
            )}
            data-tour="track-status"
          >
              <CardHeader className="p-4 h-12 flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-sky-400 font-headline uppercase"><FilePenLine className="h-4 w-4" /> Track Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-sky-400/70 tracking-widest">Title</Label>
                    <Input value={track.title} onChange={(e) => onUpdateTrack({ title: e.target.value })} disabled={trackLocked} readOnly={trackLocked} className="font-headline border-sky-500/20 bg-background/50 h-9 text-xs disabled:opacity-70" />
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
                        {track.status === 'complete' ? (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5 shrink-0" /> Locked
                          </span>
                        ) : (
                          'In Progress'
                        )}
                      </Badge>
                    </div>
                    <p
                      className={cn(
                        'text-[9px] leading-snug',
                        completeLocked ? 'text-amber-100/90 font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {tierLocked
                        ? 'Free tier limit — view only. Export, Performance, and DNA Drop need Pro (or your active Pro preview).'
                        : completeLocked
                          ? 'Track is locked. Tap Reopen Track below to edit lyrics and Co-Writer again. Export, Performance, and DNA Drop need Pro unless your preview is active.'
                          : 'Lock the track when lyrics are finished — blocks edits and counts toward weekly goals and achievements.'}
                    </p>
                    <Button
                      variant={track.status === 'complete' ? 'default' : 'default'}
                      size="sm"
                      disabled={tierLocked}
                      data-tour="reopen-track"
                      className={cn(
                        'w-full min-w-0 font-bold uppercase leading-none px-3',
                        track.status === 'complete'
                          ? 'h-10 text-[10px] bg-amber-500 hover:bg-amber-400 text-amber-950 border-2 border-amber-300/50 shadow-[0_0_20px_rgba(251,191,36,0.35)] animate-reopen-attention justify-center gap-2'
                          : 'h-9 text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30 shadow-[0_0_16px_rgba(16,185,129,0.2)] justify-start',
                        tierLocked && 'opacity-50 pointer-events-none'
                      )}
                      onClick={() => {
                        if (tierLocked) {
                          toast({ variant: 'destructive', ...TIER_LIMIT_LOCKED_TOAST });
                          return;
                        }
                        const next = track.status === 'complete' ? 'in_progress' : 'complete';
                        onUpdateTrack({ status: next });
                        if (next === 'complete' && user?.id) {
                          void claimMilestone(user.id, 'track_complete', user.displayName);
                        }
                        toast(
                          next === 'complete'
                            ? TRACK_COMPLETE_TOAST
                            : {
                                title: 'Track Reopened',
                                description: 'You can edit lyrics and settings again.',
                              }
                        );
                      }}
                    >
                      {track.status === 'complete' ? (
                        <>
                          <Pencil className="h-4 w-4 shrink-0" /> Reopen Track
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
                      <LockedProFeatureButton
                        feature="Performance Mode"
                        benefit="Full-screen teleprompter with scroll-synced lyrics for stage and studio sessions."
                        example="Rehearse hooks without losing your place mid-verse."
                        ctaLabel="Unlock Performance — Go Pro"
                        icon={MonitorPlay}
                        iconClassName="text-sky-400"
                        label="Performance Mode"
                        className="w-full min-w-0 text-[9px] font-bold h-9 uppercase px-2 bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      />
                    )}
                    <Button variant="secondary" size="sm" className="w-full min-w-0 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold h-9 uppercase justify-start leading-none px-2" onClick={() => setExportDialogOpen(true)}><FileDown className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate">{isPro ? 'Export Track' : 'Preview Export'}</span></Button>
                    {isPro ? (
                      <Button variant="secondary" size="sm" data-tour="dna-drop" className="w-full min-w-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[9px] font-bold h-9 uppercase justify-start leading-none pl-2 pr-2.5 overflow-visible" onClick={() => setShareDialogOpen(true)}><Globe className="mr-2 h-4 w-4 shrink-0" /> <span className="flex items-center justify-between gap-2 min-w-0 flex-1 overflow-visible"><span className="truncate min-w-0">DNA Drop (Share)</span><DnaDropLiveIndicator shareId={track.shareId} variant="compact" /></span></Button>
                    ) : (
                      <LockedProFeatureButton
                        feature="DNA Drop"
                        benefit="Publish a shareable link to your track blueprint for collab and feedback."
                        example="Drop a link so collaborators can import your structure."
                        ctaLabel="Publish DNA Drop — Go Pro"
                        icon={Globe}
                        iconClassName="text-primary"
                        label={<span className="truncate flex items-center gap-2 min-w-0">DNA Drop (Share)</span>}
                        className="w-full min-w-0 text-[9px] font-bold h-9 uppercase px-2 bg-primary/10 text-primary border border-primary/20"
                      />
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
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-yellow-500" onClick={(e) => { e.stopPropagation(); handleMoveSection(s.id, 'up'); }} disabled={trackLocked || idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-yellow-500" onClick={(e) => { e.stopPropagation(); handleMoveSection(s.id, 'down'); }} disabled={trackLocked || idx === track.sections.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500/60 hover:text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); onUpdateTrack({ sections: track.sections.filter((sec:any) => sec.id !== s.id) }); }} disabled={trackLocked}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 pt-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={trackLocked} className="w-full h-10 border-yellow-500/20 bg-background/40 hover:bg-yellow-500/5 text-yellow-500 font-bold text-xs uppercase gap-2 shadow-inner disabled:opacity-50">
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
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Uses your current sheet text to infer genre, BPM, mood, and instrumentation in the Co-Writer panel. Then copy the Instrumentation field and paste into Suno, Udio, or similar music AI.
                      </p>
                      <p className="text-[9px] font-mono text-primary">{tooltip('suggestVibe')}</p>
                    </>
                  }
                >
                  <Button variant="outline" size="sm" disabled={trackLocked} className="w-full h-9 text-[9px] font-bold uppercase border-amber-500/20 hover:bg-amber-500/10 text-amber-600 disabled:opacity-50" onClick={(e) => handleSuggestVibe(e)}><RefreshCw className="mr-2 h-3.5 w-3.5"/> {buttonLabel('suggestVibe')}</Button>
                </Hint>
              </CardContent>
          </Card>

          <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-sm overflow-hidden">
              <CardHeader className="p-4 pb-2 flex-col items-start gap-1 space-y-0">
                <CardTitle className="text-sm flex items-center gap-2 text-indigo-400 font-headline uppercase"><Clapperboard className="h-4 w-4" /> Scene Gen</CardTitle>
                <p className="text-[9px] text-muted-foreground leading-snug font-code normal-case tracking-normal">
                  Builds a cinematic visual prompt from your lyrics and DNA, adds it to the Scratch Pad — copy from there into Runway, Kling, Pika, or mood boards.
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
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Combines lyrics, vibe, and direction into a shot list. After it runs, open the <strong className="text-foreground">Scratch Pad</strong>, copy the generated text, and paste into video AI tools (Runway, Kling, Pika, etc.) or mood boards.
                      </p>
                      <p className="text-[9px] font-mono text-primary">{tooltip('generateCoverArt')}</p>
                    </>
                  }
                >
                  <Button variant="outline" size="sm" disabled={trackLocked} className="w-full h-9 text-[9px] font-bold uppercase border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-400 disabled:opacity-50" onClick={(e) => handleGenerateScene(e)}>
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

function CenterPanel({ track, onUpdateTrack, handleSharedLineGeneration, activeGeneratorBar, setActiveGeneratorBar, activeBarText, setActiveBarText, setFreestyleOpen, album, setSmartStructureOpen, isRhymeLoading, activeSectionId, handleRunRhymeScan, generationOptions, setGenerationOptions, handleAcceptOption, handleDismissGenerationOptions, handleUndo, canUndo, isMinimized, setIsMinimized, mobileActive = true, leftCollapsed = false, rightCollapsed = false, trackLocked = false }: any) {
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
      if (trackLocked) {
        toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
        return;
      }
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
    if (trackLocked) return;
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
    album?.id,
    album?.direction?.enabled,
    track.direction?.enabled,
    track.direction?.inheritFromAlbum,
    track.vibe?.enabled,
    track.intentsEnabled,
    track.checkedIntents,
    track.endWith,
    track.guardrails?.enabled,
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

  const freestyleUnlocked = isProOrTrial(user);

  const handleOpenFreestyle = () => {
    if (trackLocked) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
    if (!freestyleUnlocked) return;
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
              <Button variant="outline" size="sm" disabled={trackLocked} data-tour="smart-structure" className="h-8 max-md:px-2 max-md:text-[9px] px-3 font-bold text-[10px] md:text-xs uppercase tracking-widest border-border/40 hover:bg-primary/5 text-muted-foreground hover:text-primary shrink-0 disabled:opacity-50" onClick={() => setSmartStructureOpen(true)}>
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
                      disabled={trackLocked || !canUndo}
                  >
                      <Undo2 className="h-4 w-4" />
                  </Button>
                </Hint>
                <div className="w-px h-4 bg-border/40 hidden lg:block shrink-0" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground hidden xl:inline shrink-0">Rhyme Focus</span>
                <Switch 
                  checked={track.rhymeHighlightingEnabled} 
                  onCheckedChange={(c) => onUpdateTrack({ rhymeHighlightingEnabled: c })} 
                  disabled={trackLocked}
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
                      disabled={trackLocked || isRhymeLoading}
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
              <div data-tour="lyrics-sheet-focus" className="flex flex-col items-center justify-center h-[400px] text-center gap-6 animate-in fade-in zoom-in duration-1000">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-2xl">
                      <NotebookPen className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-headline text-3xl font-bold uppercase tracking-tight text-white">Initialize Studio</h3>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Select a section in the left panel to begin your sheet.</p>
                  </div>
              </div>
          ) : (
            (track.sections || []).map((section: any, sectionIdx: number) => (
                <div key={section.id} className="relative">
                <div
                  id={`section-header-${section.id}`}
                  data-tour={sectionIdx === 0 ? 'lyrics-sheet-focus' : undefined}
                  style={{ height: `calc(${activeLineHeight} * 2)` }}
                  className="flex items-end pl-[120px] max-md:pl-[2rem]"
                >
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
                            <Hint skipOnTouch content={<p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p>}>
                              <Button variant="ghost" size="icon" disabled={trackLocked} aria-label="Generate next line" className="h-7 w-7 md:h-8 md:w-8 text-primary hover:bg-primary/10" onClick={(e) => handleSharedLineGeneration('next', e, section.id, bar.idx)}><ArrowDown className="h-3.5 w-3.5 md:h-4 md:w-4"/></Button>
                            </Hint>
                            <Hint skipOnTouch content={<p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p>}>
                              <Button variant="ghost" size="icon" disabled={trackLocked} aria-label="Generate previous line" className="h-7 w-7 md:h-8 md:w-8 text-primary hover:bg-primary/10" onClick={(e) => handleSharedLineGeneration('previous', e, section.id, bar.idx)}><ArrowUp className="h-3.5 w-3.5 md:h-4 md:w-4"/></Button>
                            </Hint>
                            <Button variant="ghost" size="icon" disabled={trackLocked} className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBar(section.id, bar.idx)}><Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4"/></Button>
                        </div>

                        <div className="flex-grow flex items-start min-w-0 h-full max-md:flex-1 relative overflow-hidden">
                            <textarea 
                            id={`bar-input-${section.id}-${bar.idx}`} 
                            value={bar.text} 
                            rows={1}
                            readOnly={trackLocked}
                            onKeyDown={(e) => handleKeyDown(e, section.id, bar.idx)}
                            onChange={(e: any) => { 
                                if (trackLocked) return;
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
                                trackLocked && "opacity-80 cursor-not-allowed",
                                fontSizes[fontSize]
                            )} 
                            style={{ minHeight: activeLineHeight, lineHeight: activeLineHeight, fontVariantLigatures: 'none' }}
                            placeholder={trackLocked ? 'Locked — reopen track to edit' : '...'} 
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

      <div data-tour="bar-workstation" className={cn("bg-card border-t shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0 z-[40] relative w-full min-w-0", isMinimized ? "h-10 overflow-hidden" : "min-h-[124px] max-md:max-h-[38dvh] max-md:overflow-y-auto max-md:studio-scrollbar")}>
        <div
          className={cn(
            'w-full min-w-0 h-full px-2 md:px-4 lg:px-6 flex flex-col',
            isMinimized ? 'justify-center py-0 overflow-hidden' : 'justify-start pt-0.5 pb-2.5 gap-0.5'
          )}
        >
            <div
              className={cn(
                'flex flex-row items-center justify-between gap-2 min-w-0 w-full',
                isMinimized ? 'h-full' : 'shrink-0 min-h-[28px] py-0.5 border-b border-white/5'
              )}
            >
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0 overflow-hidden">
                    <h4 className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] text-primary flex items-center gap-1 shrink-0 leading-none whitespace-nowrap"><Zap className="h-3 w-3 shrink-0" /> BAR WORKSTATION</h4>
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
                <div className="flex items-center gap-1.5 min-w-0 shrink self-center">
                    <div className="flex items-center justify-center gap-1.5 overflow-x-auto studio-scrollbar flex-nowrap max-w-[min(52vw,14rem)] md:max-w-[min(40vw,18rem)] lg:max-w-none py-px">
                        {ruleBadges.map((b) => (
                          <Badge
                            key={b.id}
                            variant="outline"
                            className={cn(
                              'text-[8px] md:text-[9px] font-bold uppercase h-[20px] px-2 inline-flex items-center justify-center leading-none whitespace-nowrap shrink-0',
                              getWorkstationRuleBadgeClass(b.id, true),
                              b.id === 'END WITH' && 'animate-pulse'
                            )}
                          >
                            {b.id}
                          </Badge>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0 -mr-0.5 self-center" onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            {!isMinimized && (
                <div className="flex max-md:flex-col md:flex-row md:items-center gap-2 mt-0.5 min-w-0 flex-1">
                    {generationOptions ? (
                        <div className="flex-grow flex max-md:flex-col md:flex-row gap-2 animate-in fade-in slide-in-from-bottom-4 min-w-0 py-0.5 w-full">
                            {generationOptions.map((opt, i) => (
                                <Button 
                                    key={i} 
                                    variant="outline" 
                                    className="flex-1 min-w-0 h-14 py-1 px-2 md:px-4 font-bold bg-primary/10 border-primary/40 hover:bg-primary/20 text-white text-left justify-start gap-2 group border-2 shadow-2xl transition-all w-full"
                                    disabled={trackLocked}
                                    onClick={() => handleAcceptOption(opt.line)}
                                >
                                    <div className="flex flex-col gap-0.5 shrink-0 border-r border-white/10 pr-2">
                                        <Badge className="bg-primary text-[8px] h-4 px-1 uppercase leading-none whitespace-nowrap">Opt {i+1}</Badge>
                                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter leading-none">{opt.syllables} SYLL</span>
                                    </div>
                                    <span className="text-xs md:text-sm leading-tight tracking-tight flex-1 min-w-0 break-words line-clamp-2">{opt.line}</span>
                                </Button>
                            ))}
                            <Button variant="ghost" size="icon" onClick={handleDismissGenerationOptions} className="h-10 w-10 md:h-14 md:w-10 shrink-0 text-muted-foreground hover:text-red-500 bg-white/5 border border-white/10 rounded-lg">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex max-md:flex-col md:flex-row md:items-center gap-2 min-w-0 w-full flex-1">
                            <textarea 
                                placeholder="Tap to edit active line..."
                                value={activeBarText} 
                                onKeyDown={handleBarSyncEnter}
                                readOnly={trackLocked}
                                onChange={(e: any) => { 
                                    if (trackLocked) return;
                                    setActiveBarText(e.target.value); 
                                    if (activeGeneratorBar) onUpdateTrack({ sections: track.sections.map((s: any) => s.id === activeGeneratorBar.sectionId ? { ...s, bars: s.bars.map((b: any) => b.idx === activeGeneratorBar.idx ? { ...b, text: e.target.value } : b) } : s) }); 
                                }} 
                                className={cn("bg-background/40 border border-white/10 w-full md:flex-1 md:min-w-[5rem] px-3 py-2 font-code font-bold text-sm shadow-inner rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 tracking-tight resize-none h-14 max-h-14 shrink-0 min-w-0", trackLocked && "opacity-70 cursor-not-allowed")}
                            />
                            <div className={cn(
                              "flex flex-row flex-nowrap items-center gap-1.5 shrink-0 min-w-0 max-md:w-full overflow-x-auto studio-scrollbar md:overflow-visible md:max-w-[min(100%,22rem)] lg:max-w-none py-0.5",
                              !activeGeneratorBar && "max-md:hidden"
                            )}>
                                <Hint skipOnTouch content={<p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p>}>
                                  <Button variant="outline" size="sm" disabled={trackLocked} aria-label="Generate next line" className="h-10 md:h-14 px-2 md:px-3 font-bold text-[10px] uppercase border-border/40 gap-1 shadow-lg shrink-0" onClick={(e) => handleSharedLineGeneration('next', e)}>
                                      <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="hidden sm:inline truncate">Next</span>
                                  </Button>
                                </Hint>
                                <Hint skipOnTouch content={<p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p>}>
                                  <Button variant="outline" size="sm" disabled={trackLocked} aria-label="Generate previous line" className="h-10 md:h-14 px-2 md:px-3 font-bold text-[10px] uppercase border-border/40 gap-1 shadow-lg shrink-0" onClick={(e) => handleSharedLineGeneration('previous', e)}>
                                      <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span className="hidden sm:inline truncate">Prev</span>
                                  </Button>
                                </Hint>
                                <Button variant="outline" size="sm" disabled={trackLocked} aria-label="Delete line" className="h-10 md:h-14 w-10 md:w-11 font-bold border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 shadow-lg shrink-0 px-0" onClick={() => { if(activeGeneratorBar) handleDeleteBar(activeGeneratorBar.sectionId, activeGeneratorBar.idx); }}><Trash2 className="h-4 w-4 mx-auto" /></Button>
                                {freestyleUnlocked ? (
                                  <Button variant="secondary" size="sm" disabled={trackLocked} aria-label="Freestyle recording" className="h-10 md:h-14 px-2 md:px-4 font-bold text-[10px] uppercase tracking-wide gap-1 bg-primary/20 text-primary border border-primary/20 shadow-lg shrink-0 min-w-0" onClick={handleOpenFreestyle} title={tooltip('freestyleTranscription')}>
                                    <Mic className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate hidden md:inline">Free</span>
                                  </Button>
                                ) : (
                                  <LockedProFeatureButton
                                    feature="Freestyle Recording"
                                    benefit="Capture voice memos and drop transcribed bars onto your sheet in the flow."
                                    example="Record a 30-second freestyle and paste the bars mid-verse without leaving the workstation."
                                    icon={Mic}
                                    iconClassName="text-primary"
                                    label={<span className="truncate hidden md:inline">Free</span>}
                                    className="h-10 md:h-14 px-2 md:px-4 font-bold text-[10px] uppercase tracking-wide shadow-lg shrink-0 min-w-0 bg-primary/20 text-primary border border-primary/20"
                                  />
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

function cowriterSectionSubtitle(expanded: boolean) {
  return cn(
    'text-[9px] font-bold uppercase tracking-widest leading-snug',
    expanded ? 'break-words' : 'whitespace-normal'
  );
}

function RightPanel({ track, album, onUpdateTrack, styleProfile, updateStyleProfile, scratchPadRef, activeSectionId, rightCollapsed, onCollapse, improveStyleOpen, setImproveStyleOpen, styleVaultOpen, setStyleVaultOpen, handleSharedLineGeneration, updateAlbum, clearStyleProfile, setSaveStyleNamingOpen, isPro, sectionOpen, onSectionChange, openCoWriterSections, onApplyChestEntry, mobileActive = false, trackLocked = false, completeLocked = false, tourMobilePad = false }: any) {
  const { user } = useAuth();
  const { tooltip, buttonLabel } = useInkCosts();
  const activeSection = track.sections.find((s:any) => s.id === activeSectionId);
  const { toast } = useToast();
  const [dnaVaultOpen, setDNAVaultOpen] = useState(false);
  const [vibeVaultOpen, setVibeVaultOpen] = useState(false);
  const [archivalDialog, setArchivalDialog] = useState<{ open: boolean, type: 'DNA' | 'Vibe' }>({ open: false, type: 'DNA' });
  const [editIntentDialog, setEditIntentDialog] = useState<{ open: boolean, intent: string }>({ open: false, intent: '' });
  const [newIntent, setNewIntent] = useState('');
  const currentMetrics = styleProfile?.history[0]?.metrics;
  const dnaInjectHandlers = useMemo(
    () =>
      createCoWriterDnaInjectHandlers({
        track,
        album,
        onUpdateTrack,
        updateAlbum,
        updateStyleProfile,
        openCoWriterSections,
        toast,
      }),
    [track, album, onUpdateTrack, updateAlbum, updateStyleProfile, openCoWriterSections, toast]
  );

  const handleToggleDNA = (enabled: boolean) => {
    onUpdateTrack({
      direction: directionWithSyncedEnabled(
        { ...(track.direction || {}), enabled },
        enabled
      ),
    });
  };

  const handleDNAFieldUpdate = (field: keyof Direction, value: string) => {
    const merged = { ...(track.direction || {}), [field]: value };
    onUpdateTrack({
      direction: directionWithSyncedEnabled(
        merged,
        hasCreativeDnaContent(merged) ? true : false
      ),
    });
  };

  const handleGuardrailsPatch = (patch: Partial<NonNullable<Track['guardrails']>>) => {
    onUpdateTrack({
      guardrails: guardrailsWithSyncedEnabled(track.guardrails, patch),
    });
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
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Save custom DNA profiles with Studio Pro.' });
        return;
      }
      if (!album) return;
      const profile = buildDnaPresetFromDirection({
          name,
          sourceTrackTitle: track.title,
          direction: track.direction ?? { enabled: true },
          intents: track.checkedIntents,
      });
      const styleEntry = styleProfile?.history?.[0];
      if (styleEntry?.analysis?.trim()) {
        profile.styleAnalysis = styleEntry.analysis;
        profile.styleMetrics = styleEntry.metrics ?? DEFAULT_STYLE_METRICS;
      }
      const existing = album.dnaPresets || [];
      updateAlbum(album.id, { dnaPresets: [...existing, profile] });
      toast({
        title: 'DNA profile saved',
        description: `"${name}" saved to your vault.`,
      });
      void postGamificationEvent('dna_preset_saved');
      if (user?.id) {
        void recordProTrialVaultSave(user.id, isProFeaturePreviewActive(user));
      }
  };

  const handleConfirmSaveVibe = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Save vibe presets with Studio Pro.' });
        return;
      }
      if (!track.vibe) return;
      const preset = { ...track.vibe, name, createdAt: new Date().toISOString() };
      const existing = track.vibePresets || [];
      onUpdateTrack({ vibePresets: [...existing, preset] });
      toast({ title: 'Vibe profile saved', description: `"${name}" saved to your vault.` });
  };

  const isLooseTrack = isLooseTrackAlbum(album);
  const dnaActive = isTrackDnaActive(track);
  const inheritFromAlbumOn = isInheritFromAlbumOn(track, album);
  const trackDnaFieldsEditable = true;
  const dnaSectionLit = dnaActive || inheritFromAlbumOn;
  const dnaCollapsedInherit = !sectionOpen.dna && inheritFromAlbumOn;
  const vibeActive = isVibeActive(track);
  const intentsMasterOn = isIntentsMasterEnabled(track);
  const guardActive = isGuardrailsActive(track);
  const styleActive = isStyleActive(track);

  if (rightCollapsed && !mobileActive) {
    return (
        <div className={cn("flex flex-col items-center h-full bg-card border-l w-[56px] shrink-0 overflow-hidden py-6 z-30", mobileLyricsPanelClass(mobileActive, 'right'))}>
            <NeuralStripItem text="DNA" color="#10b981" active={dnaSectionLit || isAlbumDnaActive(track, album)} onClick={() => onCollapse(false)} />
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
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground">Co-Writer Panel</h3>
        {!mobileActive && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCollapse(true)}
            aria-label="Minimize Co-Writer panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto studio-scrollbar">
        <div className={cn('p-4 space-y-4 co-writer-body', tourMobilePad ? 'pb-36' : 'pb-32')}>
          {completeLocked && (
            <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/15 px-3 py-2.5 flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-[10px] font-code text-amber-50/95 leading-snug">
                <span className="font-bold uppercase tracking-wide text-amber-200">Co-Writer locked.</span>{' '}
                Use <span className="font-bold text-amber-300">Reopen Track</span> in the left panel Track Status section, or the banner button at the top.
              </p>
            </div>
          )}
          <fieldset disabled={trackLocked} className="min-w-0 border-0 p-0 m-0 space-y-4 disabled:[&_button]:pointer-events-none disabled:[&_input]:pointer-events-none disabled:[&_textarea]:pointer-events-none disabled:[&_[role=switch]]:pointer-events-none">
          <Collapsible open={sectionOpen.dna} onOpenChange={(o) => onSectionChange('dna', o)} className="space-y-1">
            <Card
              className={cn(
                coWriterSectionCardClass(dnaSectionLit, 'border-green-500/30 bg-green-500/5'),
                inheritFromAlbumOn && 'border border-dashed border-emerald-500/35'
              )}
              data-tour="dna-suite"
            >
                <div className={cn('p-4 flex flex-col gap-2', !sectionOpen.dna && 'pb-3')}>
                <div
                  data-tour="dna-suite-header"
                  className="flex flex-row items-center justify-between space-y-0"
                >
                    <CollapsibleTrigger asChild>
                        <div className="space-y-0.5 cursor-pointer flex-grow min-w-0 pr-1">
                            <CardTitle
                              className={cn(
                                'text-sm flex items-center gap-2 font-headline uppercase leading-none',
                                dnaCollapsedInherit
                                  ? 'text-green-500'
                                  : coWriterSectionTitleClass(dnaSectionLit, 'text-green-500')
                              )}
                            >
                              <Dna
                                className={cn(
                                  'h-4 w-4 shrink-0',
                                  dnaSectionLit || dnaCollapsedInherit ? 'text-green-500' : 'text-muted-foreground/55'
                                )}
                              />
                              DNA Suite
                            </CardTitle>
                            <p
                              className={cn(
                                cowriterSectionSubtitle(sectionOpen.dna),
                                dnaCollapsedInherit
                                  ? 'text-green-400/90'
                                  : coWriterSectionAccentClass(dnaSectionLit, 'text-green-400/80')
                              )}
                              title={
                                sectionOpen.dna
                                  ? 'Creative Direction Questions'
                                  : isLooseTrack
                                    ? 'Loose track — track DNA only'
                                    : inheritFromAlbumOn
                                      ? 'Inherit From Album is on'
                                      : 'Track DNA only — album inherit off'
                              }
                            >
                              {sectionOpen.dna
                                ? 'Creative Direction Questions'
                                : isLooseTrack
                                  ? 'Loose track · Track DNA only'
                                  : inheritFromAlbumOn
                                    ? 'Creative DNA · Inherit from album'
                                    : 'Track DNA only'}
                            </p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1 shrink-0">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); setArchivalDialog({ open: true, type: 'DNA' }); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton
                            feature="DNA Save"
                            benefit="Save your own DNA profiles to the vault. Free artists load from 2 system presets."
                            example='Example: save "Chicago Noir DNA" once, load it on every track in the album.'
                            icon={Save}
                            iconClassName="text-green-600"
                            className="h-6 w-6 text-green-600 hover:bg-green-500/10"
                          />
                        )}
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); setDNAVaultOpen(true); }} aria-label={isPro ? 'Open DNA vault' : 'Load DNA system presets'}><FolderOpen className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px] text-[10px] leading-snug">
                              {isPro ? 'Load saved DNA profiles from your vault.' : '2 system DNA presets included on Free — tap to load strains or full profiles.'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Switch
                          checked={isTrackDnaToggleOn(track)}
                          onCheckedChange={handleToggleDNA}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Track DNA enabled"
                        />
                    </div>
                </div>
                {!sectionOpen.dna && !isLooseTrack && (
                  <div
                    className={cn(
                      'flex items-center justify-between gap-2 pt-2 border-t',
                      inheritFromAlbumOn ? 'border-green-500/25' : 'border-green-500/10'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase',
                        inheritFromAlbumOn ? 'text-green-400/95' : 'text-green-300/90'
                      )}
                    >
                      Inherit From Album
                    </span>
                    <Switch
                      checked={track.direction?.inheritFromAlbum ?? true}
                      onCheckedChange={(c) => onUpdateTrack({ direction: { ...track.direction, inheritFromAlbum: c } })}
                      className="scale-75"
                      aria-label="Inherit from album"
                    />
                  </div>
                )}
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-3 px-4 pb-4 font-code">
                        {sectionOpen.dna && !isLooseTrack && (
                        <div className="flex items-center justify-between py-1 border-b border-green-500/10">
                            <span className="text-[10px] font-bold text-green-300/90 uppercase">Inherit From Album</span>
                            <Switch 
                                checked={track.direction?.inheritFromAlbum ?? true} 
                                onCheckedChange={(c) => onUpdateTrack({ direction: { ...track.direction, inheritFromAlbum: c } })}
                                className="scale-75"
                            />
                        </div>
                        )}
                        {sectionOpen.dna && isLooseTrack && (
                          <p className="text-[9px] font-bold uppercase text-green-400/70 leading-snug border-b border-green-500/10 pb-2">
                            Loose track — no album blueprint. Set Creative DNA on this track only.
                          </p>
                        )}
                        {inheritFromAlbumOn && !isTrackDnaToggleOn(track) && (
                          <p className="text-[9px] font-bold uppercase text-green-400/55 leading-snug">
                            Track DNA is off for AI — type in any field to turn it on, or use the switch.
                          </p>
                        )}
                        {[
                            { id: 'setting_world', label: '1. Setting / World', placeholder: 'It takes place in ____.' },
                            { id: 'emotion_core', label: '2. Emotion / Core', placeholder: 'It feels like ____.' },
                            { id: 'trigger_moment', label: '3. Trigger Moment', placeholder: 'Everything changed when ____.' },
                            { id: 'message_truth', label: '4. Message / Truth', placeholder: 'Deep down, it’s really about ____.' },
                            { id: 'tone_palette', label: '5. Tone / Palette', placeholder: 'It sounds/looks like ____.' }
                        ].map(f => (
                            <div key={f.id} className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-green-300/85">{f.label}</Label>
                                <textarea 
                                    placeholder={f.placeholder} 
                                    disabled={!trackDnaFieldsEditable}
                                    className={cn(
                                      'w-full bg-background/40 border border-green-500/10 rounded-md p-2 text-[12px] text-foreground/90 studio-scrollbar resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-green-500/30',
                                      !trackDnaFieldsEditable &&
                                        'opacity-40 cursor-not-allowed bg-neutral-950/40 border-white/10 text-muted-foreground/70'
                                    )}
                                    style={{ minHeight: '40px' }}
                                    value={track.direction?.[f.id as keyof Direction] as string || ''}
                                    onChange={(e:any) => {
                                        if (!trackDnaFieldsEditable) return;
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                        handleDNAFieldUpdate(f.id as any, e.target.value);
                                    }}
                                    onFocus={(e:any) => {
                                        if (!trackDnaFieldsEditable) return;
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
            <Card className={coWriterSectionCardClass(vibeActive, 'border-amber-500/30 bg-amber-500/5')}>
                <div className="p-4 flex flex-row items-center justify-between space-y-0">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CollapsibleTrigger asChild>
                            <div className="space-y-0.5 cursor-pointer flex-grow min-w-0 overflow-hidden pr-1 text-left">
                              <CardTitle className={cn('text-sm flex items-center gap-2 font-headline uppercase leading-none truncate', coWriterSectionTitleClass(vibeActive, 'text-amber-500'))}><Palette className="h-4 w-4 shrink-0" /> Track Vibe</CardTitle>
                              <p className={cn(cowriterSectionSubtitle(sectionOpen.vibe), coWriterSectionAccentClass(vibeActive, 'text-amber-400/80'))}>
                                {sectionOpen.vibe ? 'Instrumentation & Atmosphere' : 'Vibe & Production'}
                              </p>
                            </div>
                          </CollapsibleTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[280px] space-y-1">
                          <p className="text-[10px] font-bold leading-snug">Track Vibe → music AI prompts</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            Set genre, BPM, and instrumentation here. Hover the Instrumentation field and tap the copy icon, then paste into Suno, Udio, or similar tools as your style / production prompt. Use <strong className="text-foreground">Vibe Suggester</strong> in the Workstation left panel to auto-fill from your lyrics.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600 hover:bg-amber-500/10" onClick={(e) => { e.stopPropagation(); setArchivalDialog({ open: true, type: 'Vibe' }); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton
                            feature="Vibe Save"
                            benefit="Save custom track vibes. Free artists load from 2 system vibe presets."
                            example="Example: save your 90 BPM lofi-hop vibe and reload it on the next song."
                            icon={Save}
                            iconClassName="text-amber-600"
                            className="h-6 w-6 text-amber-600 hover:bg-amber-500/10"
                          />
                        )}
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600 hover:bg-amber-500/10" onClick={(e) => { e.stopPropagation(); setVibeVaultOpen(true); }} aria-label={isPro ? 'Open vibe vault' : 'Load vibe system presets'}><FolderOpen className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px] text-[10px] leading-snug">
                              {isPro ? 'Load saved vibe presets from your vault.' : '2 system vibe presets included on Free — Neo-Classical Ethereal & Dark Cinematic Trap.'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Switch checked={track.vibe?.enabled ?? true} onCheckedChange={(c) => onUpdateTrack({ vibe: { ...track.vibe, enabled: c } })} />
                    </div>
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-3 px-4 pb-4 font-code">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-amber-300/85">Genre</Label>
                                <Input 
                                    value={track.vibe.genre} 
                                    onChange={(e) => onUpdateTrack({ vibe: { ...track.vibe, genre: e.target.value } })}
                                    className="h-8 text-[12px] text-foreground/90 bg-background/40 border-amber-500/10"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-amber-300/85">BPM</Label>
                                <Input 
                                    type="number" 
                                    value={track.vibe.tempoBPM} 
                                    onChange={(e) => onUpdateTrack({ vibe: { ...track.vibe, tempoBPM: parseInt(e.target.value) || 90 } })}
                                    className="h-8 text-[12px] text-foreground/90 bg-background/40 border-amber-500/10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Label className="text-[10px] font-bold uppercase text-amber-300/85 cursor-help w-fit">Instrumentation</Label>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[260px] space-y-1">
                                  <p className="text-[10px] font-bold leading-snug">Paste into Suno / Udio</p>
                                  <p className="text-[10px] text-muted-foreground leading-snug">
                                    This is your production string — copy it and drop it into a music AI&apos;s style or prompt field. Combine with genre + BPM above for best results.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                                    className="w-full bg-background/40 border border-amber-500/10 rounded-md p-2 pr-8 text-[12px] text-foreground/90 studio-scrollbar resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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
            <Card className={coWriterSectionCardClass(intentsMasterOn, 'border-sky-500/30 bg-[#0c1a26] shadow-xl overflow-hidden p-0')}>
                <div className="flex items-center justify-between p-4 pb-2">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CollapsibleTrigger asChild>
                            <div className="space-y-1 cursor-pointer flex-grow min-w-0 overflow-hidden text-left pr-1">
                              <div className="flex items-center gap-2 min-w-0">
                                  <Target className={cn('h-5 w-5 shrink-0', coWriterSectionTitleClass(intentsMasterOn, 'text-sky-400'))} />
                                  <h3 className={cn('font-headline font-bold text-xl uppercase tracking-tighter truncate', coWriterSectionTitleClass(intentsMasterOn, 'text-sky-400'))}>Intents</h3>
                              </div>
                              <p
                                className={cn(
                                  'text-[10px] text-foreground/75 font-code normal-case tracking-normal',
                                  sectionOpen.intents ? 'leading-snug break-words' : 'leading-none truncate'
                                )}
                                title="Punchlines and lines to weave into this track."
                              >
                                {sectionOpen.intents
                                  ? 'Punchlines and lines to weave into this track.'
                                  : 'Motifs & punchlines'}
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
                    <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={track.intentsEnabled ?? (track.checkedIntents?.length > 0)} onCheckedChange={(c) => onUpdateTrack({ intentsEnabled: c })} />
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0 -mr-0.5 self-center"
                            aria-label={sectionOpen.intents ? 'Collapse Intents' : 'Expand Intents'}
                          >
                            {sectionOpen.intents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-4 p-4 pt-4 min-w-0">
                        <div className="space-y-2 min-w-0">
                            {(album?.thingsToSay || []).map((intent: string) => {
                                const isLocked = track.endWith === intent;
                                const isChecked = (track.checkedIntents || []).includes(intent);
                                return (
                                    <div key={intent} className={coWriterIntentRowClass(intentsMasterOn, isLocked)}>
                                        <Checkbox 
                                            checked={isChecked || isLocked} 
                                            onCheckedChange={(c) => handleIntentCheck(intent, !!c)} 
                                            className="border-sky-500 data-[state=checked]:bg-sky-500 shrink-0 mt-0.5"
                                        />
                                        <span className={cn(
                                            "text-xs font-code flex-1 min-w-0 whitespace-normal break-words leading-snug",
                                            isLocked ? "text-sky-300 font-bold" : "text-foreground/85"
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
                                className="h-9 bg-background/40 border-sky-500/10 text-xs text-foreground/90 font-code" 
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
            <Card className={coWriterSectionCardClass(guardActive, 'border-rose-500/30 bg-rose-500/5')}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="p-4 flex-row items-center justify-between cursor-pointer space-y-0">
                        <div className="space-y-0.5 min-w-0 flex-grow pr-1">
                            <CardTitle className={cn('text-sm flex items-center gap-2 font-headline uppercase leading-none', coWriterSectionTitleClass(guardActive, 'text-rose-500'))}><Shield className="h-4 w-4" /> Guardrails</CardTitle>
                            <p className={cn(cowriterSectionSubtitle(sectionOpen.guardrails), coWriterSectionAccentClass(guardActive, 'text-rose-400/80'))} title="Content Restrictions">
                              Content Restrictions
                            </p>
                        </div>
                        <Switch
                          checked={isGuardrailsToggleOn(track)}
                          onCheckedChange={(c) => handleGuardrailsPatch({ enabled: c })}
                          onClick={(e) => e.stopPropagation()}
                        />
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-3 px-4 pb-4 font-code">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-rose-300/85">Negative Prompt (Avoid)</Label>
                            <Textarea 
                                placeholder="e.g. violence, generic love cliches..." 
                                className="text-[11px] text-foreground/90 bg-background/50 border-rose-500/10 min-h-[40px]" 
                                value={track.guardrails?.negativePrompt ?? ''}
                                onChange={(e) => handleGuardrailsPatch({ negativePrompt: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-rose-300/85">Forbidden Words</Label>
                            <Input 
                                placeholder="Must be separated by comma" 
                                className="h-8 text-[11px] text-foreground/90 bg-background/50 border-rose-500/10" 
                                value={(track.guardrails?.forbiddenWords || []).join(', ')}
                                onChange={(e) =>
                                  handleGuardrailsPatch({
                                    forbiddenWords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean),
                                  })
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-rose-300/85">Must-Include Words</Label>
                            <Input 
                                placeholder="Must include specific phrase" 
                                className="h-8 text-[11px] text-foreground/90 bg-background/50 border-rose-500/10" 
                                value={(track.guardrails?.mustIncludeWords || []).join(', ')}
                                onChange={(e) =>
                                  handleGuardrailsPatch({
                                    mustIncludeWords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean),
                                  })
                                }
                            />
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={sectionOpen.coWriter} onOpenChange={(o) => onSectionChange('coWriter', o)} className="space-y-1">
            <Card className={coWriterSectionCardClass(styleActive, 'border-fuchsia-500/30 bg-fuchsia-500/5 shadow-xl')}>
                <div className="p-4 flex flex-row items-center justify-between space-y-0">
                    <CollapsibleTrigger asChild>
                        <div className="space-y-0.5 cursor-pointer flex-grow min-w-0 overflow-hidden pr-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className={cn('text-sm flex items-center gap-2 font-headline uppercase leading-none', coWriterSectionTitleClass(styleActive, 'text-fuchsia-500'))}><BrainCircuit className="h-4 w-4" /> AI Co-Writer</CardTitle>
                            </div>
                            <p className={cn(cowriterSectionSubtitle(sectionOpen.coWriter), coWriterSectionAccentClass(styleActive, 'text-fuchsia-400/80'))} title="Neural Sharpening Tools">
                              {sectionOpen.coWriter ? 'Neural Sharpening Tools' : 'Style & AI Tools'}
                            </p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-fuchsia-500 hover:bg-fuchsia-500/10" onClick={(e) => { e.stopPropagation(); setSaveStyleNamingOpen(true); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton
                            feature="Style DNA Save"
                            benefit="Save your trained style profile. Free artists load from 2 system style presets."
                            example="Example: save your clipped cadence profile after Style Training."
                            icon={Save}
                            iconClassName="text-fuchsia-500"
                            className="h-6 w-6 text-fuchsia-500 hover:bg-fuchsia-500/10"
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
                                <Label className="text-[10px] font-bold uppercase text-fuchsia-300/85">Technical DNA</Label>
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
                                            <div className="flex justify-between text-[9px] font-bold uppercase text-foreground/85"><span>Vocab Variety</span><span>{currentMetrics.vocabularyScore}%</span></div>
                                            <Progress value={currentMetrics.vocabularyScore} className="h-1 bg-fuchsia-500/10" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold uppercase text-foreground/85"><span>Rhyme Complexity</span><span>{currentMetrics.rhymeComplexity}%</span></div>
                                            <Progress value={currentMetrics.rhymeComplexity} className="h-1 bg-fuchsia-500/10" />
                                        </div>
                                        <div className="pt-1 flex items-center gap-2">
                                            <Badge variant="outline" className="text-[8px] border-fuchsia-500/20 text-fuchsia-400 py-0.5 px-2 bg-fuchsia-500/5 uppercase">{currentMetrics.cadenceMap}</Badge>
                                        </div>
                                        <p className="text-[10px] text-foreground/75 leading-relaxed italic border-t border-white/5 pt-2 mt-1">"{styleProfile?.history[0]?.analysis}"</p>
                                    </>
                                ) : (
                                    <div className="py-4 text-center">
                                        <p className="text-[10px] text-foreground/70 uppercase tracking-widest font-bold">Awaiting neural training...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 h-9 font-bold text-[10px] uppercase border-border/40 gap-2 shadow-sm" onClick={(e) => handleSharedLineGeneration('previous', e)} title={tooltip('generateNextLine')}>
                                <ArrowUp className="h-3 w-3 text-primary" /> PREV
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 h-9 font-bold text-[10px] uppercase border-border/40 gap-2 shadow-sm" onClick={(e) => handleSharedLineGeneration('next', e)} title={tooltip('generateNextLine')}>
                                <ArrowDown className="h-3 w-3 text-primary" /> NEXT
                            </Button>
                        </div>

                        <Button variant="outline" className="w-full h-10 border-fuchsia-500/20 bg-background/40 text-fuchsia-400 font-bold text-[11px] uppercase gap-2 hover:bg-fuchsia-500/5 shadow-inner" onClick={() => setImproveStyleOpen(true)}>
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
            isOpen={sectionOpen.creativeEffects}
            onOpenChange={(o) => onSectionChange('creativeEffects', o)}
          />
          
          <ScratchPad
            ref={scratchPadRef}
            isOpen={sectionOpen.scratchPad}
            onOpenChange={(o) => onSectionChange('scratchPad', o)}
          />

          <DraftChest
            entries={track.draftChest ?? []}
            disabled={trackLocked}
            isOpen={sectionOpen.draftChest}
            onOpenChange={(o) => onSectionChange('draftChest', o)}
            onChange={(entries) => onUpdateTrack({ draftChest: entries })}
            onApplyEntry={onApplyChestEntry}
          />
          </fieldset>
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
            ...(() => {
              const guide =
                p.structureGuide?.trim() ||
                (p.analysis?.structure?.trim() ? `[Structure] ${p.analysis.structure.trim()}` : '');
              if (!guide) return {};
              const prev = track.specialInstructions?.trim() ?? '';
              return {
                specialInstructions:
                  prev && !prev.includes(guide) ? `${prev}\n${guide}` : prev || guide,
              };
            })(),
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
          openCoWriterSections?.(COWRITER_SUITE_SECTION_KEYS);
          toast({ title: 'Full DNA Profile Loaded' });
        }}
        injectHandlers={dnaInjectHandlers}
        isPro={isPro}
      />
      <VibeVaultDialog open={vibeVaultOpen} onOpenChange={setVibeVaultOpen} track={track} onUpdateTrack={onUpdateTrack} onApply={(v: any) => onUpdateTrack({ vibe: v })} isPro={isPro} />
      <StyleVaultDialog open={styleVaultOpen} onOpenChange={setStyleVaultOpen} album={album} updateAlbum={updateAlbum} onApply={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} isPro={isPro} />
      <ArchivalNamingDialog
        open={archivalDialog.open}
        onOpenChange={(o: boolean) => setArchivalDialog((prev) => ({ ...prev, open: o }))}
        type={archivalDialog.type}
        sourceTrackTitle={track.title}
        onConfirm={archivalDialog.type === 'DNA' ? handleConfirmSaveDNA : handleConfirmSaveVibe}
      />
      <EditIntentDialog open={editIntentDialog.open} onOpenChange={(o:any) => setEditIntentDialog(prev => ({ ...prev, open: o }))} initialValue={editIntentDialog.intent} onConfirm={handleConfirmEditIntent} />
    </div>
  );
}

// --- Main Workstation Component ---

function TrackEditorImplementation({ trackId, albumId }: { trackId: string, albumId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const isPro = isProOrTrial(user);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const { toast } = useToast();
  const { getTrackById, updateTrack, styleProfile, updateStyleProfile, updateAlbum, albums, loading: vaultLoading } = useContext(DataContext);
  const { setGenerating } = useUIState();
  const { refundInk, addUsageLog, registerAiContext } = useUsage();
  const { getEffectiveCost } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();
  const searchParams = useSearchParams();

  const isMobileLayout = useIsMobile();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState<MobileLyricsTab>('lyrics');
  const [sectionOpen, setSectionOpen] = useState<CoWriterSections>(DEFAULT_SECTIONS_CLOSED);
  const uiHydratedRef = useRef(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeGeneratorBar, setActiveGeneratorBar] = useState<{ sectionId: string, idx: number } | null>(null);
  const [activeBarText, setActiveBarText] = useState('');
  
  const [generateDraftOpen, setGenerateDraftOpen] = useState(false);
  const [generatorInitialMode, setGeneratorInitialMode] = useState<'select' | 'remix'>('select');
  const openRemixHandledRef = useRef(false);
  const openGeneratorHandledRef = useRef(false);
  const [workstationBackgroundActive, setWorkstationBackgroundActive] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
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

  const openCoWriterSections = useCallback((keys: CoWriterSectionKey | CoWriterSectionKey[]) => {
    setRightCollapsed(false);
    setMobilePanelTab('cowriter');
    const list = Array.isArray(keys) ? keys : [keys];
    setSectionOpen((prev) => {
      const next = { ...prev };
      for (const key of list) {
        next[key] = true;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (track && album) {
      registerAiContext({ track, album, styleProfile: effectiveStyleProfile });
    }
    return () => registerAiContext(null);
  }, [track, album, effectiveStyleProfile, registerAiContext]);

  useEffect(() => {
    if (vaultLoading) {
      setInitTimedOut(false);
      return;
    }
    if (track && album) {
      setInitTimedOut(false);
      return;
    }

    const currentPath = `/albums/${albumId}/tracks/${trackId}`;
    if (!trackExistsInVault(albums, currentPath)) {
      clearStaleLastWorkedTrackPath();
      const fallback = resolveWorkstationTrackPath(albums);
      const openGenerator = searchParams.get('openGenerator');
      if (fallback) {
        const dest =
          openGenerator === 'remix'
            ? appendQuery(fallback, { openGenerator: 'remix' })
            : fallback;
        router.replace(dest);
        return;
      }
      router.replace('/');
      return;
    }

    setInitTimedOut(false);
    const t = setTimeout(() => setInitTimedOut(true), 12000);
    return () => clearTimeout(t);
  }, [albumId, trackId, vaultLoading, track, album, albums, router, searchParams]);

  const clearWorkstationOpenParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('openGenerator') && !params.has('proQuest')) return;
    params.delete('openGenerator');
    params.delete('proQuest');
    const qs = params.toString();
    const clean = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    router.replace(clean);
  }, [router, searchParams]);

  const openRemixWorkstation = useCallback(() => {
    if (!track || !album) return false;
    setGeneratorInitialMode('remix');
    setGenerateDraftOpen(true);
    openRemixHandledRef.current = true;
    openGeneratorHandledRef.current = true;
    clearWorkstationOpenParams();
    return true;
  }, [track, album, clearWorkstationOpenParams]);

  useEffect(() => {
    openRemixHandledRef.current = false;
    openGeneratorHandledRef.current = false;
  }, [albumId, trackId]);

  useEffect(() => {
    if (vaultLoading || !track || !album) return;

    const fromUrl =
      searchParams.get('openGenerator') === 'remix' ||
      searchParams.get('proQuest') === 'dna';
    const fromPending = consumePendingOpenGeneratorRemix();

    if (fromUrl || fromPending) {
      openRemixWorkstation();
      return;
    }

    const openGenerator = searchParams.get('openGenerator');
    if (openGenerator === 'true' && !openGeneratorHandledRef.current) {
      openGeneratorHandledRef.current = true;
      setGeneratorInitialMode('select');
      setGenerateDraftOpen(true);
      clearWorkstationOpenParams();
    }
  }, [vaultLoading, track, album, searchParams, openRemixWorkstation, clearWorkstationOpenParams]);

  useEffect(() => {
    const onOpenRemix = () => {
      if (vaultLoading || !track || !album) {
        markPendingOpenGeneratorRemix();
        return;
      }
      openRemixWorkstation();
    };
    window.addEventListener(OPEN_GENERATOR_REMIX_EVENT, onOpenRemix);
    return () => window.removeEventListener(OPEN_GENERATOR_REMIX_EVENT, onOpenRemix);
  }, [vaultLoading, track, album, openRemixWorkstation]);

  useEffect(() => {
    const syncVisibility = () => setPageVisible(document.visibilityState === 'visible');
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  const workstationAttention = workstationBackgroundActive && !generateDraftOpen && pageVisible;

  useEffect(() => {
    if (albumId && trackId) {
      persistLastWorkedTrack(`/albums/${albumId}/tracks/${trackId}`);
    }
  }, [albumId, trackId]);

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
    // User chose Enter Workstation or Pro trial quest — skip lyrics tour so the generator can open cleanly.
    if (
      searchParams.get('openGenerator') === 'true' ||
      searchParams.get('openGenerator') === 'remix' ||
      searchParams.get('proQuest') === 'dna' ||
      hasPendingOpenGeneratorRemix() ||
      openRemixHandledRef.current
    ) {
      tourAutoStartRef.current = true;
      return;
    }
    tourAutoStartRef.current = true;
    const t = setTimeout(() => setTourActive(true), 1200);
    return () => clearTimeout(t);
  }, [user, track, searchParams]);

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
    queueStudioPrivacyIntro();
    window.setTimeout(() => dispatchStudioPrivacyIntroEligible(), 400);
  }, [user]);

  useEffect(() => {
    if (track && track.sections.length > 0 && !activeSectionId) {
        setActiveSectionId(track.sections[0].id);
    }
  }, [track, activeSectionId]);

  useEffect(() => {
    if (!track) return;
    if (isTrackLocked(track)) return;
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
  }, [track?.sections, track?.status, albumId, trackId, updateTrack]);

  const tierLocked = track ? isTrackOverTierLimit(trackId, albumId, albums, user) : false;
  const tierLimitBanner = useMemo(
    () => getTrackLimitBanner(user, albums),
    [user, albums]
  );
  const completeLocked = track ? isTrackLocked(track) : false;
  const editsLocked = tierLocked || completeLocked;

  const handleUpdateTrack = useCallback((updates: Partial<Track>) => {
    if (!track) return;
    if (isTrackOverTierLimit(trackId, albumId, albums, user)) {
      toast({ variant: 'destructive', ...TIER_LIMIT_LOCKED_TOAST });
      return;
    }
    if (isTrackLocked(track) && !isLockedTrackReopenUpdate(updates)) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
    if (updates.sections) setSectionsHistory(prev => [track.sections, ...prev].slice(0, 20));
    updateTrack(albumId, trackId, updates);
  }, [track, albumId, trackId, albums, user, updateTrack, toast]);

  const handleUndo = useCallback(() => {
    if (track && isTrackOverTierLimit(trackId, albumId, albums, user)) {
      toast({ variant: 'destructive', ...TIER_LIMIT_LOCKED_TOAST });
      return;
    }
    if (track && isTrackLocked(track)) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
    if (sectionsHistory.length === 0) return;
    const [previousState, ...remainingHistory] = sectionsHistory;
    setSectionsHistory(remainingHistory);
    updateTrack(albumId, trackId, { sections: previousState });
    toast({ title: "Undo Successful" });
  }, [sectionsHistory, albumId, trackId, updateTrack, toast]);

  const handleRunRhymeScan = async (e: any) => {
    if (!track) return;
    if (isTrackOverTierLimit(trackId, albumId, albums, user)) {
      toast({ variant: 'destructive', ...TIER_LIMIT_LOCKED_TOAST });
      return;
    }
    if (isTrackLocked(track)) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
    const cost = getEffectiveCost('findRhymes');
    runWithInk('findRhymes', cost, 'findRhymes', e, async () => {
      setIsRhymeLoading(true);
      setGenerating(true, 'Initializing Rhyme Pulse...');
      try {
        const fullLyrics = track.sections.flatMap((s) => s.bars.map((b) => b.text)).join('\n');
        const res = await lazyFindRhymes(await withAiAuth({ text: fullLyrics, userName: user?.displayName }));
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
    if (isTrackOverTierLimit(trackId, albumId, albums, user)) {
      toast({ variant: 'destructive', ...TIER_LIMIT_LOCKED_TOAST });
      return;
    }
    if (isTrackLocked(track)) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
    const sectionId = sId || activeGeneratorBar?.sectionId;
    const barIdx = bIdx || activeGeneratorBar?.idx;
    if (!sectionId || !barIdx) { toast({ variant: 'destructive', title: 'Selection Required' }); return; }
    const cost = getEffectiveCost('generateNextLine');
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
        const res = await lazyGenerateNextLine(
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

  const handleDismissGenerationOptions = useCallback(() => {
    setGenerationOptions(null);
    setPendingGenCtx(null);
  }, []);

  const handleApplyChestEntry = useCallback(
    (entry: DraftChestEntry, action: 'append' | 'replace') => {
      if (!track || entry.kind !== 'sheet' || !entry.sections?.length) return;
      if (isTrackOverTierLimit(trackId, albumId, albums, user)) {
        toast({ variant: 'destructive', ...TIER_LIMIT_LOCKED_TOAST });
        return;
      }
      if (isTrackLocked(track)) {
        toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
        return;
      }

      const sections =
        action === 'append'
          ? appendSectionsToSheet(track.sections, entry.sections)
          : replaceSheetWithSections(entry.sections);
      handleUpdateTrack({ sections });
      toast({
        title: action === 'append' ? 'Draft appended' : 'Sheet replaced',
        description:
          action === 'append'
            ? 'Chest draft added to the bottom of your page.'
            : 'Current lyrics replaced with the chest draft.',
      });
    },
    [track, trackId, albumId, albums, user, handleUpdateTrack, toast]
  );

  const handleStashApprovalDraftsToChest = useCallback(
    (snapshots: ApprovalDraftSnapshot[], options?: { silent?: boolean }) => {
      if (!track || !snapshots.length) return;
      const entries = snapshotsToChestEntries(snapshots);
      const merged = mergeChestEntries(track.draftChest, entries);
      if (merged.length === (track.draftChest?.length ?? 0)) return;
      handleUpdateTrack({ draftChest: merged, approvalDraftBacklog: [] });
      handleSectionChange('draftChest', true);
      if (!options?.silent) {
        const added = merged.length - (track.draftChest?.length ?? 0);
        toast({
          title: 'Unused drafts saved',
          description: `${added} draft${added === 1 ? '' : 's'} moved to Draft Chest under Scratch Pad.`,
        });
      }
    },
    [track, handleUpdateTrack, handleSectionChange, toast]
  );

  useEffect(() => {
    if (!track?.approvalDraftBacklog?.length) return;
    if (generateDraftOpen || workstationBackgroundActive) return;
    const entries = snapshotsToChestEntries(track.approvalDraftBacklog);
    if (!entries.length) return;
    const merged = mergeChestEntries(track.draftChest, entries);
    if (merged.length === (track.draftChest?.length ?? 0)) {
      updateTrack(albumId, trackId, { approvalDraftBacklog: [] });
      return;
    }
    const added = merged.length - (track.draftChest?.length ?? 0);
    handleUpdateTrack({ draftChest: merged, approvalDraftBacklog: [] });
    handleSectionChange('draftChest', true);
    toast({
      title: 'Drafts recovered',
      description: `${added} studio draft${added === 1 ? '' : 's'} restored to your Draft Chest.`,
    });
  }, [
    track?.approvalDraftBacklog,
    track?.draftChest,
    track?.id,
    generateDraftOpen,
    workstationBackgroundActive,
    albumId,
    trackId,
    handleUpdateTrack,
    handleSectionChange,
    updateTrack,
    toast,
  ]);

  const handleAcceptOption = (line: string) => {
    if (!pendingGenCtx || !track) return;
    if (isTrackOverTierLimit(trackId, albumId, albums, user)) {
      toast({ variant: 'destructive', ...TIER_LIMIT_LOCKED_TOAST });
      return;
    }
    if (isTrackLocked(track)) {
      toast({ variant: 'destructive', ...TRACK_LOCKED_TOAST });
      return;
    }
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
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Save Style DNA with Studio Pro.' });
        return;
      }
      if (!styleProfile?.history[0] || !album) return;
      const preset = { name, createdAt: new Date().toISOString(), analysis: styleProfile.history[0].analysis, metrics: styleProfile.history[0].metrics! };
      const existing = album.stylePresets || [];
      updateAlbum(album.id, { stylePresets: [...existing, preset] });
      toast({ title: 'Style profile saved', description: `"${name}" saved to your vault.` });
  };

  if (!track || !album) {
    if (initTimedOut) {
      return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 px-6 text-center max-w-md mx-auto">
          <p className="text-sm text-muted-foreground font-code uppercase tracking-widest">Workstation could not initialize.</p>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            This track may have been removed or your vault is still syncing. Open another track from the vault or create a new one.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button className="font-bold uppercase text-xs" onClick={() => router.push('/')}>Return to Vault</Button>
            <Button variant="outline" className="font-bold uppercase text-xs" onClick={() => router.push('/?create=track')}>
              Create Track
            </Button>
          </div>
        </div>
      );
    }
    return <div className="flex h-screen items-center justify-center"><StudioLoader size="lg" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-md:h-[calc(100dvh-3.5rem)] w-full overflow-hidden max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
      <FreeTierExpectationsBanner user={user} />
      {tierLocked && (
        <div className="shrink-0 border-b border-pink-500/25 bg-pink-500/10 px-4 py-2 flex items-center gap-2 z-30">
          <Lock className={cn('h-4 w-4 shrink-0', proLockIcon())} />
          <p className={cn('text-[10px] font-code leading-snug', proLockText())}>{tierLimitBanner}</p>
        </div>
      )}
      {!tierLocked && completeLocked && (
        <div className="shrink-0 border-b border-amber-500/35 bg-amber-500/15 px-3 md:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <Lock className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-[10px] md:text-[11px] font-code text-amber-50/95 leading-snug">
              <span className="font-bold text-amber-200">Track locked.</span> Lyrics and Co-Writer are read-only until you reopen.
            </p>
          </div>
          <Button
            size="sm"
            data-tour="reopen-track-banner"
            className="shrink-0 h-9 px-4 text-[10px] font-bold uppercase tracking-wide bg-amber-500 hover:bg-amber-400 text-amber-950 border-2 border-amber-300/50 shadow-[0_0_18px_rgba(251,191,36,0.4)] animate-reopen-attention gap-2"
            onClick={() => {
              handleUpdateTrack({ status: 'in_progress' });
              toast({
                title: 'Track Reopened',
                description: 'You can edit lyrics and Co-Writer settings again.',
              });
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Reopen Track
          </Button>
        </div>
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden w-full">
      <LeftPanel track={track} album={album} onUpdateTrack={handleUpdateTrack} activeSectionId={activeSectionId} setActiveSectionId={setActiveSectionId} setExportDialogOpen={setExportDialogOpen} setShareDialogOpen={setShareDialogOpen} onCollapse={setLeftCollapsed} leftCollapsed={leftCollapsed} setGenerateDraftOpen={setGenerateDraftOpen} scratchPadRef={scratchPadRef} isPro={isPro} mobileActive={isMobileLayout && mobilePanelTab === 'workstation'} trackLocked={editsLocked} tierLocked={tierLocked} completeLocked={completeLocked} workstationAttention={workstationAttention} tourMobilePad={tourActive && isMobileLayout} />
      <CenterPanel track={track} onUpdateTrack={handleUpdateTrack} handleSharedLineGeneration={handleSharedLineGeneration} activeGeneratorBar={activeGeneratorBar} setActiveGeneratorBar={setActiveGeneratorBar} activeBarText={activeBarText} setActiveBarText={setActiveBarText} setFreestyleOpen={setFreestyleOpen} album={album} setSmartStructureOpen={setSmartStructureOpen} isRhymeLoading={isRhymeLoading} activeSectionId={activeSectionId} handleRunRhymeScan={handleRunRhymeScan} generationOptions={generationOptions} setGenerationOptions={setGenerationOptions} handleAcceptOption={handleAcceptOption} handleDismissGenerationOptions={handleDismissGenerationOptions} handleUndo={handleUndo} canUndo={sectionsHistory.length > 0} isMinimized={isMinimized} setIsMinimized={setIsMinimized} mobileActive={isMobileLayout && mobilePanelTab === 'lyrics'} leftCollapsed={leftCollapsed} rightCollapsed={rightCollapsed} trackLocked={editsLocked} />
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
        openCoWriterSections={openCoWriterSections}
        onApplyChestEntry={handleApplyChestEntry}
        mobileActive={isMobileLayout && mobilePanelTab === 'cowriter'}
        trackLocked={editsLocked}
        completeLocked={completeLocked}
        tourMobilePad={tourActive && isMobileLayout}
      />
      <GenerateSongDraftDialog
        open={generateDraftOpen}
        onOpenChange={(open) => {
          if (open && editsLocked) {
            toast({ variant: 'destructive', ...(tierLocked ? TIER_LIMIT_LOCKED_TOAST : TRACK_LOCKED_TOAST) });
            return;
          }
          if (!open) {
            setGeneratorInitialMode('select');
            clearWorkstationOpenParams();
          }
          setGenerateDraftOpen(open);
        }}
        track={track}
        styleProfile={effectiveStyleProfile}
        onDraftGenerated={(sections) => handleUpdateTrack({ sections })}
        onStashApprovalDraftsToChest={handleStashApprovalDraftsToChest}
        onBackgroundSessionActiveChange={setWorkstationBackgroundActive}
        initialWorkstationMode={generatorInitialMode}
      />
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} album={album} tracks={[track]} exportType="track" allowDownload={isPro} />
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} type="track" id={track.id} title={track.title} albumId={album.id} existingShareId={track.shareId} />
      <FreestylePad open={freestyleOpen} onOpenChange={setFreestyleOpen} onAddFreestyle={(text) => { const lines = text.split('. ').filter(l => l.trim()); const activeS = track.sections.find(s => s.id === activeSectionId) || track.sections[0]; const startIdx = activeS.bars.length + 1; const newBars = lines.map((l, i) => withLineSource({ idx: startIdx + i, text: l.trim(), accepted: true, syllables: l.trim().split(' ').length, rhymeKey: '?' }, 'written')); handleUpdateTrack({ sections: track.sections.map(s => s.id === activeS.id ? { ...s, bars: [...s.bars, ...newBars] } : s) }); setFreestyleOpen(false); }} disabled={editsLocked} trackVibe={track.vibe} albumTheme={album.theme} styleProfileSummary={styleProfile.history[0]?.analysis || ''} isPro={isPro} />
      <SmartStructureDialog
        open={smartStructureOpen}
        onOpenChange={(open) => { if (open && editsLocked) { toast({ variant: 'destructive', ...(tierLocked ? TIER_LIMIT_LOCKED_TOAST : TRACK_LOCKED_TOAST) }); return; } setSmartStructureOpen(open); }}
        onApply={(sections: any) => {
          handleUpdateTrack({ sections });
          void postGamificationEvent('smart_structure_used');
        }}
      />
      <ImproveMyStyleDialog open={improveStyleOpen} onOpenChange={(open) => { if (open && editsLocked) { toast({ variant: 'destructive', ...(tierLocked ? TIER_LIMIT_LOCKED_TOAST : TRACK_LOCKED_TOAST) }); return; } setImproveStyleOpen(open); }} track={track} onUpdateStyle={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} />
      <StyleVaultDialog open={styleVaultOpen} onOpenChange={setStyleVaultOpen} album={album} updateAlbum={updateAlbum} onApply={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} />
      <ArchivalNamingDialog
        open={saveStyleNamingOpen}
        onOpenChange={setSaveStyleNamingOpen}
        type="Style"
        sourceTrackTitle={track.title}
        onConfirm={handleConfirmSaveStyle}
      />
      </div>
      <MobileLyricsTabBar active={mobilePanelTab} onChange={setMobilePanelTab} tourElevated={tourActive} />
      <StudioGuidedTour
        active={tourActive}
        stepIndex={tourStep}
        onStepChange={setTourStep}
        onComplete={handleTourComplete}
        onBeforeStep={handleTourBeforeStep}
      />
      {tourActive && (
        <div className="fixed bottom-24 max-md:hidden left-4 z-[5999] w-64 pointer-events-auto">
          <QuestProgress
            tourStepIndex={tourStep}
            tourActive={tourActive}
            tourCompleted={Boolean(user?.lyricsTutorialCompletedAt)}
            hideOnMobile
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
