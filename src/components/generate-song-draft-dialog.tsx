'use client';

/**
 * @fileOverview MASTER LOCKDOWN (5/24/2026) - Generation Workstation Calibration Hub.
 * 
 * - Workflow: Seed DNA -> High-Fidelity Extraction -> Calibration Hub -> Synthesis.
 * - FIX (5/24): Added missing motion import to resolve ReferenceError.
 * - FIX (5/24): Resolved Structure header overlap by enforcing shrink-0 and gap protocols.
 */

import React, { useState, useContext, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Track, StyleProfile, WizardState, Direction, TrackSection, Bar, WizardAnalysis, StyleAnalysis } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
    Sparkles, 
    BrainCircuit, 
    Target, 
    Zap, 
    ChevronRight, 
    Shield,
    ArrowLeft,
    Droplets,
    CheckCircle2,
    Compass,
    Palette,
    RefreshCw,
    Wand2,
    Settings,
    GitMerge,
    Timer,
    Fingerprint,
    PlusCircle,
    ChevronDown,
    X,
    AlertTriangle,
    NotebookPen,
    MessageSquareQuote,
    Save,
    ArrowRightLeft,
    ListRestart,
    FolderOpen,
    Clock,
    Link2,
    Eye,
    Dna,
    GitBranch,
    ChevronUp,
    Info,
    LayoutTemplate,
    UserCircle,
    TimerReset,
    ArrowDown,
    Trash2,
    ListMusic
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { suggestRelayDirections, generateRelayDraft } from '@/ai/flows/writers-relay';
import { generateSongDraft } from '@/ai/flows/generate-song-draft';
import { findRhymes } from '@/ai/flows/find-rhymes';
import { mergeDirection, cn } from '@/lib/utils';
import { DataContext } from '@/context/data-context';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { withAiAuth } from '@/lib/ai-client';
import { Textarea } from './ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useUIState } from '@/hooks/use-ui-state';
import { Progress } from './ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { isProUser } from '@/lib/subscription';
import { SYSTEM_DNA_PRESETS, SYSTEM_STYLE_PRESETS, SYSTEM_VIBE_PRESETS } from '@/lib/system-presets';
import { DNASynthesisLoader } from '@/components/dna-synthesis-loader';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HighlightedText } from './highlighted-text';

interface GenerateSongDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track;
  styleProfile: StyleProfile;
  onDraftGenerated: (sections: any[]) => void;
}

const STRUCTURE_PRESETS = [
    { 
        id: 'default', 
        name: 'Default', 
        desc: 'Standard song structure (Intro, 2 Verses, 2 Hooks).',
        sections: [
            { name: 'Intro', bars: 4, enabled: true },
            { name: 'Verse', bars: 16, enabled: true },
            { name: 'Hook', bars: 8, enabled: true },
            { name: 'Verse', bars: 16, enabled: true },
            { name: 'Hook', bars: 8, enabled: true },
        ]
    },
    { 
        id: 'extended', 
        name: 'Extended', 
        desc: 'Extended radio format with Bridge and Outro.',
        sections: [
            { name: 'Intro', bars: 4, enabled: true },
            { name: 'Verse', bars: 16, enabled: true },
            { name: 'Hook', bars: 8, enabled: true },
            { name: 'Verse', bars: 16, enabled: true },
            { name: 'Hook', bars: 8, enabled: true },
            { name: 'Bridge', bars: 8, enabled: true },
            { name: 'Hook', bars: 8, enabled: true },
            { name: 'Outro', bars: 4, enabled: true },
        ]
    },
    { 
        id: 'street', 
        name: 'Street', 
        desc: 'Hard Verse focus with simple Hooks.',
        sections: [
            { name: 'Verse', bars: 16, enabled: true },
            { name: 'Hook', bars: 8, enabled: true },
            { name: 'Verse', bars: 16, enabled: true },
            { name: 'Hook', bars: 8, enabled: true },
        ]
    },
    { 
        id: 'freestyle', 
        name: 'Freestyle', 
        desc: 'Single long Verse block for continuous bars.',
        sections: [
            { name: 'Verse', bars: 32, enabled: true }
        ]
    }
];

export function GenerateSongDraftDialog({ open, onOpenChange, track, styleProfile, onDraftGenerated }: GenerateSongDraftDialogProps) {
  const { user } = useAuth();
  const isPro = isProUser(user);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const { setGenerating } = useUIState();
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<number>(0); 
  const { getAlbumById, updateTrack, updateAlbum } = useContext(DataContext);
  const album = getAlbumById(track.albumId);

  const [hubStructure, setHubSections] = useState<{name: string, bars: number, enabled: boolean}[]>([]);
  const [lyricsAbout, setLyricsAbout] = useState('');
  const [maxLineLen, setMaxLineLen] = useState(120);
  
  const [hubDirection, setHubDirection] = useState<Partial<Direction>>({});
  const [hubVibe, setHubVibe] = useState<Track['vibe']>(track.vibe);
  const [hubVibeEnabled, setHubVibeEnabled] = useState(track.vibe?.enabled ?? true);
  
  const [inheritAlbum, setInheritAlbum] = useState(true);
  const [inheritTrack, setInheritTrack] = useState(true);
  const [enableGuardrails, setEnableGuardrails] = useState(true);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [mustIncludeWords, setMustIncludeWords] = useState('');
  
  const [hubIntents, setHubIntents] = useState<string[]>([]);
  const [intentsEnabled, setIntentsEnabled] = useState(false);
  const [newHubIntent, setNewHubIntent] = useState('');

  const [hubStyleEnabled, setHubStyleEnabled] = useState(true);
  const [hubStyleAnalysis, setHubStyleAnalysis] = useState('');
  const [hubStyleMetrics, setHubStyleMetrics] = useState({ vocabularyScore: 50, rhymeComplexity: 50, cadenceMap: 'Neutral' });

  const [wizardState, setWizardState] = useState<WizardState>({
    lyrics: '',
    analysis: null,
    directions: null,
    selectedDirections: [],
    generatedVariant: null,
    excludedWords: '',
  });

  const [previewRhymeGroups, setPreviewRhymeGroups] = useState<{ words: string[] }[]>([]);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [syncLyricsToggle, setSyncLyricsToggle] = useState(false);
  const [strainTab, setStrainTab] = useState<'insights' | 'vault'>('insights');
  const [styleTab, setStyleTab] = useState<'current' | 'vault'>('current');
  const [saveNamingOpen, setSaveNamingOpen] = useState(false);
  const [saveStyleNamingOpen, setSaveStyleNamingOpen] = useState(false);
  const [expandedVaultIdx, setExpandedVaultIdx] = useState<number | null>(null);

  const { deductInk, refundInk, addUsageLog } = useUsage();
  const { getCost, getEffectiveCost, tooltip, buttonLabel } = useInkCosts();

  useEffect(() => {
    if (open) { 
        setStep(0); 
        setProgress(0);
        setLyricsAbout(track.specialInstructions || '');
        setSyncLyricsToggle(false);
        setHubDirection(track.direction || {});
        setHubVibe(track.vibe);
        setHubVibeEnabled(track.vibe?.enabled ?? true);
        setHubIntents(track.checkedIntents || []);
        setIntentsEnabled(track.intentsEnabled ?? (track.checkedIntents?.length > 0));
        setEnableGuardrails(track.guardrails?.enabled ?? true);
        setNegativePrompt(track.guardrails?.negativePrompt ?? '');
        setForbiddenWords((track.guardrails?.forbiddenWords || []).join(', '));
        setMustIncludeWords((track.guardrails?.mustIncludeWords || []).join(', '));
        setHubStyleEnabled(track.styleEnabled === true);
        setHubStyleAnalysis(styleProfile?.history[0]?.analysis || '');
        setHubStyleMetrics(styleProfile?.history[0]?.metrics || { vocabularyScore: 50, rhymeComplexity: 50, cadenceMap: 'Neutral' });
        setExpandedVaultIdx(null);
        setPreviewRhymeGroups([]);
        setNewHubIntent('');
        
        if (track.sections?.length > 0) {
            setHubSections(track.sections.map(s => ({ name: s.type, bars: s.bars.length, enabled: true })));
        } else {
            setHubSections(STRUCTURE_PRESETS[0].sections);
        }
    }
  }, [open, track.id]);

  useEffect(() => {
    if (syncLyricsToggle && track.sections) {
        const allLyrics = track.sections.flatMap(s => s.bars.map(b => b.text)).join('\n');
        setWizardState(prev => ({ ...prev, lyrics: allLyrics }));
    }
  }, [syncLyricsToggle, track.sections]);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
        setProgress(0);
        interval = setInterval(() => {
            setProgress(prev => (prev >= 98 ? 98 : prev + (100 - prev) * 0.08));
        }, 300);
    } else {
        setProgress(p => p > 0 ? 100 : 0);
        const timer = setTimeout(() => setProgress(0), 1200);
        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        }
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const activeBarsCount = useMemo(() => {
    return hubStructure.filter(s => s.enabled).reduce((acc, s) => acc + s.bars, 0);
  }, [hubStructure]);

  const activeDraftBase = activeBarsCount * getCost('generateDraftPerBar');
  const activeDraftCharged = getEffectiveCost('generateDraftPerBar', activeDraftBase);

  const activeBadges = useMemo(() => {
      const badges = [];
      if (enableGuardrails) badges.push({ text: 'GUARDRAILS', color: 'border-rose-500 text-rose-500' });
      if (intentsEnabled && hubIntents.length > 0) badges.push({ text: `${hubIntents.length} INTENTS`, color: 'border-sky-500 text-sky-500' });
      if (lyricsAbout.trim()) badges.push({ text: 'SPECIAL INSTRUCTIONS', color: 'border-primary text-primary' });
      if (hubVibeEnabled) badges.push({ text: 'VIBE', color: 'border-amber-500 text-amber-500' });
      if (inheritAlbum && album?.direction?.enabled) badges.push({ text: 'ALBUM DNA', color: 'border-emerald-500 text-emerald-500' });
      if (inheritTrack) badges.push({ text: 'TRACK DNA', color: 'border-green-500 text-green-500' });
      if (hubStyleEnabled && hubStyleAnalysis.trim()) badges.push({ text: 'STYLE DNA', color: 'border-fuchsia-500 text-fuchsia-500' });
      if (wizardState.selectedDirections.length > 0) badges.push({ text: `${wizardState.selectedDirections.length} REMIX PATHS`, color: 'border-primary text-primary' });
      return badges;
  }, [enableGuardrails, intentsEnabled, hubIntents, lyricsAbout, hubVibeEnabled, inheritAlbum, album, inheritTrack, hubStyleEnabled, wizardState.selectedDirections]);

  const handleApplyGeneratedDraft = () => {
    if (!wizardState.generatedVariant) return;
    const g = wizardState.generatedVariant;
    const sections = g.sections.map((s, i) => ({
        id: `draft-${Date.now()}-${i}`,
        type: s.name.toLowerCase() as any,
        bars: s.bars.map((l, j) => ({
            idx: j + 1,
            text: l.trim(),
            accepted: true,
            rhymeKey: '?',
            syllables: l.split(' ').length,
            justGenerated: true
        }))
    }));
    onDraftGenerated(sections);
    toast({ title: "Draft Applied to Sheet" });
    onOpenChange(false);
  };

  const handleFullDraftGenerate = async (e: any) => {
    if (!deductInk(activeDraftBase, 'generateSongDraft', e)) return;
    setIsGenerating(true);
    setGenerating(true, 'Synthesizing Studio Draft...');
    try {
      updateTrack(track.albumId, track.id, { 
        specialInstructions: lyricsAbout,
        direction: hubDirection,
        vibe: { ...hubVibe, enabled: hubVibeEnabled },
        checkedIntents: hubIntents,
        intentsEnabled: intentsEnabled,
        guardrails: {
            enabled: enableGuardrails,
            negativePrompt,
            forbiddenWords: forbiddenWords.split(',').map(w => w.trim()).filter(Boolean),
            mustIncludeWords: mustIncludeWords.split(',').map(w => w.trim()).filter(Boolean)
        },
        styleEnabled: hubStyleEnabled,
      });

      const result = await generateSongDraft(await withAiAuth({
        userName: user?.displayName,
        albumDirection: album?.direction,
        trackDirection: hubDirection,
        useAlbumDirection: inheritAlbum,
        useTrackDirection: inheritTrack,
        vibe: { ...hubVibe, enabled: hubVibeEnabled },
        intents: intentsEnabled ? hubIntents : [],
        styleProfile: { analysis: hubStyleEnabled ? hubStyleAnalysis : '' },
        sectionTemplate: hubStructure.filter(s => s.enabled).map(s => ({ name: s.name, bars: s.bars })),
        sectionsToGenerate: hubStructure.filter(s => s.enabled).map(s => s.name),
        rhymePreset: 'trap-soul',
        constraints: { maxLineLen },
        lyricsAbout: lyricsAbout,
        negativePrompt: enableGuardrails ? negativePrompt : undefined,
        forbiddenWords: enableGuardrails ? forbiddenWords.split(',').map(w => w.trim()).filter(Boolean) : undefined,
        mustIncludeWords: enableGuardrails ? mustIncludeWords.split(',').map(w => w.trim()).filter(Boolean) : undefined,
      }));

      const previewVariant = {
          title: track.title,
          sections: result.sections.map(s => ({ name: s.name, bars: s.lines }))
      };
      
      setWizardState(prev => ({ ...prev, generatedVariant: previewVariant }));
      
      try {
          const allText = result.sections.flatMap(s => s.lines).join('\n');
          const rhymeRes = await findRhymes(await withAiAuth({ text: allText, userName: user?.displayName }));
          setPreviewRhymeGroups(rhymeRes.rhymeGroups);
      } catch (err) { console.warn("Preview pulse failed", err); }

      addUsageLog({ flowName: 'generateSongDraft', inkCost: activeDraftCharged, status: 'success' });
      setStep(5);
    } catch (e: any) {
      refundInk(activeDraftBase);
      toast({ variant: 'destructive', title: 'Generation Failed', description: e.message });
    } finally {
      setIsGenerating(false);
      setGenerating(false);
    }
  };

  const handleRelayAnalyze = async (sourceText: string, e: any) => {
    const cost = getCost('analyzeRelayAssets');
    if (!deductInk(cost, 'analyzeRelayAssets', e)) return;
    setIsGenerating(true);
    setGenerating(true, 'Performing DNA Extraction...');
    try {
        const result = await suggestRelayDirections(await withAiAuth({ lyrics: sourceText, userName: user?.displayName }));
        setWizardState(prev => ({ ...prev, lyrics: sourceText, analysis: result.analysis, directions: result.directions }));
        addUsageLog({ flowName: 'analyzeRelayAssets', inkCost: cost, status: 'success' });
        setStep(2);
    } catch (e: any) { 
        refundInk(cost); 
        toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message });
    } finally { 
        setIsGenerating(false); 
        setGenerating(false); 
    }
  };

  const handleConfirmSaveDNA = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Archive custom DNA strains with Studio Pro.' });
        return;
      }
      if (!album || !name.trim()) return;
      const currentDir = hubDirection || { enabled: true };
      const profile = {
          name: name.trim(),
          createdAt: new Date().toISOString(),
          sourceTrackTitle: track.title,
          analysis: wizardState.analysis!,
          mapping: JSON.parse(JSON.stringify(currentDir))
      };
      const existing = album.dnaPresets || [];
      updateAlbum(album.id, { dnaPresets: [...existing, profile] });
      toast({ title: "DNA Strain Archived" });
      setSaveNamingOpen(false);
  };

  const handleConfirmSaveStyle = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Archive custom Style DNA with Studio Pro.' });
        return;
      }
      if (!hubStyleAnalysis || !album || !name.trim()) return;
      const preset = {
          name: name.trim(),
          createdAt: new Date().toISOString(),
          analysis: hubStyleAnalysis,
          metrics: hubStyleMetrics
      };
      const existing = album.stylePresets || [];
      updateAlbum(album.id, { stylePresets: [...existing, preset] });
      toast({ title: "Style Strain Archived" });
      setSaveStyleNamingOpen(false);
  };

  const handleAddHubIntent = () => {
      if (!newHubIntent.trim() || !album) return;
      const existing = album.thingsToSay || [];
      updateAlbum(album.id, { thingsToSay: [...existing, newHubIntent.trim()] });
      setHubIntents(prev => [...prev, newHubIntent.trim()]);
      setNewHubIntent('');
      toast({ title: "Motif Added" });
  };

  const handleRelayDraftSynthesis = async (e: any) => {
    const cost = activeBarsCount * getCost('generateDraftPerBar');
    if (!deductInk(cost, 'generateRelayDraft', e)) return;
    
    setIsGenerating(true);
    setGenerating(true, 'Synthesizing Neural Draft...');
    try {
        updateTrack(track.albumId, track.id, { 
            direction: hubDirection, 
            specialInstructions: lyricsAbout,
            vibe: { ...hubVibe, enabled: hubVibeEnabled },
            checkedIntents: hubIntents,
            intentsEnabled: intentsEnabled,
            guardrails: {
                enabled: enableGuardrails,
                negativePrompt,
                forbiddenWords: forbiddenWords.split(',').map(w => w.trim()).filter(Boolean),
                mustIncludeWords: mustIncludeWords.split(',').map(w => w.trim()).filter(Boolean)
            },
            styleEnabled: hubStyleEnabled,
        });

        const remixDirection =
          wizardState.selectedDirections.length > 0
            ? wizardState.selectedDirections.map((d) => `${d.name}: ${d.description}`).join(' | ')
            : 'No remix paths selected — follow Calibration Hub rules only.';

        const result = await generateRelayDraft(await withAiAuth({
            analysis: JSON.stringify(wizardState.analysis),
            direction: remixDirection,
            styleProfile: hubStyleEnabled && hubStyleAnalysis.trim() ? { analysis: hubStyleAnalysis } : { analysis: '' },
            distanceFromSource: 'balanced',
            delivery: 'dynamic',
            cleanliness: 'standard',
            intents: intentsEnabled ? hubIntents : [],
            vibe: { ...hubVibe, enabled: hubVibeEnabled },
            directionSuite: hubDirection,
            specialInstructions: lyricsAbout,
            negativePrompt: enableGuardrails ? negativePrompt : undefined,
            forbiddenWords: enableGuardrails ? forbiddenWords.split(',').map(w => w.trim()).filter(Boolean) : undefined,
            mustIncludeWords: enableGuardrails ? mustIncludeWords.split(',').map(w => w.trim()).filter(Boolean) : undefined,
            structure: hubStructure.filter(s => s.enabled).map(s => ({ name: s.name, bars: s.bars })),
            userName: user?.displayName
        }));
        setWizardState(prev => ({ ...prev, generatedVariant: result }));
        try {
            const allText = result.sections.flatMap(s => s.bars).join('\n');
            const rhymeRes = await findRhymes(await withAiAuth({ text: allText, userName: user?.displayName }));
            setPreviewRhymeGroups(rhymeRes.rhymeGroups);
        } catch (err) { console.warn("Pulse failed", err); }
        addUsageLog({ flowName: 'generateRelayDraft', inkCost: cost, status: 'success' });
        setStep(5);
    } catch (e: any) { refundInk(cost); toast({ variant: 'destructive', title: 'Synthesis Failed', description: e.message }); } finally { setIsGenerating(false); setGenerating(false); }
  };

  const handleAddStructureSection = (type: string) => {
      setHubSections(prev => [...prev, { name: type, bars: type === 'Verse' ? 16 : 8, enabled: true }]);
  };

  const handleRemoveStructureSection = (idx: number) => {
      setHubSections(prev => prev.filter((_, i) => i !== idx));
  };

  const renderAnalysisField = (title: string, content: string | string[] | null | undefined, icon: any, fieldKey?: keyof Direction) => {
      if (!content) return null;
      return (
          <Card className="bg-card/50 border-white/10 p-6 space-y-4 group transition-all hover:bg-white/10 relative overflow-hidden shadow-xl min-h-[160px] flex flex-col">
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 text-primary">
                      {React.createElement(icon, { className: "h-5 w-5" })}
                      <h5 className="text-xs font-bold uppercase tracking-[0.2em]">{title}</h5>
                  </div>
                  {fieldKey && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => {
                        setHubDirection(prev => ({ ...prev, [fieldKey]: Array.isArray(content) ? content.join(', ') : content }));
                        toast({ title: `DNA Part Injected: ${title}` });
                      }}>
                          <Zap className="h-5 w-5" />
                      </Button>
                  )}
              </div>
              <div className="flex-grow">
                  {Array.isArray(content) ? (
                      <div className="flex flex-wrap gap-2.5 mt-3">
                          {content.map((c, i) => <Badge key={i} variant="outline" className="text-xs font-bold uppercase py-1.5 px-4 border-white/20 bg-background/50 text-primary">{c}</Badge>)}
                      </div>
                  ) : <p className="text-sm md:text-base font-code font-bold text-foreground/90 italic leading-relaxed whitespace-pre-wrap break-words mt-2">"{content}"</p>}
              </div>
          </Card>
      );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-[4vh] -translate-x-1/2 translate-y-0 sm:max-w-7xl w-[98vw] h-[min(92vh,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] flex flex-col gap-0 bg-[#050505] border-2 overflow-hidden p-0 rounded-xl shadow-2xl z-[2100]">
        <DialogHeader className="shrink-0 p-3 border-b bg-[#050505] flex-row items-center justify-between relative z-[110]">
            <div className="flex items-center">
                {step > 0 && <Button variant="ghost" size="icon" className="h-8 w-8 mr-2 rounded-full" onClick={() => {
                    if (step === 10 && wizardState.analysis) setStep(3);
                    else if (step === 10) setStep(0);
                    else if (step === 3) setStep(2);
                    else if (step === 2) setStep(1);
                    else if (step === 5) setStep(10);
                    else setStep(0);
                }}><ArrowLeft className="h-4 w-4"/></Button>}
                <DialogTitle className="font-headline text-xl font-bold flex items-center gap-2 uppercase tracking-tighter text-foreground">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" /> Generation Workstation
                </DialogTitle>
                <DialogDescription className="sr-only">Step-by-step neural synthesis and calibration.</DialogDescription>
            </div>
            <div className="flex items-center gap-4 pr-12">
                <Badge variant="outline" className="h-5 px-2 text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary">
                    {step === 0 ? 'Mode Select' : step === 10 ? 'Calibration Hub' : step === 5 ? 'Approval Step' : 'Analysis Step'}
                </Badge>
            </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-[#050505] isolate">
          {isGenerating && (
            <div
              className="generating-overlay-backdrop absolute inset-0 z-[100] bg-[#050505]"
              aria-hidden
            />
          )}
          <div
            className={cn(
              'generating-overlay absolute inset-0 z-[101] flex flex-col items-center justify-center gap-4 px-4 transition-opacity duration-300',
              isGenerating ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            aria-hidden={!isGenerating}
          >
            <DNASynthesisLoader
              progress={progress}
              compact
              activeRules={{
                dna: (inheritAlbum && !!album?.direction?.enabled) || inheritTrack,
                intents: intentsEnabled && hubIntents.length > 0,
                style: hubStyleEnabled && !!hubStyleAnalysis?.trim(),
                vibe: hubVibeEnabled,
                guardrails: enableGuardrails,
                instructions: !!lyricsAbout.trim(),
              }}
              statusText={wizardState.analysis ? 'Synthesizing DNA remix from active strains...' : 'Generating studio draft from active strains...'}
            />
            <div className="w-full max-w-[220px] space-y-2">
              <div className="relative h-1.5 bg-white/5 border border-amber-500/20 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-700 via-yellow-500 to-amber-300"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold font-code text-amber-400 uppercase tracking-[0.15em]">
                <span>Strand Build</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          <div className={cn('flex-1 min-h-0 flex flex-col bg-[#050505] overflow-y-auto studio-scrollbar', isGenerating && 'invisible pointer-events-none')}>
          {step === 0 && (
            <div className="min-h-full flex flex-col items-center justify-center p-6 py-10 space-y-8 md:space-y-12 animate-in fade-in duration-700">
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-headline font-bold text-white uppercase tracking-tight">Select Workflow Mode</h2>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-[0.4em]">Initialize your creative process.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    <Card className="cursor-pointer border-2 hover:border-primary/50 p-10 flex flex-col items-center justify-center gap-6 bg-primary/5 hover:scale-[1.05] transition-all group relative overflow-hidden" onClick={() => setStep(10)}>
                        <Wand2 className="h-16 w-12 text-primary group-hover:animate-bounce" />
                        <div className="text-center space-y-3">
                            <h4 className="font-headline text-3xl font-bold uppercase text-white">Full Studio Draft</h4>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">Direct synthesis from active rules.</p>
                        </div>
                    </Card>
                    <Card className="cursor-pointer border-2 hover:border-sky-500/50 p-10 flex flex-col items-center justify-center gap-6 bg-sky-500/5 hover:scale-[1.05] transition-all group" onClick={() => setStep(1)}>
                        <BrainCircuit className="h-16 w-12 text-sky-400 group-hover:animate-pulse" />
                        <div className="text-center space-y-3">
                            <h4 className="font-headline text-3xl font-bold uppercase text-white">DNA & REMIX</h4>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">Extract and Archive strains to seed your next synthesis loop.</p>
                        </div>
                    </Card>
                </div>
            </div>
          )}

          {(step === 10) && (
              <ScrollArea className="flex-grow studio-scrollbar">
                  <div className="p-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full max-w-7xl pb-20">
                          <div className="lg:col-span-3 space-y-8">
                              <div className="space-y-4">
                                  <div className="flex items-center justify-between gap-4 w-full">
                                      <div className="flex items-center gap-2 text-yellow-500 shrink-0">
                                          <GitMerge className="h-5 w-5" />
                                          <h3 className="font-headline font-bold text-xl uppercase leading-none">Structure</h3>
                                      </div>
                                      <Select onValueChange={(val) => {
                                          const p = STRUCTURE_PRESETS.find(x => x.id === val);
                                          if (p) setHubSections(p.sections.map(s => ({ ...s })));
                                      }}>
                                          <SelectTrigger className="h-8 w-28 text-[8px] font-bold uppercase bg-background/50 border-white/10 shrink-0">
                                              <SelectValue placeholder="LOAD PRESET" />
                                          </SelectTrigger>
                                          <SelectContent className="z-[3100]">
                                              {STRUCTURE_PRESETS.map(p => (
                                                  <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold uppercase">{p.name}</SelectItem>
                                              ))}
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  <Card className="bg-black/40 border-white/5 p-4 rounded-xl shadow-2xl">
                                      <ScrollArea className="h-[280px] pr-2">
                                          <div className="space-y-2">
                                              {hubStructure.map((s, idx) => (
                                                  <div key={`${s.name}-${idx}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                                                      <div className="flex items-center gap-3">
                                                          <Checkbox checked={s.enabled} onCheckedChange={(c) => setHubSections(prev => prev.map((x, i) => i === idx ? { ...x, enabled: !!c } : x))} />
                                                          <span className="font-bold uppercase text-[10px] text-white">{s.name}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                          <Input type="number" value={s.bars} onChange={(e) => setHubSections(prev => prev.map((x, i) => i === idx ? { ...x, bars: parseInt(e.target.value) || 0 } : x))} className="w-10 h-6 text-center font-mono text-[9px] bg-background/50 p-0" />
                                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveStructureSection(idx)}>
                                                              <Trash2 className="h-3 w-3" />
                                                          </Button>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </ScrollArea>
                                      <div className="pt-3 border-t border-white/5">
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                  <Button variant="outline" className="w-full h-8 text-[9px] font-bold uppercase border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/5">
                                                      <PlusCircle className="h-3 w-3 mr-2" /> Add Section
                                                  </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="center" className="bg-card border-white/10 w-40 z-[3100]">
                                                  {['Intro', 'Verse', 'Hook', 'Chorus', 'Bridge', 'Outro', 'Pre'].map(t => (
                                                      <DropdownMenuItem key={t} onClick={() => handleAddStructureSection(t)} className="text-[10px] font-bold uppercase">{t}</DropdownMenuItem>
                                                  ))}
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                      </div>
                                  </Card>
                              </div>
                              <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-amber-500">
                                          <Palette className="h-5 w-5" />
                                          <h3 className="font-headline font-bold text-xl uppercase">Track Vibe</h3>
                                      </div>
                                      <Switch checked={hubVibeEnabled} onCheckedChange={setHubVibeEnabled} />
                                  </div>
                                  <Card className={cn("bg-amber-500/5 border-amber-500/20 p-4 rounded-xl space-y-4 transition-opacity", !hubVibeEnabled && "opacity-50 pointer-events-none")}>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1"><Label className="text-[9px] font-bold uppercase text-amber-700">Genre</Label><Input placeholder="e.g. Lofi-Hop" value={hubVibe.genre} onChange={(e) => setHubVibe(v => ({ ...v, genre: e.target.value }))} className="h-8 text-[10px] bg-background/50" /></div>
                                          <div className="space-y-1"><Label className="text-[9px] font-bold uppercase text-amber-700">BPM</Label><Input type="number" placeholder="90" value={hubVibe.tempoBPM} onChange={(e) => setHubVibe(v => ({ ...v, tempoBPM: parseInt(e.target.value) || 90 }))} className="h-8 text-[10px] bg-background/50" /></div>
                                      </div>
                                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase text-amber-700">Production</Label><Textarea placeholder="e.g. Saturated 808s, airy vocal pads..." value={hubVibe.instrumentation} onChange={(e) => setHubVibe(v => ({ ...v, instrumentation: e.target.value }))} className="h-20 text-[10px] bg-background/50 resize-none" /></div>
                                      {!isPro && (
                                        <Select onValueChange={(name) => {
                                          const p = SYSTEM_VIBE_PRESETS.find((x) => x.name === name);
                                          if (p) setHubVibe({ genre: p.genre, tempoBPM: p.tempoBPM, feeling: p.feeling, instrumentation: p.instrumentation, enabled: true });
                                        }}>
                                          <SelectTrigger className="h-7 text-[8px] font-bold uppercase"><SelectValue placeholder="Load system vibe preset" /></SelectTrigger>
                                          <SelectContent className="z-[3100]">
                                            {SYSTEM_VIBE_PRESETS.map((p) => <SelectItem key={p.name} value={p.name} className="text-[9px] uppercase">{p.name}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      )}
                                  </Card>
                              </div>
                              <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-sky-500">
                                          <Target className="h-5 w-5" />
                                          <h3 className="font-headline font-bold text-xl uppercase">Intents</h3>
                                      </div>
                                      <Switch checked={intentsEnabled} onCheckedChange={setIntentsEnabled} />
                                  </div>
                                  <Card className={cn("bg-sky-500/5 border-sky-500/20 p-4 rounded-xl transition-opacity", !intentsEnabled && "opacity-50 pointer-events-none")}>
                                      <div className="space-y-4">
                                          <ScrollArea className="h-[120px] pr-2">
                                              <div className="flex flex-wrap gap-2">
                                                  {(album?.thingsToSay || []).map(intent => {
                                                      const isSelected = hubIntents.includes(intent);
                                                      return (
                                                          <Badge 
                                                              key={intent} 
                                                              variant={isSelected ? "default" : "outline"} 
                                                              className={cn("cursor-pointer text-[9px] uppercase", isSelected ? "bg-sky-500" : "border-sky-500/30 text-sky-400")}
                                                              onClick={() => setHubIntents(prev => isSelected ? prev.filter(i => i !== intent) : [...prev, intent])}
                                                          >
                                                              {intent}
                                                          </Badge>
                                                      );
                                                  })}
                                              </div>
                                          </ScrollArea>
                                          <div className="flex gap-2 pt-2 border-t border-sky-500/10">
                                              <Input 
                                                  placeholder="Add new intent..." 
                                                  value={newHubIntent} 
                                                  onChange={(e) => setNewHubIntent(e.target.value)}
                                                  className="h-7 text-[9px] bg-background/50 border-sky-500/10"
                                                  onKeyDown={(e) => e.key === 'Enter' && handleAddHubIntent()}
                                              />
                                              <Button size="icon" className="h-7 w-7 bg-sky-600 hover:bg-sky-700" onClick={handleAddHubIntent}>
                                                  <PlusCircle className="h-3.5 w-3.5" />
                                              </Button>
                                          </div>
                                      </div>
                                  </Card>
                              </div>
                          </div>

                          <div className="lg:col-span-5 space-y-8">
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-green-500">
                                      <Compass className="h-5 w-5" />
                                      <h3 className="font-headline font-bold text-xl uppercase">Creative DNA</h3>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2"><span className="text-[8px] font-bold text-muted-foreground uppercase">Inherit Album</span><Switch checked={inheritAlbum} onCheckedChange={setInheritAlbum} /></div>
                                      <div className="flex items-center gap-2"><span className="text-[8px] font-bold text-muted-foreground uppercase">Track DNA</span><Switch checked={inheritTrack} onCheckedChange={setInheritTrack} /></div>
                                  </div>
                              </div>
                              <Card className="bg-green-500/5 border-green-500/20 p-6 rounded-xl space-y-4 shadow-2xl">
                                  <ScrollArea className="h-[400px] pr-4">
                                      <div className="space-y-5">
                                          {[
                                            { id: 'setting_world', label: '1. Setting / World', placeholder: 'e.g. A rainy midnight in 1940s Chicago...' },
                                            { id: 'emotion_core', label: '2. Emotion / Core', placeholder: 'e.g. Bitter betrayal mixed with a sense of relief...' },
                                            { id: 'trigger_moment', label: '3. Trigger Moment', placeholder: 'e.g. When the final letter was signed in blood...' },
                                            { id: 'message_truth', label: '4. Message / Truth', placeholder: 'e.g. Loyalty is a luxury no one can afford...' },
                                            { id: 'tone_palette', label: '5. Tone / Palette', placeholder: 'e.g. Gritty, neon-drenched, smoky textures...' }
                                          ].map(f => (
                                              <div key={f.id} className="space-y-2">
                                                  <Label className="text-[9px] font-bold uppercase tracking-widest text-green-700/80">{f.label}</Label>
                                                  <Textarea 
                                                      placeholder={f.placeholder} 
                                                      className="bg-background/40 border-green-500/10 h-16 text-[11px] font-code" 
                                                      value={hubDirection[f.id as keyof Direction] as string || ''}
                                                      onChange={(e) => setHubDirection(prev => ({ ...prev, [f.id]: e.target.value }))}
                                                  />
                                              </div>
                                          ))}
                                      </div>
                                  </ScrollArea>
                              </Card>

                              <div className="space-y-4">
                                  <div className="flex items-center gap-2 text-primary">
                                      <MessageSquareQuote className="h-5 w-5" />
                                      <h3 className="font-headline font-bold text-xl uppercase">Special Instructions</h3>
                                  </div>
                                  <Card className="bg-primary/5 border-primary/20 p-6 rounded-xl">
                                      <Label className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-2 block">What should this song/remix be about?</Label>
                                      <Textarea 
                                          placeholder="e.g. A journey through a lost city, focusing on the feeling of isolation and discovery..." 
                                          className="bg-background/40 border-primary/10 h-32 text-xs font-code p-4" 
                                          value={lyricsAbout}
                                          onChange={(e) => setLyricsAbout(e.target.value)}
                                      />
                                      <p className="text-[8px] text-muted-foreground mt-3 uppercase tracking-widest italic">MANDATORY: These instructions override all general artistic advice.</p>
                                  </Card>
                              </div>
                          </div>

                          <div className="lg:col-span-4 space-y-8">
                              <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-primary">
                                          <Dna className="h-5 w-5" />
                                          <h3 className="font-headline font-bold text-xl uppercase">DNA Strains</h3>
                                      </div>
                                      <Tabs value={strainTab} onValueChange={(v:any) => setStrainTab(v)} className="w-fit">
                                          <TabsList className="h-8 bg-white/5 border-white/10 p-0.5">
                                              <TabsTrigger value="insights" className="text-[8px] px-3 font-bold">INSIGHTS</TabsTrigger>
                                              <TabsTrigger value="vault" className="text-[8px] px-3 font-bold">VAULT</TabsTrigger>
                                          </TabsList>
                                      </Tabs>
                                  </div>
                                  <Card className="bg-primary/5 border-primary/20 p-4 rounded-xl shadow-inner min-h-[220px]">
                                      <ScrollArea className="h-[280px] pr-2">
                                          {strainTab === 'insights' ? (
                                              wizardState.analysis ? (
                                                  <div className="space-y-4">
                                                      {renderAnalysisField('Themes', wizardState.analysis.themes, Link2, 'setting_world')}
                                                      {renderAnalysisField('Emotion', `${wizardState.analysis.emotionalTone.primaryEmotion} / ${wizardState.analysis.emotionalTone.secondaryEmotion}`, Compass, 'emotion_core')}
                                                      {renderAnalysisField('Shift', wizardState.analysis.emotionalShift, ArrowRightLeft, 'trigger_moment')}
                                                      {renderAnalysisField('Arc', wizardState.analysis.narrativeArc, GitBranch, 'message_truth')}
                                                      {renderAnalysisField('POV', wizardState.analysis.pov, UserCircle, 'setting_world')}
                                                      {renderAnalysisField('Tense', wizardState.analysis.tense, TimerReset, 'trigger_moment')}
                                                      {renderAnalysisField('Structure', wizardState.analysis.structure, LayoutTemplate, 'message_truth')}
                                                      {renderAnalysisField('Technical Fingerprint', wizardState.analysis.voiceStyle, Fingerprint, 'tone_palette')}
                                                  </div>
                                              ) : (
                                                  <div className="h-[180px] flex flex-col items-center justify-center text-center p-6 gap-4 border-2 border-dashed border-white/5 rounded-lg">
                                                      <BrainCircuit className="h-10 w-10 text-muted-foreground/20" />
                                                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-4">No recent DNA extracted.</p>
                                                  </div>
                                              )
                                          ) : (
                                              <div className="space-y-3">
                                                  {album?.dnaPresets && album.dnaPresets.length > 0 ? album.dnaPresets.map((p, i) => (
                                                      <Card key={i} className="bg-background/40 border-white/5 overflow-hidden flex flex-col transition-all">
                                                          <div 
                                                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                                            onClick={() => setExpandedVaultIdx(expandedVaultIdx === i ? null : i)}
                                                          >
                                                              <div className="min-w-0 flex-grow pr-4">
                                                                  <p className="text-[10px] font-bold text-primary truncate uppercase">{p.name}</p>
                                                                  <p className="text-[7px] text-muted-foreground uppercase">{p.sourceTrackTitle}</p>
                                                              </div>
                                                              <div className="flex items-center gap-2 shrink-0">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={(e) => { e.stopPropagation(); updateAlbum(album.id, { dnaPresets: album.dnaPresets?.filter((_, idx) => idx !== i) }); toast({ title: "DNA Strain Erased" }); }}><Trash2 className="h-3 w-3" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); setHubDirection(p.mapping); toast({ title: "Full DNA Profile Loaded" }); }}><RefreshCw className="h-3 w-3" /></Button>
                                                                {expandedVaultIdx === i ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                              </div>
                                                          </div>
                                                          {expandedVaultIdx === i && (
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
                                                                                className="h-6 w-6 text-primary hover:bg-primary/20" 
                                                                                onClick={() => { setHubDirection(prev => ({ ...prev, [field.k]: field.v })); toast({ title: `${field.l} Part Injected` }); }}
                                                                                disabled={!field.v}
                                                                              >
                                                                                  <Zap className="h-3.5 w-3.5" />
                                                                              </Button>
                                                                          </div>
                                                                          <p className="text-[10px] text-foreground leading-relaxed font-code whitespace-pre-wrap break-words italic opacity-90 pr-2">
                                                                              {field.v ? `"${field.v}"` : "N/A"}
                                                                          </p>
                                                                      </div>
                                                                  ))}
                                                              </div>
                                                          )}
                                                      </Card>
                                                  )) : <p className="text-center text-[9px] uppercase opacity-40 py-10">Vault is empty.</p>}
                                              </div>
                                          )}
                                      </ScrollArea>
                                  </Card>
                              </div>

                              {wizardState.selectedDirections.length > 0 && (
                                  <div className="space-y-4">
                                      <div className="flex items-center gap-2 text-primary">
                                          <GitBranch className="h-5 w-5" />
                                          <h3 className="font-headline font-bold text-xl uppercase">Remix Directions</h3>
                                      </div>
                                      <Card className="bg-primary/5 border-primary/20 p-4 rounded-xl space-y-3">
                                          <div className="flex flex-wrap gap-2">
                                              {wizardState.selectedDirections.map(d => (
                                                  <Badge key={d.name} variant="outline" className="text-[9px] uppercase border-primary/30 text-primary py-1 px-2">{d.name}</Badge>
                                              ))}
                                          </div>
                                          <p className="text-[9px] text-muted-foreground italic leading-relaxed">Active pivots selected during path selection step.</p>
                                      </Card>
                                  </div>
                              )}

                              <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-fuchsia-500">
                                          <Fingerprint className="h-5 w-5" />
                                          <h3 className="font-headline font-bold text-xl uppercase">Style DNA</h3>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Switch checked={hubStyleEnabled} onCheckedChange={setHubStyleEnabled} />
                                        <Tabs value={styleTab} onValueChange={(v:any) => setStyleTab(v)} className="w-fit">
                                          <TabsList className="h-8 bg-white/5 border-white/10 p-0.5">
                                              <TabsTrigger value="current" className="text-[8px] px-3 font-bold">LATEST</TabsTrigger>
                                              <TabsTrigger value="vault" className="text-[8px] px-3 font-bold">VAULT</TabsTrigger>
                                          </TabsList>
                                        </Tabs>
                                      </div>
                                  </div>
                                  <Card className={cn("bg-fuchsia-500/5 border-fuchsia-500/20 p-4 rounded-xl shadow-inner min-h-[160px] transition-opacity", !hubStyleEnabled && "opacity-50 pointer-events-none")}>
                                      <ScrollArea className="h-[160px] pr-2">
                                          {styleTab === 'current' ? (
                                              <div className="space-y-4">
                                                  <div className="p-3 bg-background/40 border border-fuchsia-500/10 rounded-lg space-y-3">
                                                      <div className="flex justify-between items-center text-[8px] font-bold uppercase text-fuchsia-700">
                                                          <span>Active Profiling</span>
                                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSaveStyleNamingOpen(true)}><Save className="h-3 w-3" /></Button>
                                                      </div>
                                                      <div className="space-y-1">
                                                          <div className="flex justify-between text-[8px] font-bold uppercase"><span>Vocab</span><span>{hubStyleMetrics.vocabularyScore}%</span></div>
                                                          <Progress value={hubStyleMetrics.vocabularyScore} className="h-1 bg-fuchsia-500/10" />
                                                      </div>
                                                      <div className="space-y-1">
                                                          <div className="flex justify-between text-[8px] font-bold uppercase"><span>Complexity</span><span>{hubStyleMetrics.rhymeComplexity}%</span></div>
                                                          <Progress value={hubStyleMetrics.rhymeComplexity} className="h-1 bg-fuchsia-500/10" />
                                                      </div>
                                                      <p className="text-[9px] text-muted-foreground italic leading-relaxed">"{hubStyleAnalysis}"</p>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="space-y-3">
                                                  {album?.stylePresets && album.stylePresets.length > 0 ? album.stylePresets.map((s, i) => (
                                                      <Card key={i} className="bg-background/40 border-white/5 p-3 flex items-center justify-between shadow-lg">
                                                          <div className="min-w-0">
                                                              <p className="text-[10px] font-bold text-fuchsia-400 truncate uppercase">{s.name}</p>
                                                              <p className="text-[7px] text-muted-foreground uppercase">{s.metrics.cadenceMap}</p>
                                                          </div>
                                                          <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={() => { updateAlbum(album.id, { stylePresets: album.stylePresets?.filter((_, idx) => idx !== i) }); toast({ title: "Style DNA Erased" }); }}><Trash2 className="h-3 w-3" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-fuchsia-400" onClick={() => { setHubStyleAnalysis(s.analysis); setHubStyleMetrics(s.metrics); }}><RefreshCw className="h-3 w-3" /></Button>
                                                          </div>
                                                      </Card>
                                                  )) : <p className="text-center text-[9px] uppercase opacity-40 py-10">No Style Strains saved.</p>}
                                              </div>
                                          )}
                                      </ScrollArea>
                                  </Card>
                              </div>

                              <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-rose-500">
                                          <Shield className="h-5 w-5" />
                                          <h3 className="font-headline font-bold text-xl uppercase">Guardrails</h3>
                                  </div>
                                  <Switch checked={enableGuardrails} onCheckedChange={enableGuardrails => setEnableGuardrails(enableGuardrails)} />
                                  </div>
                                  <Card className={cn("bg-rose-500/5 border-rose-500/20 p-4 rounded-xl space-y-4 transition-opacity", !enableGuardrails && "opacity-50 pointer-events-none")}>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-bold uppercase text-rose-800">Negative Prompt</Label>
                                        <Input 
                                          placeholder="e.g. Avoid violence, generic love cliches..." 
                                          value={negativePrompt} 
                                          onChange={(e) => setNegativePrompt(e.target.value)} 
                                          className="h-8 text-[10px] bg-background/50 border-rose-500/10" 
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-bold uppercase text-rose-800">Forbidden</Label>
                                        <Input 
                                          placeholder="e.g. list, words, to, avoid, separated, by, commas" 
                                          value={forbiddenWords} 
                                          onChange={(e) => setForbiddenWords(e.target.value)} 
                                          className="h-8 text-[10px] bg-background/50 border-rose-500/10" 
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[9px] font-bold uppercase text-rose-800">Must Include</Label>
                                        <Input 
                                          placeholder="e.g. exact phrase to weave in" 
                                          value={mustIncludeWords} 
                                          onChange={(e) => setMustIncludeWords(e.target.value)} 
                                          className="h-8 text-[10px] bg-background/50 border-rose-500/10" 
                                        />
                                      </div>
                                  </Card>
                              </div>
                          </div>
                      </div>
                  </div>
              </ScrollArea>
          )}

          {step === 1 && (
            <div className="flex flex-col h-full p-8 gap-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-headline font-bold uppercase flex items-center gap-2 text-primary"><NotebookPen className="h-6 w-6"/> Seed DNA & REMIX</h3>
                    <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-lg border border-primary/20">
                        <Label htmlFor="sync-lyrics" className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Sync Current Lyrics</Label>
                        <Switch id="sync-lyrics" checked={syncLyricsToggle} onCheckedChange={setSyncLyricsToggle} />
                    </div>
                </div>
                <Textarea 
                    placeholder="Paste lyrics or rough notes to extract analytical strains..." 
                    className="flex-grow font-code text-lg bg-background/50 border-2 p-6" 
                    value={wizardState.lyrics} 
                    onChange={(e) => {
                        setSyncLyricsToggle(false);
                        setWizardState(prev => ({ ...prev, lyrics: e.target.value }));
                    }} 
                />
                <div className="flex items-center gap-3 p-4 bg-muted/20 border-t rounded-lg">
                    <Checkbox id="rc" checked={permissionChecked} onCheckedChange={(c) => setPermissionChecked(!!c)} />
                    <Label htmlFor="rc" className="text-[10px] font-bold uppercase tracking-widest cursor-pointer text-foreground/70">I have clearance to utilize these lyrical assets.</Label>
                </div>
            </div>
          )}

          {step === 2 && wizardState.analysis && (
            <ScrollArea className="flex-grow p-8 studio-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 text-foreground pb-12">
                    <div className="flex justify-between items-center bg-primary/10 p-4 rounded-xl border border-primary/20">
                        <div className="flex items-center gap-3 text-primary">
                            <Sparkles className="h-5 w-5" />
                            <p className="text-xs font-bold uppercase tracking-widest">Neural Extraction Complete. Archive profile to reuse strains.</p>
                        </div>
                        {isPro ? (
                          <Button variant="default" size="sm" className="font-bold uppercase text-[10px] h-9 px-6 shadow-lg gap-2" onClick={() => setSaveNamingOpen(true)}>
                            <Save className="h-4 w-4" /> Save DNA Profile
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[8px] uppercase border-primary/30 text-primary">Pro required to archive custom DNA</Badge>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {renderAnalysisField('Themes', wizardState.analysis.themes, Link2, 'setting_world')}
                        {renderAnalysisField('Emotion', `${wizardState.analysis.emotionalTone.primaryEmotion} / ${wizardState.analysis.emotionalTone.secondaryEmotion}`, Compass, 'emotion_core')}
                        {renderAnalysisField('Shift', wizardState.analysis.emotionalShift, ArrowRightLeft, 'trigger_moment')}
                        {renderAnalysisField('Arc', wizardState.analysis.narrativeArc, GitBranch, 'message_truth')}
                        {renderAnalysisField('POV', wizardState.analysis.pov, UserCircle, 'setting_world')}
                        {renderAnalysisField('Tense', wizardState.analysis.tense, TimerReset, 'trigger_moment')}
                        {renderAnalysisField('Structure', wizardState.analysis.structure, LayoutTemplate, 'message_truth')}
                        {renderAnalysisField('Technical Fingerprint', wizardState.analysis.voiceStyle, Fingerprint, 'tone_palette')}
                        {renderAnalysisField('Motifs', wizardState.analysis.motifs, Target, 'setting_world')}
                    </div>
                </div>
            </ScrollArea>
          )}

          {step === 3 && (
            <div className="flex flex-col h-full p-6 gap-6 animate-in fade-in slide-in-from-bottom-8">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-headline font-bold text-primary uppercase">Choose Path</h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em]">Optional — select remix paths or skip straight to calibration.</p>
                    <button
                      onClick={(e) => handleRelayAnalyze(wizardState.lyrics, e)}
                      disabled={isGenerating}
                      className="text-[9px] font-bold uppercase tracking-widest text-primary/50 hover:text-primary border border-primary/10 hover:border-primary/40 rounded-full px-4 py-1.5 transition-all mt-1"
                    >
                      ↻ Re-Matrix Ideas
                    </button>
                </div>
                <ScrollArea className="flex-grow border border-white/5 rounded-xl bg-muted/5 studio-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
                        {(wizardState.directions || []).map((dir, idx) => {
                            const isSelected = wizardState.selectedDirections.some(d => d.name === dir.name);
                            return (
                                <Card 
                                    key={idx} 
                                    className={cn(
                                        "p-8 border-2 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between min-h-72 h-auto shadow-xl overflow-visible", 
                                        isSelected ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "border-border/50 bg-card hover:bg-white/5"
                                    )} 
                                    onClick={() => setWizardState(prev => {
                                        const active = prev.selectedDirections.some(d => d.name === dir.name);
                                        return { ...prev, selectedDirections: active ? prev.selectedDirections.filter(d => d.name !== dir.name) : [...prev.selectedDirections, dir] };
                                    })}
                                >
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold uppercase text-primary tracking-[0.2em]">{dir.name}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed font-code">{dir.description}</p>
                                    </div>
                                    {isSelected && <div className="flex justify-end pt-2"><CheckCircle2 className="h-6 w-6 text-primary" /></div>}
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
          )}

          {step === 5 && wizardState.generatedVariant && (
              <div className="flex-1 min-0 flex flex-row items-stretch overflow-hidden animate-in fade-in slide-in-from-bottom-8 bg-[#050505] relative">
                  <div className="relative flex-grow min-0 py-6 px-4">
                      <Card className="w-full h-full border-2 shadow-2xl relative overflow-hidden bg-notebook-hub">
                        <style>{`
                            .bg-notebook-hub {
                                background-image: 
                                    linear-gradient(90deg, transparent 100px, rgba(255, 0, 0, 0.2) 100px, rgba(255, 0, 0, 0.2) 101px, transparent 101px),
                                    repeating-linear-gradient(transparent, transparent 31px, rgba(255, 255, 255, 0.05) 31px, rgba(255, 255, 255, 0.05) 32px);
                                background-size: 100% 32px;
                                background-color: #0c0c0c;
                                background-attachment: local;
                            }
                        `}</style>
                        <ScrollArea className="h-full studio-scrollbar">
                            <div className="p-12 space-y-12 pb-32">
                                {wizardState.generatedVariant.sections.map((s, idx) => (
                                    <div key={idx} className="relative">
                                        <div style={{ height: '96px' }} className="flex items-end pb-2 pl-[120px]">
                                            <h4 className="text-xl md:text-2xl font-headline font-bold text-sky-400 uppercase leading-none">[{s.name}]</h4>
                                        </div>
                                        <div className="space-y-0">
                                            {s.bars.map((line, lIdx) => (
                                                <div key={lIdx} className="relative group flex items-start h-auto" style={{ minHeight: '32px' }}>
                                                    <span className="absolute left-[50px] font-mono text-muted-foreground/20 w-10 text-right font-bold text-[10px] leading-[32px]">{String(lIdx + 1).padStart(2, '0')}</span>
                                                    <div className="flex-grow flex items-start min-w-0 h-full relative overflow-hidden">
                                                        <p className="font-code font-bold text-[24px] leading-[32px] tracking-tight text-white/90 whitespace-pre-wrap break-words w-full pl-[145px] -indent-[25px]">
                                                            <HighlightedText text={line} rhymeGroups={previewRhymeGroups} />
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                      </Card>
                  </div>
                  <div className="w-[340px] shrink-0 p-6 space-y-6 bg-card border-l overflow-y-auto studio-scrollbar">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Context Summary</h4>
                        <p className="text-[9px] text-muted-foreground font-code uppercase">Settings used for this synthesis.</p>
                      </div>
                      
                      <div className="space-y-4 border-t border-white/5 pt-4">
                          {/* Receipt: Vibe */}
                          {hubVibeEnabled && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><Palette className="h-3 w-3" /> Vibe Context</p>
                                  <p className="text-[12px] text-white/70 font-code truncate">{hubVibe.genre} @ {hubVibe.tempoBPM} BPM</p>
                                  {hubVibe.instrumentation && <p className="text-[11px] text-white/40 italic line-clamp-2 leading-tight">"{hubVibe.instrumentation}"</p>}
                              </div>
                          )}

                          {/* Receipt: DNA */}
                          {(inheritAlbum || inheritTrack) && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                                  <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1.5"><Compass className="h-3 w-3" /> Creative DNA</p>
                                  <div className="space-y-1 mt-1">
                                      {hubDirection.setting_world && <p className="text-[11px] text-white/50 leading-tight">• Setting: {hubDirection.setting_world}</p>}
                                      {hubDirection.emotion_core && <p className="text-[11px] text-white/50 leading-tight">• Core: {hubDirection.emotion_core}</p>}
                                      {hubDirection.message_truth && <p className="text-[11px] text-white/50 leading-tight">• Truth: {hubDirection.message_truth}</p>}
                                  </div>
                              </div>
                          )}

                          {/* Receipt: Remix Paths */}
                          {wizardState.selectedDirections.length > 0 && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5"><GitBranch className="h-3 w-3" /> Selected Paths</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                      {wizardState.selectedDirections.map(d => <Badge key={d.name} variant="outline" className="text-[8px] h-4 border-primary/30 text-primary truncate max-w-[90px]">{d.name}</Badge>)}
                                  </div>
                              </div>
                          )}

                          {/* Receipt: Style */}
                          {hubStyleEnabled && hubStyleAnalysis && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/10">
                                  <p className="text-[9px] font-bold text-fuchsia-500 uppercase tracking-widest flex items-center gap-1.5"><Fingerprint className="h-3 w-3" /> Artist Profile</p>
                                  <div className="flex justify-between text-[9px] font-bold uppercase text-fuchsia-300/40 mb-1">
                                      <span>Vocab: {hubStyleMetrics.vocabularyScore}%</span>
                                      <span>Rhyme: {hubStyleMetrics.rhymeComplexity}%</span>
                                  </div>
                                  <p className="text-[11px] text-fuchsia-300/60 italic leading-snug line-clamp-3">"{hubStyleAnalysis}"</p>
                              </div>
                          )}

                          {/* Receipt: Guardrails */}
                          {enableGuardrails && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                  <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5"><Shield className="h-3 w-3" /> Guardrails Active</p>
                                  <div className="space-y-1 mt-1">
                                      {negativePrompt && <div className="flex flex-col gap-0.5"><span className="text-[9px] font-bold text-rose-800 uppercase">NEGATIVE</span><p className="text-[11px] text-white/40 line-clamp-1">{negativePrompt}</p></div>}
                                      {forbiddenWords && <div className="flex flex-col gap-0.5"><span className="text-[9px] font-bold text-rose-800 uppercase">FORBIDDEN</span><p className="text-[11px] text-white/40 line-clamp-1">{forbiddenWords}</p></div>}
                                  </div>
                              </div>
                          )}

                          {/* Receipt: Intents */}
                          {intentsEnabled && hubIntents.length > 0 && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-sky-500/5 border border-sky-500/10">
                                  <p className="text-[9px] font-bold text-sky-500 uppercase tracking-widest flex items-center gap-1.5"><Target className="h-3 w-3" /> Woven Intents</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                      {hubIntents.map(i => <Badge key={i} variant="outline" className="text-[8px] h-4 border-sky-500/30 text-sky-400 truncate max-w-[90px]">{i}</Badge>)}
                                  </div>
                              </div>
                          )}
                          
                          {/* Receipt: Special Instructions */}
                          {lyricsAbout.trim() && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5"><MessageSquareQuote className="h-3 w-3" /> Instructions</p>
                                  <p className="text-[11px] text-white/50 italic leading-tight line-clamp-3">"{lyricsAbout}"</p>
                              </div>
                          )}
                      </div>

                      <div className="pt-6 border-t border-white/5 space-y-4">
                        <Card className="border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                            <CardTitle className="text-[10px] font-bold uppercase text-rose-500 flex items-center gap-2"><RefreshCw className="h-3 w-3" /> Neural Refinement</CardTitle>
                            <div className="space-y-1.5">
                                <Label className="text-[8px] font-bold uppercase text-rose-800">Exclude Words</Label>
                                <Input placeholder="e.g. fire, baby..." value={wizardState.excludedWords} onChange={(e) => setWizardState(prev => ({ ...prev, excludedWords: e.target.value }))} className="h-8 text-[10px] bg-background/50 border-rose-500/10" />
                            </div>
                            <Button variant="outline" size="sm" className="w-full h-8 text-[9px] font-bold uppercase border-rose-500/20 text-rose-500" onClick={(e) => wizardState.analysis ? handleRelayDraftSynthesis(e) : handleFullDraftGenerate(e)}>Regenerate Draft</Button>
                        </Card>
                      </div>
                  </div>
              </div>
          )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col p-4 border-t border-white/5 bg-[#050505] gap-3 relative z-[60]">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  {(step === 1 || step === 10) && (
                    <div className="flex items-center gap-2.5 bg-primary/10 px-6 py-1.5 rounded-full border border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Droplets className={cn("h-4 w-4 text-primary", isGenerating && "animate-pulse")} />
                        <span className="text-sm font-bold uppercase font-code text-primary tracking-tight">COST: {Math.round(step === 1 ? getEffectiveCost('analyzeRelayAssets') : activeDraftCharged)} INK</span>
                    </div>
                  )}
                  {step === 10 && (
                      <div className="flex flex-wrap gap-1.5 max-w-2xl overflow-hidden ml-4">
                          {activeBadges.map((b, i) => <Badge key={i} variant="outline" className={cn("text-[8px] font-bold uppercase py-0.5 px-2 bg-background/40", b.color, b.text === 'VIBE' && "animate-pulse")}>{b.text}</Badge>)}
                      </div>
                  )}
              </div>
              <div className="flex gap-4 justify-end">
                  {step === 1 && <Button className="w-auto min-w-[300px] px-12 h-14 font-bold text-xl rounded-full shadow-lg" disabled={!wizardState.lyrics.trim() || !permissionChecked || isGenerating} onClick={(e) => handleRelayAnalyze(wizardState.lyrics, e)} title={tooltip('analyzeRelayAssets')}>{buttonLabel('analyzeRelayAssets')}</Button>}
                  {step === 2 && <Button size="lg" className="w-auto min-w-[300px] px-12 h-14 font-bold text-xl rounded-full shadow-lg" onClick={() => setStep(3)}>Define Paths <ChevronRight className="ml-2 h-6 w-6" /></Button>}
                  {step === 3 && (
                    <Button size="lg" className="w-auto min-w-[300px] px-12 h-14 text-xl font-bold rounded-full shadow-lg bg-primary text-white" onClick={() => setStep(10)}>
                      Review & Calibrate <ChevronRight className="ml-2 h-6 w-6" />
                    </Button>
                  )}
                  {step === 10 && (
                      <Button onClick={(e) => wizardState.analysis ? handleRelayDraftSynthesis(e) : handleFullDraftGenerate(e)} disabled={isGenerating} size="lg" className="w-auto min-w-[380px] px-14 h-16 text-2xl font-bold rounded-xl bg-primary text-white gap-4 shadow-[0_0_40px_rgba(59,130,246,0.3)]" title={wizardState.analysis ? tooltip('generateRelayDraft', activeDraftBase) : tooltip('generateDraftPerBar', activeDraftBase)}>
                          <Wand2 className="h-7 w-7" /> 
                          {wizardState.analysis ? `Synthesize DNA Remix (${activeDraftCharged} Ink)` : `Generate Studio Draft (${activeDraftCharged} Ink)`}
                      </Button>
                  )}
                  {step === 5 && (
                      <div className="flex w-full gap-4 max-w-lg">
                          <Button variant="outline" size="lg" className="flex-1 h-14 text-lg font-bold rounded-full" onClick={() => setStep(10)}><RefreshCw className="mr-2 h-6 w-6" /> Re-Calibrate</Button>
                          <Button size="lg" className="flex-1 h-14 text-lg font-bold rounded-full bg-primary text-white shadow-lg" onClick={handleApplyGeneratedDraft}><CheckCircle2 className="mr-2 h-6 w-6" /> Add to Sheet</Button>
                      </div>
                  )}
              </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ArchivalNamingDialog 
        open={saveNamingOpen} 
        onOpenChange={setSaveNamingOpen} 
        onConfirm={(name: string) => handleConfirmSaveDNA(name)} 
        type="DNA" 
    />
    <ArchivalNamingDialog 
        open={saveStyleNamingOpen} 
        onOpenChange={setSaveStyleNamingOpen} 
        onConfirm={(name: string) => handleConfirmSaveStyle(name)} 
        type="Style" 
    />
    </>
  );
}

function ArchivalNamingDialog({ open, onOpenChange, onConfirm, type }: any) {
  const [name, setName] = useState('');
  useEffect(() => { if (open) setName(''); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2 z-[3000]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Save className="text-primary" /> Archive {type} Profile
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">Enter a unique name for this {type.toLowerCase()} strain to save it to your vault.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. My ${type} Strain`} className="bg-background/50 font-bold" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onConfirm(name.trim()); }} disabled={!name.trim()} className="px-8 font-bold">Confirm Archive</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
