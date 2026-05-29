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
  Undo2
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
import { UpgradeTooltip } from '@/components/upgrade-tooltip';
import { LockedSaveButton, ProLockBadge, proLockShell, proLockIcon, proLockText, markBarAnchorGlow } from '@/components/pro-lock';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  const handleAnalyze = async (e: any) => {
    const cost = getCost('analyzeStructure');
    if (!deductInk(cost, 'analyzeStructure', e)) return;
    setIsProcessing(true);
    setGenerating(true, 'Deconstructing Neural Structure...');
    try {
      const res = await analyzeStructure(await withAiAuth({ text: inputText }));
      const newSections = res.sections.map((s:any, i:number) => ({
        id: `smart-${Date.now()}-${i}`,
        type: s.type,
        bars: s.lines.map((l:any, j:number) => ({ idx: j + 1, text: l.trim(), accepted: true, syllables: l.trim().split(' ').length, rhymeKey: '?' }))
      }));
      onApply(newSections);
      addUsageLog({ flowName: 'analyzeStructure', inkCost: cost, status: 'success' });
      toast({ title: "Structure Analyzed" });
      onOpenChange(false);
    } catch (err: any) {
      refundInk(cost);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: err.message });
    } finally {
      setIsProcessing(false);
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-2">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <ClipboardPaste className="text-primary h-6 w-6" /> Smart Structure Paste
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Paste raw lyrics — we&apos;ll split them into Verse, Hook, and other blocks automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Tip: label sections with [ brackets ]
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Put each part name on its own line in square brackets so the system knows exactly where Verse, Hook, Bridge, etc. begin. Lines below a label belong to that section until the next label.
            </p>
            <div className="rounded border border-border/40 bg-background/60 p-3 font-code text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
{`[Verse 1]
First line of your verse
Second line here

[Hook]
Catchy hook line one
Hook line two

[Verse 2]
Back to the story
Another bar

[Bridge]
Optional bridge lines`}
            </div>
            <p className="text-[10px] text-muted-foreground/80">
              No brackets? No problem — the AI will still guess Verse vs Hook from context.
            </p>
          </div>
          <Textarea 
            placeholder="Paste your lyrics here — use [Verse], [Hook], [Bridge] labels for best results..."
            className="min-h-[300px] font-code text-sm bg-background/50 border-white/10"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>
        <DialogFooter>
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
  const { deductInk, refundInk, addUsageLog } = useUsage();
  const { setGenerating } = useUIState();
  const { getCost, buttonLabel, tooltip } = useInkCosts();

  const handleTrain = async (e: any) => {
    const cost = getCost('improveMyStyle');
    if (!deductInk(cost, 'improveMyStyle', e)) return;
    setIsProcessing(true);
    setGenerating(true, 'Learning Artist DNA...');
    try {
      const allText = track.sections.flatMap((s:any) => s.bars.map((b:any) => b.text)).join('\n');
      if (allText.length < 50) throw new Error("Need more lyrical data to train effectively.");
      const res = await improveMyStyle(await withAiAuth({ lyrics: allText }));
      onUpdateStyle(res.analysis, res.metrics);
      addUsageLog({ flowName: 'improveMyStyle', inkCost: cost, status: 'success' });
      toast({ title: "Style Profile Updated", description: "The AI co-writer has learned your unique flow pattern." });
      onOpenChange(false);
    } catch (err: any) {
      refundInk(cost);
      toast({ variant: 'destructive', title: 'Training Failed', description: err.message });
    } finally {
      setIsProcessing(false);
      setGenerating(false);
    }
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

function DNAVaultDialog({ open, onOpenChange, album, updateAlbum, onApply, isPro }: any) {
    const { toast } = useToast();
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const presets = isPro ? (album?.dnaPresets || []) : SYSTEM_DNA_PRESETS;
    const isSystem = (p: any) => p.createdAt === 'system';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-2">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl flex items-center gap-2 text-green-500">
                        <FolderOpen className="h-6 w-6" /> DNA Vault
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">
                        {isPro ? 'Selectively load creative strains or full profiles from your history.' : 'Load system DNA strains — pick individual fields or apply full profiles.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[450px] mt-4">
                    <div className="space-y-4">
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
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onApply(p.mapping); onOpenChange(false); toast({ title: "Full DNA Profile Loaded" }); }}><RefreshCw className="h-3.5 w-3.5" /></Button>
                                        {expandedIdx === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </div>
                                {expandedIdx === i && (
                                    <div className="p-3 bg-black/40 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        {[
                                            { k: 'setting_world', l: 'Setting', v: p.mapping.setting_world },
                                            { k: 'emotion_core', l: 'Emotion', v: p.mapping.emotion_core },
                                            { k: 'trigger_moment', l: 'Trigger', v: p.mapping.trigger_moment },
                                            { k: 'message_truth', l: 'Truth', v: p.mapping.message_truth },
                                            { k: 'tone_palette', l: 'Palette', v: p.mapping.tone_palette }
                                        ].map(field => (
                                            <div key={field.k} className="flex flex-col gap-2 p-2 rounded bg-background/20 border border-white/5 group/part">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">{field.l}</p>
                                                    <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      className="h-7 w-7 text-primary hover:bg-primary/20" 
                                                      onClick={() => { onApply({ [field.k]: field.v }); toast({ title: `${field.l} Part Injected` }); }}
                                                      disabled={!field.v}
                                                    >
                                                        <Zap className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <p className="text-[11px] text-foreground leading-relaxed font-code whitespace-pre-wrap break-words italic opacity-90 pr-2">
                                                    {field.v ? `"${field.v}"` : "N/A"}
                                                </p>
                                            </div>
                                        ))}
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
                </ScrollArea>
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

function LeftPanel({ track, album, onUpdateTrack, activeSectionId, setActiveSectionId, setExportDialogOpen, onCollapse, leftCollapsed, setGenerateDraftOpen, scratchPadRef, isPro }: any) {
  const router = useRouter();
  const { setGenerating } = useUIState();
  const { toast } = useToast();
  const { deductInk, refundInk, addUsageLog } = useUsage();
  const { getCost, tooltip, buttonLabel } = useInkCosts();

  const handleSuggestVibe = async (e: any) => {
    const cost = getCost('suggestVibe');
    if (!deductInk(cost, 'suggestVibe', e)) return;
    setGenerating(true, 'Analyzing Sonic Landscape...');
    try {
        const fullLyrics = track.sections.flatMap((s:any) => s.bars.map((b:any) => b.text)).join('\n');
        const res = await suggestVibe(await withAiAuth({ lyrics: fullLyrics }));
        onUpdateTrack({ vibe: { ...track.vibe, ...res, enabled: true } });
        addUsageLog({ flowName: 'suggestVibe', inkCost: cost, status: 'success' });
        toast({ title: "Vibe Generated" });
    } catch (e: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Vibe Failed', description: e.message });
    } finally {
        setGenerating(false);
    }
  };

  const handleGenerateScene = async (e: any) => {
    const cost = getCost('generateCoverArt');
    if (!deductInk(cost, 'generateCoverArt', e)) return;
    setGenerating(true, 'Generating Cinematic DNA...');
    try {
      const fullLyrics = track.sections.flatMap((s:any) => s.bars.map((b:any) => b.text)).join('\n');
      const res = await generateCoverArt(await withAiAuth({
          lyrics: fullLyrics,
          vibe: track.vibe,
          mergedDirection: mergeDirection(album.direction, track.direction),
          title: track.title,
      }));
      scratchPadRef.current?.addEffectResult({
          tool: 'scene-gen' as any,
          inputs: { prompt: 'Cinematic Scene' },
          outputs: [res.prompt]
      });
      addUsageLog({ flowName: 'generateCoverArt', inkCost: cost, status: 'success' });
      toast({ title: "Scene Generated", description: "Cinematic prompt added to Scratch Pad." });
    } catch (e: any) {
      refundInk(cost);
      toast({ variant: 'destructive', title: 'Scene Generation Failed', description: e.message });
    } finally {
      setGenerating(false);
    }
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

  if (leftCollapsed) {
    return (
        <div className="flex flex-col items-center h-full bg-card border-r w-[56px] shrink-0 overflow-hidden py-6 z-30">
            <NeuralStripItem text="STATUS" active={track.status === 'complete'} color="#0ea5e9" onClick={() => onCollapse(false)} />
            <NeuralStripItem text="STRUC" active={true} color="#eab308" onClick={() => onCollapse(false)} />
            <NeuralStripItem text="VIBE" active={isVibeActive(track)} color="#f59e0b" onClick={() => onCollapse(false)} />
            <NeuralStripItem text="SCENE" active={false} color="#6366f1" onClick={() => onCollapse(false)} />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-r relative overflow-hidden w-[260px] shrink-0 z-30">
      <div className="flex items-center justify-between p-4 border-b shrink-0 h-14">
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground">Workstation</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCollapse(true)}><PanelLeftClose className="h-4 w-4" /></Button>
      </div>
      <div className="flex-grow overflow-y-auto studio-scrollbar">
        <div className="p-4 space-y-6 pb-24">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setGenerateDraftOpen(true)} className="w-full h-20 font-bold uppercase tracking-[0.2em] gap-3 shadow-[0_0_30px_rgba(59,130,246,0.4)] bg-primary text-white border-2 border-white/10 group animate-in fade-in zoom-in duration-1000 hover:scale-[1.02] transition-all">
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

          <Card className="border-sky-500/30 bg-sky-500/5 shadow-sm overflow-hidden">
              <CardHeader className="p-4 h-12 flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-sky-400 font-headline uppercase"><FilePenLine className="h-4 w-4" /> Track Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-sky-400/70 tracking-widest">Title</Label>
                    <Input value={track.title} onChange={(e) => onUpdateTrack({ title: e.target.value })} className="font-headline border-sky-500/20 bg-background/50 h-9 text-xs" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {isPro ? (
                      <Button variant="secondary" size="sm" className="w-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[9px] font-bold h-9 uppercase justify-start" onClick={() => window.open(`${window.location.pathname}/perform`, '_blank')}><MonitorPlay className="mr-2 h-4 w-4" /> Performance Mode</Button>
                    ) : (
                      <UpgradeTooltip feature="Performance Mode" benefit="Full-screen teleprompter with scroll-synced lyrics for stage and studio sessions." example="Rehearse hooks without losing your place mid-verse.">
                        <Button variant="secondary" size="sm" className={cn('w-full text-[9px] font-bold h-9 uppercase justify-start', proLockShell('md'), proLockText())} onClick={() => router.push('/usage?tab=cloud')}><Lock className={cn('mr-2 h-4 w-4', proLockIcon())} /> Performance Mode</Button>
                      </UpgradeTooltip>
                    )}
                    <Button variant="secondary" size="sm" className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold h-9 uppercase justify-start" onClick={() => setExportDialogOpen(true)}><FileDown className="mr-2 h-4 w-4" /> Export Track</Button>
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
                             <Badge variant="outline" className="h-4 px-1 text-[7px] font-mono border-white/10 text-muted-foreground">{s.bars.length}</Badge>
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
              <CardHeader className="p-4 h-12 flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-500 font-headline uppercase"><Waves className="h-4 w-4" /> Vibe Suggester</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 font-code">
                <div className="p-3 bg-background/40 rounded border border-amber-500/20">
                  <p className="text-[11px] font-bold uppercase text-amber-700">{track.vibe.genre || 'Undefined'}</p>
                  <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{track.vibe.feeling?.join(', ')}</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-9 text-[9px] font-bold uppercase border-amber-500/20 hover:bg-amber-500/10 text-amber-600" onClick={(e) => handleSuggestVibe(e)}><RefreshCw className="mr-2 h-3.5 w-3.5"/> {buttonLabel('suggestVibe')}</Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold">{tooltip('suggestVibe')}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
          </Card>

          <Card className="border-indigo-500/30 bg-indigo-500/5 shadow-sm overflow-hidden">
              <CardHeader className="p-4 h-12 flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-indigo-400 font-headline uppercase"><Clapperboard className="h-4 w-4" /> Scene Gen</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 font-code">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-9 text-[9px] font-bold uppercase border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-400" onClick={(e) => handleGenerateScene(e)}>
                          <Sparkles className="mr-2 h-3.5 w-3.5"/> {buttonLabel('generateCoverArt')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold">{tooltip('generateCoverArt')}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

function CenterPanel({ track, onUpdateTrack, handleSharedLineGeneration, activeGeneratorBar, setActiveGeneratorBar, activeBarText, setActiveBarText, setFreestyleOpen, album, setSmartStructureOpen, isRhymeLoading, activeSectionId, handleRunRhymeScan, generationOptions, setGenerationOptions, handleAcceptOption, handleUndo, canUndo, isMinimized, setIsMinimized }: any) {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const { user } = useAuth();
  const { tooltip, buttonLabel, getCost, getEffectiveCost } = useInkCosts();
  const { toast } = useToast();
  
  const fontSizes = { sm: 'text-[16px]', md: 'text-[24px]', lg: 'text-[36px]' };
  const lineHeights = { sm: '22px', md: '32px', lg: '42px' };
  const activeLineHeight = lineHeights[fontSize];

  const syncHeights = useCallback(() => {
    requestAnimationFrame(() => {
        const textareas = document.querySelectorAll('textarea[id^="bar-input-"]');
        textareas.forEach((el: any) => {
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        });
    });
  }, []);

  useEffect(() => {
    syncHeights();
  }, [fontSize, track.sections, syncHeights]);

  const notebookStyle = {
    backgroundColor: 'transparent',
    backgroundImage: `
      linear-gradient(90deg, transparent 100px, rgba(255, 0, 0, 0.2) 100px, rgba(255, 0, 0, 0.2) 101px, transparent 101px),
      repeating-linear-gradient(transparent, transparent ${parseInt(activeLineHeight) - 1}px, rgba(255, 255, 255, 0.08) ${parseInt(activeLineHeight) - 1}px, rgba(255, 255, 255, 0.08) ${activeLineHeight})
    `,
    backgroundSize: `100% ${activeLineHeight}`,
    backgroundAttachment: 'local'
  };

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
                        newBars.push({ idx: bIdx + 1, text: textAfter.trim(), accepted: true, syllables: textAfter.trim().split(' ').length, rhymeKey: '?', justGenerated: true });
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
    if (!activeGeneratorBar) return 'BAR: 0';
    const section = track.sections.find((s:any) => s.id === activeGeneratorBar.sectionId);
    return `${section?.type?.toUpperCase() || 'BAR'} - BAR: ${activeGeneratorBar.idx}`;
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
                        bars: [{ idx: 1, text: activeBarText.trim(), accepted: true, syllables: activeBarText.trim().split(' ').length, rhymeKey: '?' }] 
                      }] 
                  });
                  setActiveGeneratorBar({ sectionId: nsId, idx: 1 });
              } else {
                  const section = track.sections[0];
                  const newIdx = section.bars.length + 1;
                  const nextSections = track.sections.map((s:any) => s.id === section.id ? { ...s, bars: [...s.bars, { idx: newIdx, text: activeBarText.trim(), accepted: true, syllables: activeBarText.trim().split(' ').length, rhymeKey: '?' }] } : s);
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
    if (user?.subscriptionStatus !== 'active') {
        toast({ 
            variant: 'destructive', 
            title: 'Feature Locked', 
            description: 'Freestyle Recording is a Studio Pro feature. Upgrade to catch the flow.',
            action: <Button variant="outline" size="sm" onClick={() => window.location.href = '/pricing'}>View Plans</Button>
        });
        return;
    }
    setFreestyleOpen(true);
  };

  return (
    <div className="flex-grow flex flex-col min-w-0 h-full relative overflow-hidden bg-background">
      <div className="h-14 px-4 md:px-8 flex items-center justify-between bg-card z-20 border-b shrink-0">
        <div className="flex items-center gap-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-4 font-bold text-xs uppercase tracking-widest border-border/40 hover:bg-primary/5 text-muted-foreground hover:text-primary" onClick={() => setSmartStructureOpen(true)}>
                      {buttonLabel('analyzeStructure')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-[10px] font-bold">{tooltip('analyzeStructure')}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-muted/40 px-3 py-1 rounded-full border border-border/40">
             <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-all disabled:opacity-20"
                                onClick={handleUndo}
                                disabled={!canUndo}
                            >
                                <Undo2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-[10px] font-bold uppercase">Undo Last Action</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="w-px h-4 bg-border/40 mx-1" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mr-1">RHYME FOCUS</span>
                <Switch 
                  checked={track.rhymeHighlightingEnabled} 
                  onCheckedChange={(c) => onUpdateTrack({ rhymeHighlightingEnabled: c })} 
                  className="scale-75"
                />
                <div className="w-px h-4 bg-border/40 mx-1" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mr-1">RHYME PULSE</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn(
                              "rounded-full h-9 w-9 p-0 transition-all active:scale-90 active:shadow-inner bg-background border-primary/40 hover:bg-primary/5 group shadow-lg flex items-center justify-center",
                              isRhymeLoading && "animate-pulse"
                          )}
                          onClick={handleRunRhymeScan}
                          disabled={isRhymeLoading}
                      >
                          {isRhymeLoading ? <RefreshCw className="h-4 w-4 animate-spin text-primary" /> : <Target className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-[10px] font-bold">{tooltip('findRhymes')}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge variant="outline" className="h-4 px-1 text-[7px] font-bold border-primary/20 text-primary">{getEffectiveCost('findRhymes')} INK</Badge>
             </div>
          </div>
          <ToggleGroup type="single" value={fontSize} onValueChange={(val) => val && setFontSize(val as any)} className="bg-muted/40 border border-border/40 rounded-lg p-0.5">
            <ToggleGroupItem value="sm" className="h-7 w-8 text-[10px] font-bold">T</ToggleGroupItem>
            <ToggleGroupItem value="md" className="h-7 w-8 text-sm font-bold">T</ToggleGroupItem>
            <ToggleGroupItem value="lg" className="h-7 w-8 text-lg font-bold">T</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      
      <div id="lyrics-viewport" className="flex-1 relative overflow-x-hidden overflow-y-auto min-h-0 studio-scrollbar" style={notebookStyle}>
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
                <div id={`section-header-${section.id}`} style={{ height: `calc(${activeLineHeight} * 3)` }} className="flex items-end pb-2 pl-[120px]">
                    <h3 className="text-xl md:text-2xl font-headline font-bold text-sky-400 uppercase leading-none">[{section.type}]</h3>
                </div>
                {(section.bars || []).map((bar: any) => {
                    const isSelected = activeGeneratorBar?.sectionId === section.id && activeGeneratorBar?.idx === bar.idx;
                    return (
                        <div key={`${section.id}-${bar.idx}`} className={cn("group relative flex items-start transition-colors h-auto", isSelected && "bg-primary/10", bar.justGenerated && "animate-line-glow")} style={{ minHeight: activeLineHeight }}>
                        <span className={cn("absolute left-[50px] font-mono text-muted-foreground/30 w-10 text-right font-bold h-full flex items-start pt-1", fontSizes[fontSize])} style={{ lineHeight: activeLineHeight }}>{String(bar.idx).padStart(2, '0')}</span>
                        
                        <div className="absolute right-4 top-0 h-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={(e) => handleSharedLineGeneration('next', e, section.id, bar.idx)}><ArrowDown className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={(e) => handleSharedLineGeneration('previous', e, section.id, bar.idx)}><ArrowUp className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBar(section.id, bar.idx)}><Trash2 className="h-4 w-4"/></Button>
                        </div>

                        <div className="flex-grow flex items-start min-w-0 h-full pl-0 relative overflow-hidden">
                            <textarea 
                            id={`bar-input-${section.id}-${bar.idx}`} 
                            value={bar.text} 
                            rows={1}
                            onKeyDown={(e) => handleKeyDown(e, section.id, bar.idx)}
                            onChange={(e: any) => { 
                                const text = e.target.value;
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                                onUpdateTrack({ sections: track.sections.map((s: any) => s.id === section.id ? { ...s, bars: s.bars.map((b: any) => b.idx === bar.idx ? { ...b, text, accepted: true, syllables: text.trim().split(' ').length } : b) } : s) });
                                setActiveBarText(text); 
                            }} 
                            onFocus={(e: any) => { 
                                setActiveGeneratorBar({ sectionId: section.id, idx: bar.idx }); 
                                setActiveBarText(bar.text || '');
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            className={cn(
                                "border-0 bg-transparent p-0 focus-visible:ring-0 font-code font-bold w-full shadow-none z-10 tracking-normal resize-none overflow-hidden whitespace-pre-wrap break-words pr-24",
                                "pl-[145px] -indent-[25px]",
                                "antialiased text-rendering-geometric",
                                fontSizes[fontSize]
                            )} 
                            style={{ minHeight: activeLineHeight, lineHeight: activeLineHeight, fontVariantLigatures: 'none' }}
                            placeholder="..." 
                            />
                            {track.rhymeHighlightingEnabled && bar.text && (
                            <div className="absolute inset-0 pointer-events-none flex items-start pl-0 pr-24 z-0 h-full overflow-hidden">
                                <p className={cn(
                                    "font-code font-bold tracking-normal whitespace-pre-wrap break-words w-full text-transparent m-0",
                                    "pl-[145px] -indent-[25px]",
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

      <div className={cn("bg-card border-t shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0 z-[40] relative transition-all duration-300", isMinimized ? "h-10" : "h-[115px]")}>
        <div className="max-w-7xl mx-auto w-full px-8 h-full flex flex-col justify-start pt-2 pb-3 gap-1">
            <div className="flex items-center justify-between border-b border-white/5 h-6 shrink-0">
                <div className="flex items-center gap-4 overflow-hidden h-full">
                    <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 shrink-0 leading-none h-full"><Zap className="h-3 w-3" /> BAR WORKSTATION</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground/40 hover:text-muted-foreground shrink-0" aria-label="AI disclaimer">
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-[9px] leading-snug">
                          AI suggestions are assistive only — review before use. See Terms of Service (§5) for full AI &amp; content policies.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-muted-foreground font-code text-[9px] font-bold tracking-widest uppercase shrink-0 leading-none h-full flex items-center">{activeBarLabel}</span>
                    <div className="flex items-center gap-1.5 overflow-hidden ml-2 h-full">
                        {ruleBadges.map(b => <Badge key={b.id} variant="outline" className={cn("text-[8px] font-bold uppercase h-4.5 px-2 bg-background/20", b.color, b.id === 'END WITH' && "animate-pulse")}>{b.id}</Badge>)}
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsMinimized(!isMinimized)}>
                    {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>
            {!isMinimized && (
                <div className="flex gap-4 items-center mt-1 h-full min-h-0">
                    {generationOptions ? (
                        <div className="flex-grow flex gap-4 animate-in fade-in slide-in-from-bottom-4 h-full py-1">
                            {generationOptions.map((opt, i) => (
                                <Button 
                                    key={i} 
                                    variant="outline" 
                                    className="flex-1 h-full py-1 px-5 font-bold bg-primary/10 border-primary/40 hover:bg-primary/20 text-white text-left justify-start gap-4 group border-2 shadow-2xl transition-all hover:scale-[1.01]"
                                    onClick={() => handleAcceptOption(opt.line)}
                                >
                                    <div className="flex flex-col gap-0.5 shrink-0 border-r border-white/10 pr-3">
                                        <Badge className="bg-primary text-[8px] h-4 w-fit uppercase px-1">Opt {i+1}</Badge>
                                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{opt.syllables} SYLL</span>
                                    </div>
                                    <span className="text-sm md:text-lg leading-tight tracking-tight flex-grow break-words line-clamp-2">{opt.line}</span>
                                </Button>
                            ))}
                            <Button variant="ghost" size="icon" onClick={() => setGenerationOptions(null)} className="h-full w-10 text-muted-foreground hover:text-red-500 bg-white/5 border border-white/10 rounded-lg">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <textarea 
                                placeholder="..."
                                value={activeBarText} 
                                onKeyDown={handleBarSyncEnter}
                                onChange={(e: any) => { 
                                    setActiveBarText(e.target.value); 
                                    if (activeGeneratorBar) onUpdateTrack({ sections: track.sections.map((s: any) => s.id === activeGeneratorBar.sectionId ? { ...s, bars: s.bars.map((b: any) => b.idx === activeGeneratorBar.idx ? { ...b, text: e.target.value } : b) } : s) }); 
                                }} 
                                className="bg-background/40 border border-white/10 flex-grow px-4 py-2 font-code font-bold text-sm shadow-inner rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 tracking-tight resize-none h-14" 
                            />
                            <div className="flex gap-2 shrink-0 h-14">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-full px-5 font-bold text-xs uppercase border-border/40 gap-2 shadow-lg" onClick={(e) => handleSharedLineGeneration('next', e)}>
                                                <ArrowDown className="h-4 w-4 text-primary" /> NEXT LINE
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-full px-5 font-bold text-xs uppercase border-border/40 gap-2 shadow-lg" onClick={(e) => handleSharedLineGeneration('previous', e)}>
                                                <ArrowUp className="h-4 w-4 text-primary" /> PREV LINE
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-[10px] font-bold">{tooltip('generateNextLine')}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Button variant="outline" size="sm" className="h-full w-12 font-bold border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 shadow-lg" onClick={() => { if(activeGeneratorBar) handleDeleteBar(activeGeneratorBar.sectionId, activeGeneratorBar.idx); }}><Trash2 className="h-5 w-5" /></Button>
                                <Button variant="secondary" size="sm" className="h-full px-6 font-bold text-xs uppercase tracking-widest gap-2 bg-primary/20 text-primary border border-primary/20 shadow-lg" onClick={handleOpenFreestyle} title={tooltip('freestyleTranscription')}>
                                    {user?.subscriptionStatus === 'active' ? <Mic className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                                    FREESTYLE ({getEffectiveCost('freestyleTranscription')} Ink)
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

// --- Right Panel Component ---

function RightPanel({ track, album, onUpdateTrack, styleProfile, scratchPadRef, activeSectionId, rightCollapsed, onCollapse, improveStyleOpen, setImproveStyleOpen, styleVaultOpen, setStyleVaultOpen, handleSharedLineGeneration, updateAlbum, clearStyleProfile, setSaveStyleNamingOpen, isPro, sectionOpen, onSectionChange }: any) {
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
      const currentDir = track.direction || { enabled: true };
      const profile = {
          name,
          createdAt: new Date().toISOString(),
          sourceTrackTitle: track.title,
          analysis: { themes: [], motifs: [], emotionalTone: { primaryEmotion: '', secondaryEmotion: '', valence: 50, intensity: 50 }, emotionalShift: '', narrativeArc: '', structure: '', pov: '', tense: '', voiceStyle: '', whatMakesItWork: '' } as any,
          mapping: JSON.parse(JSON.stringify(currentDir))
      };
      const existing = album.dnaPresets || [];
      updateAlbum(album.id, { dnaPresets: [...existing, profile] });
      toast({ title: "DNA Archived", description: `"${name}" saved to vault.` });
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

  if (rightCollapsed) {
    return (
        <div className="flex flex-col items-center h-full bg-card border-l w-[56px] shrink-0 overflow-hidden py-6 z-30">
            <NeuralStripItem text="DNA" color="#10b981" active={isTrackDnaActive(track) || isAlbumDnaActive(track, album)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="VIBE" color="#f59e0b" active={isVibeActive(track)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="INTENT" color="#0ea5e9" active={isIntentsActive(track)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="GUARD" color="#f43f5e" active={isGuardrailsActive(track)} onClick={() => onCollapse(false)} />
            <NeuralStripItem text="STYLE" color="#d946ef" active={isStyleActive(track)} onClick={() => onCollapse(false)} />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l relative overflow-hidden w-[340px] shrink-0 z-30">
      <div className="flex items-center justify-between p-4 border-b shrink-0 h-14">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCollapse(true)}><PanelRightClose className="h-4 w-4" /></Button>
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-muted-foreground">Co-Writer Panel</h3>
      </div>
      <div className="flex-grow overflow-y-auto studio-scrollbar">
        <div className="p-4 space-y-4 pb-32">
          
          <Collapsible open={sectionOpen.dna} onOpenChange={(o) => onSectionChange('dna', o)} className="space-y-1">
            <Card className="border-green-500/30 bg-green-500/5">
                <div className="p-4 flex flex-row items-center justify-between space-y-0">
                    <CollapsibleTrigger asChild>
                        <div className="space-y-0.5 cursor-pointer flex-grow">
                            <CardTitle className="text-sm flex items-center gap-2 text-green-500 font-headline uppercase leading-none"><Dna className="h-4 w-4" /> DNA Suite</CardTitle>
                            <p className="text-[8px] text-green-600/60 font-bold uppercase tracking-widest leading-none">Creative Direction Questions</p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-500/10" onClick={(e) => { e.stopPropagation(); setArchivalDialog({ open: true, type: 'DNA' }); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton feature="DNA Archive" benefit="Save your own DNA strains to the vault. Free artists use 2 system presets." />
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
                        <div className="space-y-0.5 cursor-pointer flex-grow">
                            <CardTitle className="text-sm flex items-center gap-2 text-amber-500 font-headline uppercase leading-none"><Palette className="h-4 w-4" /> Track Vibe</CardTitle>
                            <p className="text-[8px] text-amber-600/60 font-bold uppercase tracking-widest leading-none">Instrumentation & Atmosphere</p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600 hover:bg-amber-500/10" onClick={(e) => { e.stopPropagation(); setArchivalDialog({ open: true, type: 'Vibe' }); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton feature="Vibe Archive" benefit="Save custom track vibes. Free artists load from 2 system vibe presets." />
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
                    <CollapsibleTrigger asChild>
                        <div className="space-y-1 cursor-pointer flex-grow">
                            <div className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-sky-400" />
                                <h3 className="font-headline font-bold text-xl text-sky-400 uppercase tracking-tighter">Intents</h3>
                            </div>
                            <p className="text-[9px] text-sky-500 font-bold uppercase tracking-widest leading-none">Motif Management</p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-4">
                        <Switch checked={track.intentsEnabled ?? (track.checkedIntents?.length > 0)} onCheckedChange={(c) => onUpdateTrack({ intentsEnabled: c })} />
                        <CollapsibleTrigger asChild><ChevronDown className="h-4 w-4 text-sky-500/40 cursor-pointer" /></CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent>
                    <CardContent className="space-y-4 p-4 pt-4">
                        <div className="space-y-2">
                            {(album?.thingsToSay || []).map((intent: string) => {
                                const isLocked = track.endWith === intent;
                                const isChecked = (track.checkedIntents || []).includes(intent);
                                return (
                                    <div key={intent} className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border transition-all group",
                                        isLocked ? "bg-sky-500/10 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.1)]" : "bg-[#142633] border-white/5 hover:bg-[#1a3040]"
                                    )}>
                                        <Checkbox 
                                            checked={isChecked || isLocked} 
                                            onCheckedChange={(c) => handleIntentCheck(intent, !!c)} 
                                            className="border-sky-500 data-[state=checked]:bg-sky-500"
                                        />
                                        <span className={cn(
                                            "text-xs font-code whitespace-normal break-words flex-grow leading-snug",
                                            isLocked ? "text-sky-300 font-bold" : "text-white/70"
                                        )}>{intent}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-sky-400/40 hover:text-sky-400 hover:bg-sky-500/10" onClick={(e) => { e.stopPropagation(); setEditIntentDialog({ open: true, intent }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={cn("h-7 w-7 transition-colors", isLocked ? "text-sky-400" : "text-sky-400/40 hover:text-sky-400 hover:bg-sky-500/10")}
                                                onClick={(e) => { e.stopPropagation(); handleIntentPrecisionLock(intent); }}
                                            >
                                                <ArrowUpRight className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDeleteIntent(intent); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
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
                            <p className="text-[8px] text-rose-600/60 font-bold uppercase tracking-widest leading-none">Content Restrictions</p>
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
                        <div className="space-y-0.5 cursor-pointer flex-grow">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-fuchsia-500 font-headline uppercase leading-none"><BrainCircuit className="h-4 w-4" /> AI Co-Writer</CardTitle>
                            </div>
                            <p className="text-[8px] text-fuchsia-600/60 font-bold uppercase tracking-widest leading-none">Neural Sharpening Tools</p>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1">
                        {isPro ? (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-fuchsia-500 hover:bg-fuchsia-500/10" onClick={(e) => { e.stopPropagation(); setSaveStyleNamingOpen(true); }}><Save className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <LockedSaveButton feature="Style DNA Archive" benefit="Save your trained style profile. Free artists load from 2 system style presets." />
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
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-fuchsia-400 hover:bg-fuchsia-500/10" onClick={() => clearStyleProfile()}><X className="h-3.5 w-3.5" /></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p className="text-[10px] font-bold">Clear Style History</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3.5 w-3.5 text-fuchsia-500/50 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[240px] p-3 text-[10px] leading-relaxed">
                                                <p className="font-bold mb-1 uppercase text-primary">How to Use:</p>
                                                This is your **Global Artist Profile**. It learns your cadence across ALL songs. Press 'Train' to feed your latest sheet into the co-writer's brain.
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
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
      
      <DNAVaultDialog open={dnaVaultOpen} onOpenChange={setDNAVaultOpen} album={album} updateAlbum={updateAlbum} onApply={(mapping: any) => onUpdateTrack({ direction: { ...track.direction, ...mapping } })} isPro={isPro} />
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
  const { deductInk, refundInk, addUsageLog, registerAiContext } = useUsage();
  const { getCost } = useInkCosts();
  const searchParams = useSearchParams();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
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
  const [freestyleOpen, setFreestyleOpen] = useState(false);
  const [isRhymeLoading, setIsRhymeLoading] = useState(false);
  const [saveStyleNamingOpen, setSaveStyleNamingOpen] = useState(false);

  const [sectionsHistory, setSectionsHistory] = useState<TrackSection[][]>([]);

  const [generationOptions, setGenerationOptions] = useState<any[] | null>(null);
  const [pendingGenCtx, setPendingGenCtx] = useState<{ mode: 'next' | 'previous', sId: string, bIdx: number } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

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
    if (!deductInk(cost, 'findRhymes', e)) return;
    setIsRhymeLoading(true);
    setGenerating(true, 'Initializing Rhyme Pulse...');
    try {
        const fullLyrics = track.sections.flatMap(s => s.bars.map(b => b.text)).join('\n');
        const res = await findRhymes(await withAiAuth({ text: fullLyrics, userName: user?.displayName }));
        handleUpdateTrack({ rhymeGroups: res.rhymeGroups });
        addUsageLog({ flowName: 'findRhymes', inkCost: cost, status: 'success' });
        toast({ title: "Rhyme Pulse Complete" });
    } catch (e: any) {
        refundInk(cost);
        toast({ variant: 'destructive', title: 'Scan Failed', description: e.message });
    } finally {
        setIsRhymeLoading(false);
        setGenerating(false);
    }
  };

  const handleSharedLineGeneration = async (mode: 'next' | 'previous', e: any, sId?: string, bIdx?: number) => {
    if (!track || !album) return;
    const sectionId = sId || activeGeneratorBar?.sectionId;
    const barIdx = bIdx || activeGeneratorBar?.idx;
    if (!sectionId || !barIdx) { toast({ variant: 'destructive', title: 'Selection Required' }); return; }
    const cost = getCost('generateNextLine');
    if (!deductInk(cost, 'generateNextLine', e)) return;
    setGenerating(true, 'Neural Synthesis Active...');
    try {
        const section = track.sections.find(s => s.id === sectionId);
        const priorLines = section.bars.filter(b => b.idx < barIdx).map(b => b.text);
        const nextLines = section.bars.filter(b => b.idx > barIdx).map(b => b.text);
        const targetLine = section.bars.find(b => b.idx === barIdx)?.text || '';
        if (mode === 'next') priorLines.push(targetLine);
        else nextLines.unshift(targetLine);
        const res = await generateNextLine(await withAiAuth({
            userName: user?.displayName, priorLines, nextLines, sectionType: section.type, vibe: isVibeActive(track) ? track.vibe : undefined, intents: isIntentsActive(track) ? (track.checkedIntents || []) : [], styleProfileSummary: isStyleActive(track) ? (effectiveStyleProfile?.history[0]?.analysis || '') : '', rhymeMode: 'continue', theme: track.title, endWith: isIntentsActive(track) ? track.endWith : null, mergedDirection: mergeDirection(album.direction, track.direction), negativePrompt: isGuardrailsActive(track) ? track.guardrails?.negativePrompt : undefined, forbiddenWords: isGuardrailsActive(track) ? track.guardrails?.forbiddenWords : undefined, mustIncludeWords: isGuardrailsActive(track) ? track.guardrails?.mustIncludeWords : undefined,
        }));
        if (!res || res.length === 0) throw new Error("Synthesis produced no results.");
        setGenerationOptions(res);
        setIsMinimized(false);
        setPendingGenCtx({ mode, sId: sectionId, bIdx: barIdx });
        addUsageLog({ flowName: 'generateNextLine', inkCost: cost, status: 'success' });
    } catch (e: any) { refundInk(cost); toast({ variant: 'destructive', title: 'Synthesis Failed', description: e.message }); } finally { setGenerating(false); }
  };

  const handleAcceptOption = (line: string) => {
    if (!pendingGenCtx || !track) return;
    const { mode, sId, bIdx } = pendingGenCtx;
    const insertIdx = mode === 'next' ? bIdx + 1 : bIdx;
    const newSections = track.sections.map(s => {
        if (s.id !== sId) return s;
        const updatedBars = s.bars.map(b => ({ ...b }));
        updatedBars.forEach(b => { if (b.idx >= insertIdx) b.idx += 1; });
        updatedBars.push({ idx: insertIdx, text: line.trim(), accepted: true, syllables: line.trim().split(' ').length, rhymeKey: '?' });
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
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <p className="text-sm text-muted-foreground font-code uppercase tracking-widest">Workstation could not initialize.</p>
          <Button className="font-bold uppercase text-xs" onClick={() => router.push('/')}>Return to Vault</Button>
        </div>
      );
    }
    return <div className="flex h-screen items-center justify-center bg-background"><StudioLoader size="lg" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <LeftPanel track={track} album={album} onUpdateTrack={handleUpdateTrack} activeSectionId={activeSectionId} setActiveSectionId={setActiveSectionId} setExportDialogOpen={setExportDialogOpen} onCollapse={setLeftCollapsed} leftCollapsed={leftCollapsed} setGenerateDraftOpen={setGenerateDraftOpen} scratchPadRef={scratchPadRef} isPro={isPro} />
      <CenterPanel track={track} onUpdateTrack={handleUpdateTrack} handleSharedLineGeneration={handleSharedLineGeneration} activeGeneratorBar={activeGeneratorBar} setActiveGeneratorBar={setActiveGeneratorBar} activeBarText={activeBarText} setActiveBarText={setActiveBarText} setFreestyleOpen={setFreestyleOpen} album={album} setSmartStructureOpen={setSmartStructureOpen} isRhymeLoading={isRhymeLoading} activeSectionId={activeSectionId} handleRunRhymeScan={handleRunRhymeScan} generationOptions={generationOptions} setGenerationOptions={setGenerationOptions} handleAcceptOption={handleAcceptOption} handleUndo={handleUndo} canUndo={sectionsHistory.length > 0} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <RightPanel 
        track={track} 
        album={album} 
        onUpdateTrack={handleUpdateTrack} 
        styleProfile={effectiveStyleProfile} 
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
      />
      <GenerateSongDraftDialog open={generateDraftOpen} onOpenChange={setGenerateDraftOpen} track={track} styleProfile={effectiveStyleProfile} onDraftGenerated={(sections) => handleUpdateTrack({ sections })} />
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} album={album} tracks={[track]} exportType="track" />
      <FreestylePad open={freestyleOpen} onOpenChange={setFreestyleOpen} onAddFreestyle={(text) => { const lines = text.split('. ').filter(l => l.trim()); const activeS = track.sections.find(s => s.id === activeSectionId) || track.sections[0]; const startIdx = activeS.bars.length + 1; const newBars = lines.map((l, i) => ({ idx: startIdx + i, text: l.trim(), accepted: true, syllables: l.trim().split(' ').length, rhymeKey: '?' })); handleUpdateTrack({ sections: track.sections.map(s => s.id === activeS.id ? { ...s, bars: [...s.bars, ...newBars] } : s) }); setFreestyleOpen(false); }} disabled={false} trackVibe={track.vibe} albumTheme={album.theme} styleProfileSummary={styleProfile.history[0]?.analysis || ''} isPro={user?.subscriptionStatus === 'active'} />
      <SmartStructureDialog open={smartStructureOpen} onOpenChange={setSmartStructureOpen} onApply={(sections: any) => handleUpdateTrack({ sections })} />
      <ImproveMyStyleDialog open={improveStyleOpen} onOpenChange={setImproveStyleOpen} track={track} onUpdateStyle={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} />
      <StyleVaultDialog open={styleVaultOpen} onOpenChange={setStyleVaultOpen} album={album} updateAlbum={updateAlbum} onApply={(analysis: string, metrics: any) => updateStyleProfile(analysis, metrics)} />
      <ArchivalNamingDialog open={saveStyleNamingOpen} onOpenChange={setSaveStyleNamingOpen} type="Style" onConfirm={handleConfirmSaveStyle} />
    </div>
  );
}

export function TrackEditorContent(props: { trackId: string, albumId: string }) {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><StudioLoader size="lg" /></div>}>
            <TrackEditorImplementation {...props} />
        </Suspense>
    )
}
