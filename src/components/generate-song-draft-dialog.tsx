'use client';

/**
 * @fileOverview MASTER LOCKDOWN (5/24/2026) - Generation Workstation Calibration Hub.
 * 
 * - Workflow: Seed DNA -> High-Fidelity Extraction -> Calibration Hub -> Synthesis.
 * - FIX (5/24): Added missing motion import to resolve ReferenceError.
 * - FIX (5/24): Resolved Structure header overlap by enforcing shrink-0 and gap protocols.
 */

import React, { useState, useContext, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Track, Album, StyleProfile, WizardState, Direction, TrackSection, Bar, WizardAnalysis, StyleAnalysis, DnaPreset } from '@/lib/types';
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
    Waves,
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
    ListMusic,
    Replace,
    Lock,
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
import { mergeDirection, cn, stripForFirestore, resolveWorkstationDirection, hasDirectionContent } from '@/lib/utils';
import {
  STRAIN_TARGETS,
  appendDirectionField,
  buildDirectionMappingFromAnalysis,
  buildDnaPresetPayload,
  CREATIVE_DNA_FIELDS,
  normalizeWizardAnalysis,
  DEFAULT_STYLE_METRICS,
  rebalanceRemixWeights,
  formatRemixDirectionsWithWeights,
  getStrainInjectTooltip,
  getStrainDestinationTheme,
  getVaultFieldInjectTooltip,
  DNA_HUB_TOOLTIPS,
  type StrainInjectionTarget,
} from '@/lib/dna-strands';
import { DataContext } from '@/context/data-context';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { useUsage } from '@/context/usage-context';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { useTouchInkRunner } from '@/hooks/use-touch-ink-runner';
import { withAiAuth } from '@/lib/ai-client';
import { Textarea } from './ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useUIState } from '@/hooks/use-ui-state';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { useAuth } from '@/hooks/use-auth';
import { isProOrTrial } from '@/lib/subscription';
import { isLooseTrackAlbum } from '@/lib/co-writer-rules';
import { LockedSaveButton, ProLockBadge, proLockIcon, proLockShell, proLockText } from '@/components/pro-lock';
import { UpgradeTooltip } from '@/components/upgrade-tooltip';
import { linesToRhymeBars } from '@/lib/lyrics-units';
import { SYSTEM_DNA_PRESETS, SYSTEM_STYLE_PRESETS, SYSTEM_VIBE_PRESETS } from '@/lib/system-presets';
import { DNASynthesisLoader, getDnaLoaderStatusText, type SynthesisLoaderMode } from '@/components/dna-synthesis-loader';
import { GenerationSyncAmbient, type SyncAttractor } from '@/components/generation-sync-ambient';
import { DnaSeedExtractPanel } from '@/components/dna-seed-extract-panel';
import { WorkstationStepBackground, stepToWorkstationVariant } from '@/components/workstation-step-background';
import { HubCalibrationAmbient, HUB_INK_KEYS, type HubInkKey } from '@/components/hub-calibration-ambient';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArchivalNamingDialog } from '@/components/archival-naming-dialog';
import { DnaVaultPresetDetails } from '@/components/dna-vault-preset-details';
import { HighlightedText } from './highlighted-text';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  buildApprovalDraftSnapshot,
  buildPersistedApprovalBacklog,
  collectUnusedApprovalSnapshots,
  MAX_APPROVAL_DRAFT_HISTORY,
  variantsMatch,
  type ApprovalDraftSnapshot,
} from '@/lib/approval-draft-history';
import { withAsyncTimeout } from '@/lib/async-timeout';
import type { WizardGeneratedVariant } from '@/lib/types';

const SYNTHESIS_TIMEOUT_MS = 180_000;
const EXTRACT_TIMEOUT_MS = 120_000;
const RHYME_PREVIEW_TIMEOUT_MS = 25_000;

interface GenerateSongDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track;
  styleProfile: StyleProfile;
  onDraftGenerated: (sections: any[]) => void;
  /** Auto-stash unused DNA/REMIX approval drafts into Draft Chest. */
  onStashApprovalDraftsToChest?: (
    snapshots: ApprovalDraftSnapshot[],
    options?: { silent?: boolean }
  ) => void;
  /** True when dialog is closed but a soft-close session or in-flight generation is still active. */
  onBackgroundSessionActiveChange?: (active: boolean) => void;
}

const DEFAULT_STRUCTURE_PRESET = {
  id: 'default',
  name: 'Default',
  desc: 'Standard song structure (Intro, 2 Verses, 2 Hooks).',
  sections: [
    { name: 'Intro', bars: 4, enabled: true },
    { name: 'Verse', bars: 16, enabled: true },
    { name: 'Hook', bars: 8, enabled: true },
    { name: 'Verse', bars: 16, enabled: true },
    { name: 'Hook', bars: 8, enabled: true },
  ],
} as const;

/** New tracks ship with a single empty Verse line — treat as blank canvas for Hub structure. */
function isFactoryPlaceholderStructure(sections: Track['sections'] | undefined): boolean {
  if (!sections?.length) return true;
  if (sections.length !== 1) return false;
  const section = sections[0];
  if ((section.type || '').toLowerCase() !== 'verse') return false;
  if (section.bars.length !== 1) return false;
  return !section.bars[0]?.text?.trim();
}

const STRUCTURE_PRESETS = [
    { ...DEFAULT_STRUCTURE_PRESET, sections: DEFAULT_STRUCTURE_PRESET.sections.map((s) => ({ ...s })) },
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

type HubSectionKey =
  | 'structure'
  | 'vibe'
  | 'intents'
  | 'creativeDna'
  | 'specialInstructions'
  | 'remix'
  | 'dnaStrains'
  | 'style'
  | 'guardrails';

/** Expand every Calibration Hub panel when a full DNA profile is loaded. */
const CALIBRATION_HUB_SECTION_KEYS: HubSectionKey[] = [
  'structure',
  'vibe',
  'intents',
  'creativeDna',
  'specialInstructions',
  'remix',
  'dnaStrains',
  'style',
  'guardrails',
];

const DEFAULT_HUB_COLLAPSED: Record<HubSectionKey, boolean> = {
  structure: false,
  vibe: true,
  intents: true,
  creativeDna: true,
  specialInstructions: true,
  remix: true,
  dnaStrains: true,
  style: true,
  guardrails: true,
};

/** Max visible height for Creative DNA fields before scrolling (~11 lines at 11px). */
const CREATIVE_DNA_FIELD_MAX_HEIGHT_PX = 176;

function HubCreativeDnaTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasContent = value.trim().length > 0;

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el || !hasContent) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    if (scrollH <= CREATIVE_DNA_FIELD_MAX_HEIGHT_PX) {
      el.style.height = `${scrollH}px`;
      el.style.overflowY = 'hidden';
    } else {
      el.style.height = `${CREATIVE_DNA_FIELD_MAX_HEIGHT_PX}px`;
      el.style.overflowY = 'auto';
    }
  }, [hasContent]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!hasContent) {
      el.style.height = '';
      el.style.overflowY = '';
      return;
    }
    syncHeight();
  }, [value, hasContent, syncHeight]);

  return (
    <Textarea
      ref={ref}
      placeholder={placeholder}
      rows={hasContent ? undefined : 2}
      className={cn(
        'bg-background/40 border-green-500/10 w-full text-[11px] font-code resize-none leading-relaxed px-3 py-2',
        hasContent ? 'min-h-[3rem]' : 'min-h-[3rem] h-12'
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={syncHeight}
    />
  );
}

function HubSectionShell({
  title,
  icon: Icon,
  colorClass,
  collapsed,
  onToggle,
  trailing,
  summary,
  headerTooltip = DNA_HUB_TOOLTIPS.sectionCollapse,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  collapsed: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
  summary?: string;
  headerTooltip?: string;
  children: React.ReactNode;
}) {
  const headerButton = (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 min-w-0 flex-1 text-left group"
      aria-expanded={!collapsed}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
      ) : (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
      )}
      <span className={cn('flex items-center gap-2 min-w-0', colorClass)}>
        <Icon className="h-5 w-5 shrink-0" />
        <span className="font-headline font-bold text-sm sm:text-lg uppercase leading-tight break-words sm:truncate">{title}</span>
      </span>
      {collapsed && summary && (
        <span className="text-[9px] text-muted-foreground truncate italic hidden md:inline">{summary}</span>
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between gap-2 w-full min-w-0">
        {headerTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{headerButton}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-[10px] leading-snug">
              {headerTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          headerButton
        )}
        {trailing && (
          <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 max-w-full" onClick={(e) => e.stopPropagation()}>
            {trailing}
          </div>
        )}
      </div>
      {!collapsed && children}
    </div>
  );
}

export function GenerateSongDraftDialog({
  open,
  onOpenChange,
  track,
  styleProfile,
  onDraftGenerated,
  onStashApprovalDraftsToChest,
  onBackgroundSessionActiveChange,
}: GenerateSongDraftDialogProps) {
  const { user } = useAuth();
  const isPro = isProOrTrial(user);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingOperation, setGeneratingOperation] = useState<'extract' | 'draft' | 'remix'>('draft');
  const syncSurfaceRef = useRef<HTMLDivElement>(null);
  const logoAnchorRef = useRef<HTMLDivElement>(null);
  const [syncAttractor, setSyncAttractor] = useState<SyncAttractor | null>(null);
  const { setGenerating } = useUIState();
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<number>(0);
  const [remixSeedBackConfirmOpen, setRemixSeedBackConfirmOpen] = useState(false);
  const [approvalDraftHistory, setApprovalDraftHistory] = useState<ApprovalDraftSnapshot[]>([]);
  const { getAlbumById, updateTrack, updateAlbum } = useContext(DataContext);
  const album = getAlbumById(track.albumId);
  const isLooseTrack = isLooseTrackAlbum(album);

  const [hubStructure, setHubSections] = useState<{name: string, bars: number, enabled: boolean}[]>(
    () => DEFAULT_STRUCTURE_PRESET.sections.map((s) => ({ ...s }))
  );
  const [structurePresetId, setStructurePresetId] = useState('default');
  const [hubStructureGuide, setHubStructureGuide] = useState('');
  const [lyricsAbout, setLyricsAbout] = useState('');
  const [maxLineLen, setMaxLineLen] = useState(120);
  const [hubCollapsed, setHubCollapsed] = useState<Record<HubSectionKey, boolean>>(DEFAULT_HUB_COLLAPSED);
  const [hubSeededSections, setHubSeededSections] = useState<Set<HubSectionKey>>(() => new Set());
  const [hubFlashKey, setHubFlashKey] = useState<HubInkKey | null>(null);
  const hubLayoutInitializedRef = useRef(false);
  const hubFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHubActiveRef = useRef<Record<HubInkKey, boolean> | null>(null);
  
  const [hubDirection, setHubDirection] = useState<Partial<Direction>>({});
  const [hubVibe, setHubVibe] = useState<Track['vibe']>(track.vibe);
  const [hubVibeEnabled, setHubVibeEnabled] = useState(track.vibe?.enabled ?? true);
  
  const [inheritAlbum, setInheritAlbum] = useState(() => !isLooseTrackAlbum(getAlbumById(track.albumId)));
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
  const [strainTab, setStrainTab] = useState<'insights' | 'presets' | 'vault'>('presets');
  const [styleTab, setStyleTab] = useState<'current' | 'presets' | 'vault'>('current');
  const [saveNamingOpen, setSaveNamingOpen] = useState(false);
  const [saveStyleNamingOpen, setSaveStyleNamingOpen] = useState(false);
  const [expandedDnaPresetKey, setExpandedDnaPresetKey] = useState<string | null>(null);

  const lastTrackIdRef = useRef(track.id);
  const sessionReadyRef = useRef(false);
  const hardClosedRef = useRef(false);
  const pendingReopenOnCompleteRef = useRef(false);

  const { refundInk, addUsageLog } = useUsage();
  const { getCost, getEffectiveCost, tooltip, buttonLabel } = useInkCosts();
  const { runWithInk } = useTouchInkRunner();

  useEffect(() => {
    if (track.id !== lastTrackIdRef.current) {
      lastTrackIdRef.current = track.id;
      sessionReadyRef.current = false;
      hardClosedRef.current = true;
      pendingReopenOnCompleteRef.current = false;
    }
  }, [track.id]);

  const initializeSessionFromTrack = useCallback(() => {
    setStep(0);
    setProgress(0);
    setWizardState({
      lyrics: '',
      analysis: null,
      directions: null,
      selectedDirections: [],
      generatedVariant: null,
      excludedWords: '',
    });
    setLyricsAbout(track.specialInstructions || '');
    setHubStructureGuide('');
    setSyncLyricsToggle(false);
    setHubCollapsed({ ...DEFAULT_HUB_COLLAPSED, structure: false });
    setStructurePresetId('default');
    setHubSeededSections(new Set());
    hubLayoutInitializedRef.current = false;
    setHubDirection(track.direction || {});
    const loose = track.albumId === 'unassigned';
    setInheritAlbum(!loose && track.direction?.inheritFromAlbum !== false);
    setHubVibe(track.vibe);
    setHubVibeEnabled(track.vibe?.enabled ?? true);
    setHubIntents(track.checkedIntents || []);
    setIntentsEnabled(track.intentsEnabled ?? ((track.checkedIntents?.length ?? 0) > 0));
    setEnableGuardrails(track.guardrails?.enabled ?? true);
    setNegativePrompt(track.guardrails?.negativePrompt ?? '');
    setForbiddenWords((track.guardrails?.forbiddenWords || []).join(', '));
    setMustIncludeWords((track.guardrails?.mustIncludeWords || []).join(', '));
    setHubStyleEnabled(track.styleEnabled === true);
    setHubStyleAnalysis(styleProfile?.history[0]?.analysis || '');
    setHubStyleMetrics(styleProfile?.history[0]?.metrics || { vocabularyScore: 50, rhymeComplexity: 50, cadenceMap: 'Neutral' });
    setExpandedDnaPresetKey(null);
    setPreviewRhymeGroups([]);
    setNewHubIntent('');
    setApprovalDraftHistory([]);

    if (track.sections?.length > 0 && !isFactoryPlaceholderStructure(track.sections)) {
      setHubSections(
        track.sections.map((s) => ({
          name: s.type,
          bars: linesToRhymeBars(s.bars.length),
          enabled: true,
        }))
      );
      setStructurePresetId('custom');
    } else {
      setHubSections(DEFAULT_STRUCTURE_PRESET.sections.map((s) => ({ ...s })));
      setStructurePresetId('default');
    }
  }, [track, styleProfile]);

  useEffect(() => {
    if (!open) return;
    if (!sessionReadyRef.current || hardClosedRef.current) {
      initializeSessionFromTrack();
      sessionReadyRef.current = true;
      hardClosedRef.current = false;
      pendingReopenOnCompleteRef.current = false;
    }
  }, [open, initializeSessionFromTrack]);

  useEffect(() => {
    if (isLooseTrack) setInheritAlbum(false);
  }, [isLooseTrack]);

  useEffect(() => {
    if (!onBackgroundSessionActiveChange) return;
    if (open) {
      onBackgroundSessionActiveChange(false);
      return;
    }
    const hasBackgroundSession =
      sessionReadyRef.current &&
      !hardClosedRef.current &&
      (isGenerating || step > 0);
    onBackgroundSessionActiveChange(hasBackgroundSession);
  }, [open, isGenerating, step, onBackgroundSessionActiveChange]);

  const completeAndMaybeReopen = useCallback((targetStep: number) => {
    setStep(targetStep);
    if (pendingReopenOnCompleteRef.current) {
      pendingReopenOnCompleteRef.current = false;
      onOpenChange(true);
    }
  }, [onOpenChange]);

  const handleDialogOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    if (hardClosedRef.current) {
      sessionReadyRef.current = false;
      pendingReopenOnCompleteRef.current = false;
      hardClosedRef.current = false;
      onOpenChange(false);
      return;
    }

    if (isGenerating) {
      pendingReopenOnCompleteRef.current = true;
    }

    onOpenChange(false);
  }, [isGenerating, onOpenChange]);

  const buildApprovalSettingsSummary = useCallback((): string[] => {
    const tags: string[] = [];
    if (hubVibeEnabled) tags.push('Vibe');
    if (inheritAlbum) tags.push('Album DNA');
    if (inheritTrack) tags.push('Track DNA');
    if (wizardState.selectedDirections.length > 0) {
      tags.push(`${wizardState.selectedDirections.length} remix paths`);
    }
    if (hubStyleEnabled && hubStyleAnalysis.trim()) tags.push('Style DNA');
    if (enableGuardrails) tags.push('Guardrails');
    if (intentsEnabled && hubIntents.length > 0) tags.push(`${hubIntents.length} intents`);
    if (lyricsAbout.trim()) tags.push('Instructions');
    const struct = hubStructure.filter((s) => s.enabled).map((s) => s.name);
    if (struct.length > 0) tags.push(struct.join(' · '));
    return tags;
  }, [
    hubVibeEnabled,
    inheritAlbum,
    inheritTrack,
    wizardState.selectedDirections.length,
    hubStyleEnabled,
    hubStyleAnalysis,
    enableGuardrails,
    intentsEnabled,
    hubIntents.length,
    lyricsAbout,
    hubStructure,
  ]);

  const approvalDraftSource = wizardState.analysis ? 'remix' : 'full-draft';

  const buildCurrentApprovalSnapshot = useCallback((): ApprovalDraftSnapshot | null => {
    const variant = wizardState.generatedVariant;
    if (!variant) return null;
    return buildApprovalDraftSnapshot(
      variant,
      previewRhymeGroups,
      buildApprovalSettingsSummary(),
      approvalDraftSource
    );
  }, [
    wizardState.generatedVariant,
    previewRhymeGroups,
    buildApprovalSettingsSummary,
    approvalDraftSource,
  ]);

  const archiveCurrentApprovalDraft = useCallback(() => {
    const snapshot = buildCurrentApprovalSnapshot();
    if (!snapshot) return;
    setApprovalDraftHistory((prev) => {
      if (prev.some((h) => variantsMatch(h.variant, snapshot.variant))) return prev;
      return [snapshot, ...prev].slice(0, MAX_APPROVAL_DRAFT_HISTORY);
    });
  }, [buildCurrentApprovalSnapshot]);

  const flushUnusedApprovalDraftsToChest = useCallback(
    (usedVariant?: WizardGeneratedVariant | null) => {
      if (!onStashApprovalDraftsToChest) return;
      const currentSnapshot = buildCurrentApprovalSnapshot();
      const unused = collectUnusedApprovalSnapshots(
        approvalDraftHistory,
        currentSnapshot,
        usedVariant
      );
      if (!unused.length) return;
      onStashApprovalDraftsToChest(unused, { silent: !!usedVariant });
    },
    [
      onStashApprovalDraftsToChest,
      buildCurrentApprovalSnapshot,
      approvalDraftHistory,
    ]
  );

  const clearApprovalDraftSession = useCallback(() => {
    setApprovalDraftHistory([]);
    updateTrack(track.albumId, track.id, { approvalDraftBacklog: [] });
  }, [track.albumId, track.id, updateTrack]);

  const handleHardClose = useCallback(() => {
    if (step === 5 && wizardState.generatedVariant) {
      flushUnusedApprovalDraftsToChest(null);
    }
    hardClosedRef.current = true;
    pendingReopenOnCompleteRef.current = false;
    clearApprovalDraftSession();
    handleDialogOpenChange(false);
  }, [
    step,
    wizardState.generatedVariant,
    flushUnusedApprovalDraftsToChest,
    clearApprovalDraftSession,
    handleDialogOpenChange,
  ]);

  useEffect(() => {
    if (step !== 5 || !wizardState.generatedVariant) return;
    const backlog = buildPersistedApprovalBacklog(
      approvalDraftHistory,
      wizardState.generatedVariant,
      previewRhymeGroups,
      buildApprovalSettingsSummary(),
      approvalDraftSource
    );
    updateTrack(track.albumId, track.id, { approvalDraftBacklog: backlog });
  }, [
    step,
    approvalDraftHistory,
    wizardState.generatedVariant,
    previewRhymeGroups,
    buildApprovalSettingsSummary,
    approvalDraftSource,
    track.albumId,
    track.id,
    updateTrack,
  ]);

  const restoreApprovalDraft = useCallback(
    (snapshotId: string) => {
      const snap = approvalDraftHistory.find((h) => h.id === snapshotId);
      if (!snap) return;
      const current = wizardState.generatedVariant;
      if (current && variantsMatch(current, snap.variant)) return;
      if (current && !variantsMatch(current, snap.variant)) {
        archiveCurrentApprovalDraft();
      }
      setWizardState((prev) => ({ ...prev, generatedVariant: snap.variant }));
      setPreviewRhymeGroups(snap.rhymeGroups);
      toast({
        title: 'Draft restored',
        description: 'Previewing an earlier output from this remix session.',
      });
    },
    [
      approvalDraftHistory,
      wizardState.generatedVariant,
      archiveCurrentApprovalDraft,
      toast,
    ]
  );

  useEffect(() => {
    if (syncLyricsToggle && track.sections) {
        const allLyrics = track.sections.flatMap(s => s.bars.map(b => b.text)).join('\n');
        setWizardState(prev => ({ ...prev, lyrics: allLyrics }));
    }
  }, [syncLyricsToggle, track.sections]);

  const markHubSeeded = useCallback((key: HubSectionKey) => {
    setHubSeededSections((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setHubCollapsed((prev) => ({ ...prev, [key]: false }));
  }, []);

  const flashHubSection = useCallback((key: HubSectionKey) => {
    if (!HUB_INK_KEYS.includes(key as HubInkKey)) return;
    if (hubFlashTimeoutRef.current) clearTimeout(hubFlashTimeoutRef.current);
    setHubFlashKey(key as HubInkKey);
    hubFlashTimeoutRef.current = setTimeout(() => setHubFlashKey(null), 350);
  }, []);

  const expandHubSection = useCallback(
    (key: HubSectionKey) => {
      setHubCollapsed((prev) => {
        if (!prev[key]) return prev;
        flashHubSection(key);
        return { ...prev, [key]: false };
      });
    },
    [flashHubSection]
  );

  const toggleHubSection = useCallback(
    (key: HubSectionKey) => {
      setHubCollapsed((prev) => {
        const wasCollapsed = prev[key];
        const next = { ...prev, [key]: !prev[key] };
        if (wasCollapsed && !next[key]) flashHubSection(key);
        return next;
      });
    },
    [flashHubSection]
  );

  const handleStrainTabChange = useCallback(
    (v: 'insights' | 'presets' | 'vault') => {
      if (v === 'vault' && !isPro) {
        toast({
          title: 'Studio Pro Vault',
          description: 'Saving custom DNA profiles is Pro-only. Use Presets or Insights and tap ⚡ to inject strains.',
        });
        return;
      }
      setStrainTab(v);
      expandHubSection('dnaStrains');
    },
    [expandHubSection, isPro, toast]
  );

  const handleStyleTabChange = useCallback(
    (v: 'current' | 'presets' | 'vault') => {
      if (v === 'vault' && !isPro) {
        toast({
          title: 'Studio Pro Vault',
          description: 'Saving custom Style DNA is Pro-only. Use Presets or Latest for this draft.',
        });
        return;
      }
      setStyleTab(v);
      expandHubSection('style');
    },
    [expandHubSection, isPro, toast]
  );

  useEffect(() => {
    if (!isPro && strainTab === 'vault') setStrainTab('presets');
    if (!isPro && styleTab === 'vault') setStyleTab('presets');
  }, [isPro, strainTab, styleTab]);

  useEffect(() => {
    return () => {
      if (hubFlashTimeoutRef.current) clearTimeout(hubFlashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('workstation-modal-open');
    return () => document.body.classList.remove('workstation-modal-open');
  }, [open]);

  useEffect(() => {
    if (step !== 10) {
      hubLayoutInitializedRef.current = false;
      return;
    }
    if (hubLayoutInitializedRef.current) return;
    hubLayoutInitializedRef.current = true;

    const expanded = new Set(hubSeededSections);
    if (wizardState.selectedDirections.length > 0) expanded.add('remix');
    if (lyricsAbout.trim()) expanded.add('specialInstructions');

    setHubCollapsed({
      structure: false,
      vibe: false,
      intents: !expanded.has('intents'),
      creativeDna: !expanded.has('creativeDna'),
      specialInstructions: !expanded.has('specialInstructions'),
      remix: !expanded.has('remix'),
      dnaStrains: false,
      style: !expanded.has('style'),
      guardrails: !expanded.has('guardrails'),
    });
  }, [step, hubSeededSections, wizardState.selectedDirections.length, lyricsAbout]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    if (isGenerating) {
        setProgress(0);
        interval = setInterval(() => {
            setProgress((prev) => {
              if (prev >= 96) return Math.min(96, prev + 0.12);
              return prev + (100 - prev) * 0.08;
            });
        }, 300);
        stallTimer = setTimeout(() => {
          toast({
            title: 'Still working…',
            description:
              'Large drafts can take a few minutes. If this never finishes, check the network or pause ad blockers for firestore.googleapis.com.',
          });
        }, 45_000);
    } else {
        setProgress((p) => (p > 0 ? 100 : 0));
        const timer = setTimeout(() => setProgress(0), 1200);
        return () => {
            if (interval) clearInterval(interval);
            clearTimeout(timer);
            if (stallTimer) clearTimeout(stallTimer);
        };
    }
    return () => {
      if (interval) clearInterval(interval);
      if (stallTimer) clearTimeout(stallTimer);
    };
  }, [isGenerating, toast]);

  const loadPreviewRhymeGroups = useCallback(
    (variant: WizardGeneratedVariant) => {
      void (async () => {
        try {
          const allText = variant.sections.flatMap((s) => s.bars).join('\n');
          if (!allText.trim()) return;
          const rhymeRes = await withAsyncTimeout(
            findRhymes(await withAiAuth({ text: allText, userName: user?.displayName })),
            RHYME_PREVIEW_TIMEOUT_MS,
            'Rhyme preview'
          );
          setPreviewRhymeGroups(rhymeRes.rhymeGroups);
        } catch (err) {
          console.warn('Preview rhyme highlights skipped', err);
        }
      })();
    },
    [user?.displayName]
  );

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
      if (inheritAlbum) badges.push({ text: 'INHERIT ALBUM', color: 'border-teal-500 text-teal-400' });
      if (inheritTrack) badges.push({ text: 'TRACK DNA', color: 'border-green-500 text-green-400' });
      if (hubStyleEnabled && hubStyleAnalysis.trim()) badges.push({ text: 'STYLE DNA', color: 'border-fuchsia-500 text-fuchsia-500' });
      if (wizardState.selectedDirections.length > 0) badges.push({ text: `${wizardState.selectedDirections.length} REMIX PATHS`, color: 'border-primary text-primary' });
      return badges;
  }, [enableGuardrails, intentsEnabled, hubIntents, lyricsAbout, hubVibeEnabled, inheritAlbum, album, inheritTrack, hubStyleEnabled, wizardState.selectedDirections]);

  const buildDraftSections = () => {
    if (!wizardState.generatedVariant) return [];
    const g = wizardState.generatedVariant;
    return g.sections.map((s, i) => ({
        id: `draft-${Date.now()}-${i}`,
        type: s.name.toLowerCase() as any,
        bars: s.bars.map((l, j) => ({
            idx: j + 1,
            text: l.trim(),
            accepted: true,
            rhymeKey: '?',
            syllables: l.split(' ').length,
            justGenerated: true,
            lineSource: 'generated' as const,
        }))
    }));
  };

  const handleApplyGeneratedDraft = (mode: 'append' | 'replace') => {
    if (!wizardState.generatedVariant) return;
    const appliedVariant = wizardState.generatedVariant;
    flushUnusedApprovalDraftsToChest(appliedVariant);
    const newSections = buildDraftSections();
    const sections =
      mode === 'append'
        ? [...(track.sections ?? []), ...newSections]
        : newSections;
    onDraftGenerated(sections);
    toast({
      title: mode === 'append' ? 'Draft appended to sheet' : 'Sheet replaced with draft',
      description:
        mode === 'append'
          ? `${newSections.length} section(s) added to the bottom of your page.`
          : 'Previous lyrics on this track were replaced.',
    });
    hardClosedRef.current = true;
    clearApprovalDraftSession();
    handleDialogOpenChange(false);
  };

  const handleFullDraftGenerate = async (e: any) => {
    runWithInk('studio-draft', activeDraftCharged, 'generateDraftPerBar', e, async () => {
    setGeneratingOperation('draft');
    setIsGenerating(true);
    setGenerating(true, 'Synthesizing Studio Draft...');
    try {
      archiveCurrentApprovalDraft();
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

      const result = await withAsyncTimeout(
        generateSongDraft(
          await withAiAuth({
            userName: user?.displayName,
            albumDirection: album?.direction,
            trackDirection: { ...hubDirection, inheritFromAlbum: inheritAlbum },
            useAlbumDirection: inheritAlbum,
            useTrackDirection: inheritTrack,
            vibe: { ...hubVibe, enabled: hubVibeEnabled },
            intents: intentsEnabled ? hubIntents : [],
            styleProfile: { analysis: hubStyleEnabled ? hubStyleAnalysis : '' },
            sectionTemplate: hubStructure.filter((s) => s.enabled).map((s) => ({ name: s.name, bars: s.bars })),
            sectionsToGenerate: hubStructure.filter((s) => s.enabled).map((s) => s.name),
            rhymePreset: 'trap-soul',
            constraints: { maxLineLen },
            lyricsAbout: lyricsAbout,
            negativePrompt: enableGuardrails ? negativePrompt : undefined,
            forbiddenWords: enableGuardrails
              ? forbiddenWords.split(',').map((w) => w.trim()).filter(Boolean)
              : undefined,
            mustIncludeWords: enableGuardrails
              ? mustIncludeWords.split(',').map((w) => w.trim()).filter(Boolean)
              : undefined,
          })
        ),
        SYNTHESIS_TIMEOUT_MS,
        'Studio draft'
      );

      const previewVariant: WizardGeneratedVariant = {
        title: track.title,
        sections: result.sections.map((s) => ({ name: s.name, bars: s.lines })),
      };

      setWizardState((prev) => ({ ...prev, generatedVariant: previewVariant }));
      addUsageLog({ flowName: 'generateSongDraft', inkCost: activeDraftCharged, status: 'success' });
      setProgress(100);
      completeAndMaybeReopen(5);
      loadPreviewRhymeGroups(previewVariant);
    } catch (e: any) {
      refundInk(activeDraftBase);
      toast({ variant: 'destructive', title: 'Generation Failed', description: e.message });
    } finally {
      setIsGenerating(false);
      setGenerating(false);
    }
    });
  };

  const handleRelayAnalyze = async (sourceText: string, e: any) => {
    const cost = getCost('analyzeRelayAssets');
    runWithInk('analyzeRelayAssets', cost, 'analyzeRelayAssets', e, async () => {
    setGeneratingOperation('extract');
    setIsGenerating(true);
    setGenerating(true, 'Performing DNA Extraction...');
    try {
        const result = await withAsyncTimeout(
          suggestRelayDirections(
            await withAiAuth({ lyrics: sourceText, userName: user?.displayName })
          ),
          EXTRACT_TIMEOUT_MS,
          'DNA extraction'
        );
        setWizardState((prev) => ({
          ...prev,
          lyrics: sourceText,
          analysis: result.analysis,
          directions: result.directions,
        }));
        if (result.analysis.styleAnalysis?.trim()) {
            setHubStyleAnalysis(result.analysis.styleAnalysis);
            setHubStyleMetrics(result.analysis.styleMetrics ?? DEFAULT_STYLE_METRICS);
            setHubStyleEnabled(true);
            markHubSeeded('style');
        }
        addUsageLog({ flowName: 'analyzeRelayAssets', inkCost: cost, status: 'success' });
        setProgress(100);
        completeAndMaybeReopen(2);
    } catch (e: any) { 
        refundInk(cost); 
        toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message });
    } finally { 
        setIsGenerating(false); 
        setGenerating(false); 
    }
    });
  };

  const handleConfirmSaveDNA = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Save custom DNA profiles with Studio Pro.' });
        return;
      }
      if (!album || !name.trim() || !wizardState.analysis) return;
      const profile = stripForFirestore(
        buildDnaPresetPayload(wizardState.analysis, {
          hubDirection,
          hubIntents,
          hubStructure,
          hubStructureGuide,
          hubStyleAnalysis,
          hubStyleMetrics,
          name: name.trim(),
          sourceTrackTitle: track.title,
        })
      );
      const existing = album.dnaPresets || [];
      updateAlbum(album.id, { dnaPresets: [...existing, profile] });
      setHubDirection(profile.mapping);
      if (profile.intents?.length) {
          setHubIntents(profile.intents);
          setIntentsEnabled(true);
          const existingMotifs = album.thingsToSay || [];
          const novel = profile.intents.filter((m) => !existingMotifs.includes(m));
          if (novel.length) {
              updateAlbum(album.id, { thingsToSay: [...existingMotifs, ...novel] });
          }
      }
      if (profile.structureGuide) {
          setHubStructureGuide(profile.structureGuide);
      }
      if (profile.styleAnalysis?.trim()) {
          setHubStyleAnalysis(profile.styleAnalysis);
          setHubStyleMetrics(profile.styleMetrics ?? DEFAULT_STYLE_METRICS);
          setHubStyleEnabled(true);
      }
      toast({
        title: 'DNA profile saved',
        description: `"${name.trim()}" saved to your vault with full extraction.`,
      });
  };

  const loadDnaPreset = (preset: DnaPreset) => {
      setHubDirection(preset.mapping);
      const intents = preset.intents?.length
          ? preset.intents
          : preset.analysis?.motifs ?? [];
      if (intents.length) {
          setHubIntents(intents);
          setIntentsEnabled(true);
          if (album) {
              const existing = album.thingsToSay || [];
              const novel = intents.filter((m) => !existing.includes(m));
              if (novel.length) {
                  updateAlbum(album.id, { thingsToSay: [...existing, ...novel] });
              }
          }
      }
      if (preset.structure?.length) {
          setHubSections(preset.structure.map((s: { name: string; bars: number; enabled: boolean }) => ({ ...s })));
      }
      if (preset.structureGuide) {
          setHubStructureGuide(preset.structureGuide);
      }
      if (preset.analysis) {
          setWizardState((prev) => ({
            ...prev,
            analysis: normalizeWizardAnalysis(preset.analysis),
          }));
      }
      const savedStyle = preset.styleAnalysis?.trim() || preset.analysis?.styleAnalysis?.trim();
      if (savedStyle) {
          setHubStyleAnalysis(savedStyle);
          setHubStyleMetrics(preset.styleMetrics ?? preset.analysis?.styleMetrics ?? DEFAULT_STYLE_METRICS);
          setHubStyleEnabled(true);
          markHubSeeded('style');
      }
      CALIBRATION_HUB_SECTION_KEYS.forEach((key) => markHubSeeded(key));
      toast({ title: "Full DNA Profile Loaded" });
  };

  const toggleRemixDirection = (dir: WizardState['selectedDirections'][number]) => {
      setWizardState((prev) => {
          const active = prev.selectedDirections.some((d) => d.name === dir.name);
          const next = active
              ? prev.selectedDirections.filter((d) => d.name !== dir.name)
              : [...prev.selectedDirections, { ...dir, weight: 50 }];
          if (!active) markHubSeeded('remix');
          return { ...prev, selectedDirections: rebalanceRemixWeights(next) };
      });
  };

  const updateRemixWeight = (name: string, weight: number) => {
      setWizardState((prev) => ({
          ...prev,
          selectedDirections: prev.selectedDirections.map((d) =>
              d.name === name ? { ...d, weight } : d
          ),
      }));
  };

  const handleInjectStrain = (
      title: string,
      content: string | string[] | null | undefined,
      target: StrainInjectionTarget
  ) => {
      if (!content || (Array.isArray(content) && content.length === 0)) return;

      if (target.kind === 'intents') {
          const motifs = Array.isArray(content) ? content : [content];
          if (album) {
              const existing = album.thingsToSay || [];
              const novel = motifs.filter((m) => !existing.includes(m));
              if (novel.length) {
                  updateAlbum(album.id, { thingsToSay: [...existing, ...novel] });
              }
          }
          setHubIntents((prev) => [...new Set([...prev, ...motifs])]);
          setIntentsEnabled(true);
          markHubSeeded('intents');
          toast({ title: `Motifs injected (${motifs.length})`, description: 'Added to Intents panel.' });
          return;
      }

      if (target.kind === 'structure_guide') {
          const text = Array.isArray(content) ? content.join(', ') : content;
          setHubStructureGuide((prev) => {
              const tagged = `[Structure] ${text}`;
              if (prev.includes(text)) return prev;
              return prev ? `${prev}\n${tagged}` : tagged;
          });
          markHubSeeded('structure');
          toast({ title: 'Structure guide injected', description: 'See Structure panel in Calibration Hub.' });
          return;
      }

      if (target.kind === 'style_profile') {
          const text = Array.isArray(content) ? content.join(', ') : content;
          setHubStyleAnalysis(text);
          setHubStyleMetrics(
              wizardState.analysis?.styleMetrics ?? DEFAULT_STYLE_METRICS
          );
          setHubStyleEnabled(true);
          markHubSeeded('style');
          toast({ title: 'Style DNA injected', description: 'Loaded into Style DNA panel.' });
          return;
      }

      const text = Array.isArray(content) ? content.join(', ') : content;
      setHubDirection((prev) => appendDirectionField(prev, target.field, target.label, text));
      markHubSeeded('creativeDna');
      toast({ title: `DNA Part Injected: ${title}` });
  };

  const renderHubDnaPresetList = useCallback(
    (presets: DnaPreset[], options: { deletable: boolean; keyPrefix: string }) => {
      if (!presets.length) {
        return <p className="text-center text-[9px] uppercase opacity-40 py-10">No presets available.</p>;
      }
      return (
        <div className="space-y-3">
          {presets.map((p, i) => {
            const key = `${options.keyPrefix}-${i}`;
            const isExpanded = expandedDnaPresetKey === key;
            return (
              <Card key={key} className="bg-background/40 border-white/5 overflow-hidden flex flex-col transition-all">
                <div
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5"
                  onClick={() => setExpandedDnaPresetKey(isExpanded ? null : key)}
                >
                  <div className="min-w-0 flex-grow pr-4">
                    <p className="text-xs font-bold text-primary truncate uppercase">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{p.sourceTrackTitle || 'Studio Preset'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {options.deletable && album && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500/40 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateAlbum(album.id, { dnaPresets: album.dnaPresets?.filter((_, idx) => idx !== i) });
                              toast({ title: 'DNA profile removed' });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[200px] text-[10px] leading-snug">{DNA_HUB_TOOLTIPS.vaultDelete}</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); loadDnaPreset(p); }}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[220px] text-[10px] leading-snug">{DNA_HUB_TOOLTIPS.vaultFullLoad}</TooltipContent>
                    </Tooltip>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-3 bg-black/40 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <DnaVaultPresetDetails
                      preset={p}
                      onInjectMappingField={(field, value) => {
                        if (!value) return;
                        setHubDirection((prev) => ({ ...prev, [field]: value }));
                        markHubSeeded('creativeDna');
                        toast({ title: `${field} loaded` });
                      }}
                      onInjectStrain={(title, content) => {
                        const target = STRAIN_TARGETS[title];
                        if (target) handleInjectStrain(title, content, target);
                      }}
                      onInjectIntents={(intents) => {
                        setHubIntents(intents);
                        setIntentsEnabled(true);
                        markHubSeeded('intents');
                        if (album) {
                          const existing = album.thingsToSay || [];
                          const novel = intents.filter((m) => !existing.includes(m));
                          if (novel.length) {
                            updateAlbum(album.id, { thingsToSay: [...existing, ...novel] });
                          }
                        }
                        toast({ title: 'Motifs loaded into Intents' });
                      }}
                      onInjectStructureGuide={(guide) => {
                        setHubStructureGuide(guide);
                        markHubSeeded('structure');
                        toast({ title: 'Structure guide loaded' });
                      }}
                      onInjectStyle={(analysis, metrics) => {
                        setHubStyleAnalysis(analysis);
                        setHubStyleMetrics(metrics ?? DEFAULT_STYLE_METRICS);
                        setHubStyleEnabled(true);
                        markHubSeeded('style');
                        toast({ title: 'Style DNA loaded' });
                      }}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
    },
    [
      album,
      expandedDnaPresetKey,
      handleInjectStrain,
      loadDnaPreset,
      markHubSeeded,
      toast,
      updateAlbum,
    ]
  );

  const handleConfirmSaveStyle = (name: string) => {
      if (!isPro) {
        toast({ variant: 'destructive', title: 'Pro Feature', description: 'Save custom Style DNA with Studio Pro.' });
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
      toast({
        title: 'Style profile saved',
        description: `"${name.trim()}" saved to your vault.`,
      });
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
    const relayCharged = getEffectiveCost(
      'generateRelayDraft',
      activeBarsCount * getCost('generateRelayDraft')
    );
    runWithInk('dna-remix-draft', relayCharged, 'generateRelayDraft', e, async () => {
    setGeneratingOperation('remix');
    setIsGenerating(true);
    setGenerating(true, 'Synthesizing Neural Draft...');
    try {
        archiveCurrentApprovalDraft();
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

        const remixDirection = formatRemixDirectionsWithWeights(wizardState.selectedDirections);

        const mergedCreativeDirection = resolveWorkstationDirection(
          inheritAlbum,
          inheritTrack,
          album?.direction,
          hubDirection
        );

        const result = await withAsyncTimeout(
          generateRelayDraft(
            await withAiAuth({
              analysis: JSON.stringify(wizardState.analysis),
              direction: remixDirection,
              styleProfile:
                hubStyleEnabled && hubStyleAnalysis.trim()
                  ? { analysis: hubStyleAnalysis }
                  : { analysis: '' },
              distanceFromSource: 'balanced',
              delivery: 'dynamic',
              cleanliness: 'standard',
              intents: intentsEnabled ? hubIntents : [],
              vibe: { ...hubVibe, enabled: hubVibeEnabled },
              directionSuite: mergedCreativeDirection,
              useAlbumDirection: inheritAlbum,
              useTrackDirection: inheritTrack,
              albumDirection: inheritAlbum ? album?.direction : undefined,
              trackDirection: inheritTrack ? hubDirection : undefined,
              specialInstructions: lyricsAbout,
              negativePrompt: enableGuardrails ? negativePrompt : undefined,
              forbiddenWords: enableGuardrails
                ? forbiddenWords.split(',').map((w) => w.trim()).filter(Boolean)
                : undefined,
              mustIncludeWords: enableGuardrails
                ? mustIncludeWords.split(',').map((w) => w.trim()).filter(Boolean)
                : undefined,
              structure: hubStructure.filter((s) => s.enabled).map((s) => ({ name: s.name, bars: s.bars })),
              structureGuide: hubStructureGuide.trim() || undefined,
              userName: user?.displayName,
            })
          ),
          SYNTHESIS_TIMEOUT_MS,
          'DNA remix draft'
        );
        setWizardState((prev) => ({ ...prev, generatedVariant: result }));
        addUsageLog({ flowName: 'generateRelayDraft', inkCost: relayCharged, status: 'success' });
        setProgress(100);
        completeAndMaybeReopen(5);
        loadPreviewRhymeGroups(result);
    } catch (e: any) { refundInk(relayCharged); toast({ variant: 'destructive', title: 'Synthesis Failed', description: e.message }); } finally { setIsGenerating(false); setGenerating(false); }
    });
  };

  const handleAddStructureSection = (type: string) => {
      setStructurePresetId('custom');
      setHubSections(prev => [...prev, { name: type, bars: type === 'Verse' ? 16 : 8, enabled: true }]);
  };

  const handleRemoveStructureSection = (idx: number) => {
      setStructurePresetId('custom');
      setHubSections(prev => prev.filter((_, i) => i !== idx));
  };

  const renderStrainInjectButton = (
      title: string,
      content: string | string[] | null | undefined,
      size: 'sm' | 'md' = 'md'
  ) => {
      const target = STRAIN_TARGETS[title];
      if (!target || !content) return null;
      const theme = getStrainDestinationTheme(title);
      return (
          <Tooltip>
              <TooltipTrigger asChild>
                  <Button
                      variant="ghost"
                      size="icon"
                      className={cn('shrink-0', theme.inject, theme.injectHover, size === 'sm' ? 'h-7 w-7' : 'h-8 w-8')}
                      onClick={() => handleInjectStrain(title, content, target)}
                      aria-label={getStrainInjectTooltip(title)}
                  >
                      <Zap className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
                  </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px] text-[10px] leading-snug">
                  {getStrainInjectTooltip(title)}
              </TooltipContent>
          </Tooltip>
      );
  };

  const renderDestinationPill = (title: string) => {
      const theme = getStrainDestinationTheme(title);
      const pill = (
          <span className={cn('text-[7px] font-bold uppercase tracking-[0.18em]', theme.pill)}>
              → {theme.hubSection}
              {theme.hubField ? ` · ${theme.hubField}` : ''}
          </span>
      );
      return (
          <Tooltip>
              <TooltipTrigger asChild>
                  <span className="inline-block cursor-help">{pill}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-[10px] leading-snug">
                  {DNA_HUB_TOOLTIPS.destinationPill}
              </TooltipContent>
          </Tooltip>
      );
  };

  const renderBadgeStrainCard = (
      title: string,
      content: string[] | null | undefined,
      icon: React.ComponentType<{ className?: string }>
  ) => {
      if (!content?.length) return null;
      const theme = getStrainDestinationTheme(title);
      return (
          <Card className={cn(
              'p-5 space-y-3 group transition-all shadow-xl h-full flex flex-col border',
              theme.cardBg,
              theme.cardBorder,
              theme.cardHover
          )}>
              <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                      <div className={cn('flex items-center gap-2.5', theme.icon)}>
                          {React.createElement(icon, { className: 'h-4 w-4 shrink-0' })}
                          <h5 className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', theme.title)}>{title}</h5>
                      </div>
                      {renderDestinationPill(title)}
                  </div>
                  {renderStrainInjectButton(title, content, 'sm')}
              </div>
              <div className="flex flex-wrap gap-2">
                  {content.map((c, i) => (
                      <Badge
                          key={i}
                          variant="outline"
                          className={cn(
                              'text-[10px] font-bold uppercase py-1 px-3',
                              theme.badgeBg,
                              theme.badgeBorder,
                              theme.badgeText
                          )}
                      >
                          {c}
                      </Badge>
                  ))}
              </div>
          </Card>
      );
  };

  const renderExpandedStrainCard = (
      title: string,
      content: string | null | undefined,
      icon: React.ComponentType<{ className?: string }>
  ) => {
      if (!content?.trim()) return null;
      const theme = getStrainDestinationTheme(title);
      return (
          <Card className={cn(
              'p-5 space-y-3 group transition-all shadow-xl h-full flex flex-col border',
              theme.cardBg,
              theme.cardBorder,
              theme.cardHover
          )}>
              <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                      <div className={cn('flex items-center gap-2.5', theme.icon)}>
                          {React.createElement(icon, { className: 'h-4 w-4 shrink-0' })}
                          <h5 className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', theme.title)}>{title}</h5>
                      </div>
                      {renderDestinationPill(title)}
                  </div>
                  {renderStrainInjectButton(title, content, 'sm')}
              </div>
              <p className={cn('text-sm font-code font-bold italic leading-relaxed whitespace-pre-wrap break-words', theme.title, 'opacity-90')}>
                  "{content}"
              </p>
          </Card>
      );
  };

  const renderMetaStrainStack = (
      items: Array<{ title: string; content: string; icon: React.ComponentType<{ className?: string }> }>
  ) => {
      if (items.length === 0) return null;
      return (
          <div className="h-full flex flex-col gap-2">
              {items.map(({ title, content, icon }) => {
                  const theme = getStrainDestinationTheme(title);
                  return (
                      <Card
                          key={title}
                          className={cn(
                              'flex flex-col justify-center gap-2 p-4 min-h-[5rem] group transition-all border shadow-lg flex-1',
                              theme.cardBg,
                              theme.cardBorder,
                              theme.cardHover
                          )}
                      >
                          <div className="flex justify-between items-center gap-2">
                              <div className="space-y-1 min-w-0">
                                  <div className={cn('flex items-center gap-2', theme.icon)}>
                                      {React.createElement(icon, { className: 'h-4 w-4 shrink-0' })}
                                      <h5 className={cn('text-[10px] font-bold uppercase tracking-[0.15em] truncate', theme.title)}>{title}</h5>
                                  </div>
                                  {renderDestinationPill(title)}
                              </div>
                              {renderStrainInjectButton(title, content, 'sm')}
                          </div>
                          <p className={cn('text-sm font-code font-bold italic leading-snug break-words opacity-90', theme.title)}>
                              "{content}"
                          </p>
                      </Card>
                  );
              })}
          </div>
      );
  };

  const renderStyleStrainCard = (analysis: WizardAnalysis) => {
      const styleText = analysis.styleAnalysis?.trim();
      if (!styleText) return null;
      const metrics = analysis.styleMetrics ?? DEFAULT_STYLE_METRICS;
      const theme = getStrainDestinationTheme('Style');

      return (
          <Card className={cn(
              'p-5 space-y-3 group transition-all shadow-xl flex flex-col border',
              theme.cardBg,
              theme.cardBorder,
              theme.cardHover
          )}>
              <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 min-w-0">
                      <div className={cn('flex items-center gap-2.5', theme.icon)}>
                          <Fingerprint className="h-4 w-4 shrink-0" />
                          <h5 className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', theme.title)}>Style</h5>
                      </div>
                      {renderDestinationPill('Style')}
                  </div>
                  {renderStrainInjectButton('Style', styleText, 'sm')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                      <p className={cn('text-[9px] font-bold uppercase', theme.pill)}>Vocab · {metrics.vocabularyScore}</p>
                      <Progress value={metrics.vocabularyScore} className="h-1.5 bg-fuchsia-500/10" />
                  </div>
                  <div className="space-y-1">
                      <p className={cn('text-[9px] font-bold uppercase', theme.pill)}>Rhyme · {metrics.rhymeComplexity}</p>
                      <Progress value={metrics.rhymeComplexity} className="h-1.5 bg-fuchsia-500/10" />
                  </div>
              </div>
              <p className={cn('text-[10px] font-bold uppercase', theme.pill)}>Cadence: {metrics.cadenceMap}</p>
              <p className={cn('text-sm font-code font-bold italic leading-relaxed whitespace-pre-wrap break-words opacity-90', theme.title)}>
                  "{styleText}"
              </p>
          </Card>
      );
  };

  const renderAnalysisStrainLayout = (analysis: WizardAnalysis, variant: 'full' | 'sidebar' = 'full') => {
      const emotion = [analysis.emotionalTone?.primaryEmotion, analysis.emotionalTone?.secondaryEmotion]
          .filter(Boolean)
          .join(' / ');

      const metaItems: Array<{ title: string; content: string; icon: React.ComponentType<{ className?: string }> }> = [];
      if (emotion && emotion.length < 120) {
          metaItems.push({ title: 'Emotion', content: emotion, icon: Compass });
      }
      if (analysis.pov?.trim()) {
          metaItems.push({ title: 'POV', content: analysis.pov, icon: UserCircle });
      }
      if (analysis.tense?.trim()) {
          metaItems.push({ title: 'Tense', content: analysis.tense, icon: TimerReset });
      }

      const hasShift = !!analysis.emotionalShift?.trim();
      const hasArc = !!analysis.narrativeArc?.trim();
      const hasStructure = !!analysis.structure?.trim();
      const longEmotion = emotion.length >= 120;
      const isSidebar = variant === 'sidebar';
      const longCol = isSidebar ? 'col-span-1' : 'lg:col-span-7';
      const sideCol = isSidebar ? 'col-span-1' : 'lg:col-span-5';

      return (
          <div className={cn('space-y-3', !isSidebar && 'md:space-y-4')}>
              <div className={cn('grid items-stretch', isSidebar ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 gap-4')}>
                  {renderBadgeStrainCard('Themes', analysis.themes, Link2)}
                  {renderBadgeStrainCard('Motifs', analysis.motifs, Target)}
              </div>

              {longEmotion && renderExpandedStrainCard('Emotion', emotion, Compass)}

              {(hasShift || metaItems.length > 0) && (
                  <div className={cn('grid items-stretch', isSidebar ? 'grid-cols-1 gap-3' : 'grid-cols-1 lg:grid-cols-12 gap-4')}>
                      {hasShift && (
                          <div className={cn(metaItems.length > 0 ? longCol : isSidebar ? 'col-span-1' : 'lg:col-span-12')}>
                              {renderExpandedStrainCard('Shift', analysis.emotionalShift, ArrowRightLeft)}
                          </div>
                      )}
                      {metaItems.length > 0 && (
                          <div className={cn(hasShift ? sideCol : isSidebar ? 'col-span-1' : 'lg:col-span-12 md:max-w-md')}>
                              {renderMetaStrainStack(metaItems)}
                          </div>
                      )}
                  </div>
              )}

              {(hasArc || hasStructure) && (
                  <div className={cn('grid items-stretch', isSidebar ? 'grid-cols-1 gap-3' : 'grid-cols-1 lg:grid-cols-12 gap-4')}>
                      {hasArc && (
                          <div className={cn(hasStructure ? longCol : isSidebar ? 'col-span-1' : 'lg:col-span-12')}>
                              {renderExpandedStrainCard('Arc', analysis.narrativeArc, GitBranch)}
                          </div>
                      )}
                      {hasStructure && (
                          <div className={cn(hasArc ? sideCol : isSidebar ? 'col-span-1' : 'lg:col-span-12')}>
                              {renderExpandedStrainCard('Structure', analysis.structure, LayoutTemplate)}
                          </div>
                      )}
                  </div>
              )}

              {renderExpandedStrainCard('Technical Fingerprint', analysis.voiceStyle, Fingerprint)}

              {renderExpandedStrainCard('What Makes It Work', analysis.whatMakesItWork, Sparkles)}

              {renderStyleStrainCard(analysis)}
          </div>
      );
  };

  const renderRemixWeightControls = (compact = false) => (
      <div className={cn("space-y-3", compact ? "mt-3 pt-3 border-t border-primary/10" : "")}>
          {wizardState.selectedDirections.map((d) => (
              <div
                  key={d.name}
                  className="space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
              >
                  <div className="flex items-center justify-between gap-2">
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <span className={cn("font-bold uppercase text-primary truncate cursor-help", compact ? "text-[8px]" : "text-[9px]")}>{d.name}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-[10px] leading-snug">
                              {DNA_HUB_TOOLTIPS.remixInfluence}
                          </TooltipContent>
                      </Tooltip>
                      <span className={cn("font-mono text-muted-foreground shrink-0", compact ? "text-[8px]" : "text-[9px]")}>{d.weight ?? 50}%</span>
                  </div>
                  <Slider
                      value={[d.weight ?? 50]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => updateRemixWeight(d.name, v)}
                      className="py-1"
                  />
              </div>
          ))}
      </div>
  );

  const hubSectionSummary = useMemo(
    (): Partial<Record<HubSectionKey, string>> => ({
      structure: hubStructureGuide.trim()
        ? 'Structure guide active'
        : `${hubStructure.filter((s) => s.enabled).length} sections`,
      vibe: hubVibe?.genre?.trim() || (hubVibeEnabled ? 'Enabled' : 'Off'),
      intents: hubIntents.length ? `${hubIntents.length} motifs` : undefined,
      creativeDna: (() => {
        const parts: string[] = [];
        if (inheritAlbum) parts.push('Inherit Album');
        if (inheritTrack) parts.push('Track DNA');
        if (CREATIVE_DNA_FIELDS.some(({ key }) => String(hubDirection[key] ?? '').trim())) {
          parts.push('Fields set');
        }
        return parts.length ? parts.join(' · ') : undefined;
      })(),
      specialInstructions: lyricsAbout.trim() ? 'Instructions set' : undefined,
      remix: wizardState.selectedDirections.length
        ? `${wizardState.selectedDirections.length} paths`
        : undefined,
      style: hubStyleAnalysis.trim() ? 'Style loaded' : undefined,
      guardrails: enableGuardrails ? 'Active' : 'Off',
    }),
    [
      hubStructureGuide,
      hubStructure,
      hubVibe,
      hubVibeEnabled,
      hubIntents,
      hubDirection,
      lyricsAbout,
      wizardState.selectedDirections.length,
      hubStyleAnalysis,
      enableGuardrails,
      inheritAlbum,
      inheritTrack,
    ]
  );

  const hubModuleActive = useMemo(
    (): Record<HubInkKey, boolean> => ({
      structure: hubStructure.some((s) => s.enabled),
      vibe: hubVibeEnabled,
      intents: intentsEnabled && hubIntents.length > 0,
      albumDna: inheritAlbum,
      trackDna: inheritTrack,
      creativeDna: CREATIVE_DNA_FIELDS.some(({ key }) => String(hubDirection[key] ?? '').trim()),
      specialInstructions: !!lyricsAbout.trim(),
      remix: wizardState.selectedDirections.length > 0,
      dnaStrains: !!wizardState.analysis,
      style: hubStyleEnabled && !!hubStyleAnalysis.trim(),
      guardrails: enableGuardrails,
    }),
    [
      hubStructure,
      hubVibeEnabled,
      intentsEnabled,
      hubIntents.length,
      inheritAlbum,
      inheritTrack,
      hubDirection,
      lyricsAbout,
      wizardState.selectedDirections.length,
      wizardState.analysis,
      hubStyleEnabled,
      hubStyleAnalysis,
      enableGuardrails,
    ]
  );

  useEffect(() => {
    if (step !== 10) {
      prevHubActiveRef.current = null;
      return;
    }
    const prev = prevHubActiveRef.current;
    if (prev) {
      for (const key of HUB_INK_KEYS) {
        if (prev[key] !== hubModuleActive[key]) {
          if (hubFlashTimeoutRef.current) clearTimeout(hubFlashTimeoutRef.current);
          setHubFlashKey(key);
          hubFlashTimeoutRef.current = setTimeout(() => setHubFlashKey(null), 400);
          break;
        }
      }
    }
    prevHubActiveRef.current = hubModuleActive;
  }, [hubModuleActive, step]);

  const synthesisLoaderMode: SynthesisLoaderMode =
    generatingOperation === 'extract' ? 'extract' : 'synthesize';

  const synthesisActiveRules = useMemo(
    () =>
      synthesisLoaderMode === 'extract'
        ? {}
        : {
            dna: inheritAlbum || inheritTrack || hasDirectionContent(hubDirection),
            intents: intentsEnabled && hubIntents.length > 0,
            style: hubStyleEnabled && !!hubStyleAnalysis?.trim(),
            vibe: hubVibeEnabled,
            guardrails: enableGuardrails,
            instructions: !!lyricsAbout.trim(),
          },
    [
      synthesisLoaderMode,
      inheritAlbum,
      inheritTrack,
      hubDirection,
      intentsEnabled,
      hubIntents.length,
      hubStyleEnabled,
      hubStyleAnalysis,
      hubVibeEnabled,
      enableGuardrails,
      lyricsAbout,
    ]
  );

  const synthesisProgressLabel =
    generatingOperation === 'extract' ? 'Profile Scan' : 'Strand Build';

  const analyzeRelayInkCost = Math.round(getEffectiveCost('analyzeRelayAssets'));

  const handleWorkstationBack = useCallback(() => {
    if (step === 10 && wizardState.analysis) {
      setStep(3);
      return;
    }
    if (step === 10) {
      setStep(0);
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    if (step === 2 && wizardState.analysis) {
      setRemixSeedBackConfirmOpen(true);
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 5) {
      setStep(10);
      return;
    }
    setStep(0);
  }, [step, wizardState.analysis]);

  const confirmReturnToRemixSeed = useCallback(() => {
    setRemixSeedBackConfirmOpen(false);
    setApprovalDraftHistory([]);
    setStep(1);
  }, []);

  useLayoutEffect(() => {
    if (!isGenerating) {
      setSyncAttractor(null);
      return;
    }

    const measure = () => {
      const surface = syncSurfaceRef.current;
      const anchor = logoAnchorRef.current;
      if (!surface || !anchor) return;
      const s = surface.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      const logoSpan = Math.max(a.width, a.height);
      const surfaceSpan = Math.min(s.width, s.height);
      setSyncAttractor({
        cx: a.left + a.width / 2 - s.left,
        cy: a.top + a.height / 2 - s.top,
        r: logoSpan * 0.52,
        /** Ring wraps logo square — sized from logo, centered on anchor */
        ringR: Math.min(Math.max(logoSpan * 1.62, 128), surfaceSpan * 0.42),
      });
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (syncSurfaceRef.current) ro.observe(syncSurfaceRef.current);
    if (logoAnchorRef.current) ro.observe(logoAnchorRef.current);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isGenerating, progress, synthesisLoaderMode, synthesisActiveRules]);

  return (
    <>
    <TooltipProvider delayDuration={300}>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        overlayClassName="z-[2090] bg-[hsl(216_50%_4%/0.98)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        className="fixed left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] sm:top-[2vh] -translate-x-1/2 translate-y-0 w-[min(99vw,1720px)] max-w-none h-[min(94vh,calc(100dvh-1rem))] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-0.5rem)] sm:max-h-[calc(100dvh-1rem)] flex flex-col gap-0 bg-[hsl(216_48%_7%)] border-2 border-white/10 overflow-hidden p-0 rounded-xl shadow-2xl z-[2100] [&>button.absolute]:hidden"
      >
        <DialogHeader className="shrink-0 p-3 border-b border-white/10 bg-[hsl(216_48%_8%/0.95)] flex-row items-center justify-between relative z-[110] gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-2.5 sm:right-4 sm:top-3 h-8 w-8 rounded-full z-[120] text-muted-foreground hover:text-foreground"
              onClick={handleHardClose}
              aria-label="Close Generation Workstation"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex items-center min-w-0 flex-1 pr-[4.5rem] sm:pr-10">
                {step > 0 && <Button variant="ghost" size="icon" className="h-8 w-8 mr-1 sm:mr-2 rounded-full shrink-0" onClick={handleWorkstationBack} aria-label="Previous step"><ArrowLeft className="h-4 w-4"/></Button>}
                <DialogTitle className="font-headline text-sm sm:text-xl font-bold flex items-center gap-2 uppercase tracking-tighter text-foreground min-w-0 truncate">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse shrink-0" />
                    <span className="truncate">Generation Workstation</span>
                </DialogTitle>
                <DialogDescription className="sr-only">Step-by-step neural synthesis and calibration.</DialogDescription>
                <Badge
                  variant="outline"
                  className="sm:hidden ml-auto shrink-0 h-4 px-1.5 text-[7px] font-bold uppercase tracking-widest border-primary/20 text-primary whitespace-nowrap"
                >
                  {step === 0 ? 'Mode Select' : step === 10 ? 'Calibration Hub' : step === 5 ? 'Approval Step' : 'Analysis Step'}
                </Badge>
            </div>
            <div className="hidden sm:flex items-center gap-4 pr-12 shrink-0">
                <Badge variant="outline" className="h-5 px-2 text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary">
                    {step === 0 ? 'Mode Select' : step === 10 ? 'Calibration Hub' : step === 5 ? 'Approval Step' : 'Analysis Step'}
                </Badge>
            </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col isolate studio-page-base">
          {!isGenerating && (
            <WorkstationStepBackground variant={stepToWorkstationVariant(step)} />
          )}
          {!isGenerating && step === 10 && (
            <HubCalibrationAmbient
              hubActive={hubModuleActive}
              hubCollapsed={hubCollapsed}
              flashKey={hubFlashKey}
              className="absolute inset-0 z-[1]"
            />
          )}
          <div
            className={cn(
              'generating-overlay absolute inset-0 z-[101] flex flex-col min-h-0 transition-opacity duration-300',
              isGenerating ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            aria-hidden={!isGenerating}
          >
            <div
              ref={syncSurfaceRef}
              className="relative flex-1 min-h-0 overflow-hidden isolate"
            >
              {isGenerating && (
                <GenerationSyncAmbient
                  progress={progress}
                  mode={synthesisLoaderMode}
                  activeRules={synthesisActiveRules}
                  attractor={syncAttractor}
                  className="absolute inset-0 z-0"
                />
              )}
              <div className="relative z-10 h-full min-h-0 w-full px-2 sm:px-4">
                <DNASynthesisLoader
                  size="large"
                  constrainHeight
                  hideStatus
                  progress={progress}
                  mode={synthesisLoaderMode}
                  activeRules={synthesisActiveRules}
                  logoAnchorRef={logoAnchorRef}
                />
              </div>
            </div>
            <div className="shrink-0 border-t border-white/10 bg-[hsl(216_48%_6%/0.95)] backdrop-blur-sm px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 space-y-2.5 sm:space-y-3 relative z-20">
              <p className="text-[10px] sm:text-[11px] font-code uppercase text-white/70 text-center leading-relaxed tracking-[0.18em] px-1">
                {getDnaLoaderStatusText(progress, undefined, synthesisLoaderMode)}
              </p>
              <div className="w-full max-w-lg mx-auto space-y-2">
                <div className="relative h-2.5 sm:h-3 bg-white/5 border border-amber-500/25 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-700 via-yellow-500 to-amber-300"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'linear' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] sm:text-xs font-bold font-code text-amber-400 uppercase tracking-[0.18em]">
                  <span>{synthesisProgressLabel}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn('flex-1 min-h-0 flex flex-col relative z-10 studio-scrollbar', step === 5 ? 'overflow-hidden' : 'overflow-y-auto', isGenerating && 'invisible pointer-events-none')}>
          {step === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center w-full min-h-0 px-3 sm:px-8 py-8 sm:py-12 gap-6 sm:gap-9 md:gap-10 animate-in fade-in duration-700">
                <div className="text-center space-y-2 sm:space-y-3 w-full shrink-0 max-w-5xl mx-auto">
                    <p className="sm:hidden text-[10px] font-bold uppercase tracking-[0.35em] text-primary">Mode Select</p>
                    <h2 className="text-3xl sm:text-5xl font-headline font-bold text-white uppercase tracking-tight leading-tight px-1">Select Workflow Mode</h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-[0.25em] sm:tracking-[0.4em]">Initialize your creative process.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-10 w-full max-w-5xl mx-auto">
                    <Card className="cursor-pointer border-2 hover:border-primary/50 p-8 sm:p-12 min-h-[220px] sm:min-h-[280px] flex flex-col items-center justify-center gap-5 sm:gap-7 bg-black/45 hover:scale-[1.02] sm:hover:scale-[1.04] transition-all group relative overflow-hidden" onClick={() => setStep(10)}>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent opacity-80" />
                        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
                        <Wand2 className="relative h-20 w-16 sm:h-24 sm:w-20 text-primary group-hover:animate-bounce" />
                        <div className="relative text-center space-y-2 sm:space-y-3 px-2">
                            <h4 className="font-headline text-2xl sm:text-4xl font-bold uppercase text-white">Full Studio Draft</h4>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">Direct synthesis from active rules.</p>
                        </div>
                    </Card>
                    <Card className="cursor-pointer border-2 hover:border-sky-500/50 p-8 sm:p-12 min-h-[220px] sm:min-h-[280px] flex flex-col items-center justify-center gap-5 sm:gap-7 bg-black/45 hover:scale-[1.02] sm:hover:scale-[1.04] transition-all group relative overflow-hidden" onClick={() => setStep(1)}>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/15 via-cyan-500/5 to-transparent opacity-80" />
                        <div className="pointer-events-none absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-sky-500/20 blur-3xl" />
                        <BrainCircuit className="relative h-20 w-16 sm:h-24 sm:w-20 text-sky-400 group-hover:animate-pulse" />
                        <div className="relative text-center space-y-2 sm:space-y-3 px-2">
                            <h4 className="font-headline text-2xl sm:text-4xl font-bold uppercase text-white">DNA & REMIX</h4>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest leading-relaxed max-w-[320px] mx-auto">Extract and save strains to seed your next synthesis loop.</p>
                        </div>
                    </Card>
                </div>
            </div>
          )}

          {(step === 10) && (
              <div className="relative flex-1 min-h-0 flex flex-col">
                  <ScrollArea className="relative z-10 flex-1 min-h-0 studio-scrollbar">
                  <div className="px-3 sm:px-6 py-4 sm:py-5 animate-in fade-in slide-in-from-bottom-8">
                      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(0,0.95fr)] gap-6 w-full items-start pb-6">
                          {/* Column 1 — Production setup */}
                          <div className="flex flex-col gap-5 min-w-0">
                              <HubSectionShell
                                  title="Structure"
                                  icon={GitMerge}
                                  colorClass="text-yellow-500"
                                  collapsed={hubCollapsed.structure}
                                  onToggle={() => toggleHubSection('structure')}
                                  summary={hubSectionSummary.structure}
                                  trailing={
                                      <Select
                                        value={structurePresetId}
                                        onValueChange={(val) => {
                                          const p = STRUCTURE_PRESETS.find((x) => x.id === val);
                                          if (p) {
                                            setStructurePresetId(val);
                                            setHubSections(p.sections.map((s) => ({ ...s })));
                                          }
                                        }}
                                      >
                                          <SelectTrigger className="h-8 w-28 text-[8px] font-bold uppercase bg-background/50 border-yellow-500/25 shrink-0">
                                              <SelectValue placeholder="Preset" />
                                          </SelectTrigger>
                                          <SelectContent className="z-[3100]">
                                              {structurePresetId === 'custom' && (
                                                <SelectItem value="custom" disabled className="text-[10px] font-bold uppercase opacity-70">
                                                  Custom
                                                </SelectItem>
                                              )}
                                              {STRUCTURE_PRESETS.map(p => (
                                                  <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold uppercase">{p.name}</SelectItem>
                                              ))}
                                          </SelectContent>
                                      </Select>
                                  }
                              >
                                  <Card className="bg-black/40 border-white/5 p-3 rounded-xl shadow-2xl">
                                      <ScrollArea className="h-[min(22vh,200px)] pr-2">
                                          <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-2 px-1">Bars · 2 lines per bar</p>
                                          <div className="space-y-2">
                                              {hubStructure.map((s, idx) => (
                                                  <div key={`${s.name}-${idx}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                                                      <div className="flex items-center gap-3">
                                                          <Checkbox checked={s.enabled} onCheckedChange={(c) => { setStructurePresetId('custom'); setHubSections(prev => prev.map((x, i) => i === idx ? { ...x, enabled: !!c } : x)); }} />
                                                          <span className="font-bold uppercase text-[10px] text-white">{s.name}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                          <Input type="number" value={s.bars} onChange={(e) => { setStructurePresetId('custom'); setHubSections(prev => prev.map((x, i) => i === idx ? { ...x, bars: parseInt(e.target.value) || 0 } : x)); }} className="w-10 h-6 text-center font-mono text-[9px] bg-background/50 p-0" />
                                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveStructureSection(idx)}>
                                                              <Trash2 className="h-3 w-3" />
                                                          </Button>
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </ScrollArea>
                                      {hubStructureGuide.trim() && (
                                          <div className="mt-3 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                              <div className="flex items-center justify-between gap-2 mb-1">
                                                  <p className="text-[8px] font-bold uppercase text-yellow-600">Extracted Structure Guide</p>
                                                  <Tooltip>
                                                      <TooltipTrigger asChild>
                                                          <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-6 w-6 text-yellow-600/60 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                                                              onClick={() => {
                                                                  setHubStructureGuide('');
                                                                  toast({ title: 'Structure guide removed' });
                                                              }}
                                                              aria-label="Remove extracted structure guide"
                                                          >
                                                              <Trash2 className="h-3 w-3" />
                                                          </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent side="left" className="max-w-[220px] text-[10px] leading-snug">
                                                          {DNA_HUB_TOOLTIPS.structureGuideClear}
                                                      </TooltipContent>
                                                  </Tooltip>
                                              </div>
                                              <p className="text-[9px] text-muted-foreground font-code italic leading-relaxed whitespace-pre-wrap">{hubStructureGuide}</p>
                                          </div>
                                      )}
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
                              </HubSectionShell>

                              <HubSectionShell
                                  title="Track Vibe"
                                  icon={Palette}
                                  colorClass="text-amber-500"
                                  collapsed={hubCollapsed.vibe}
                                  onToggle={() => toggleHubSection('vibe')}
                                  summary={hubSectionSummary.vibe}
                                  trailing={<Switch checked={hubVibeEnabled} onCheckedChange={setHubVibeEnabled} />}
                              >
                                  <Card className={cn("bg-amber-500/5 border-amber-500/20 p-3 rounded-xl space-y-3 transition-opacity", !hubVibeEnabled && "opacity-50 pointer-events-none")}>
                                      <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1"><Label className="text-[9px] font-bold uppercase text-amber-700">Genre</Label><Input placeholder="e.g. Lofi-Hop" value={hubVibe.genre} onChange={(e) => setHubVibe(v => ({ ...v, genre: e.target.value }))} className="h-8 text-[10px] bg-background/50" /></div>
                                          <div className="space-y-1"><Label className="text-[9px] font-bold uppercase text-amber-700">BPM</Label><Input type="number" placeholder="90" value={hubVibe.tempoBPM} onChange={(e) => setHubVibe(v => ({ ...v, tempoBPM: parseInt(e.target.value) || 90 }))} className="h-8 text-[10px] bg-background/50" /></div>
                                      </div>
                                      <div className="space-y-1"><Label className="text-[9px] font-bold uppercase text-amber-700">Production</Label><Textarea placeholder="e.g. Saturated 808s, airy vocal pads..." value={hubVibe.instrumentation} onChange={(e) => setHubVibe(v => ({ ...v, instrumentation: e.target.value }))} className="h-16 text-[10px] bg-background/50 resize-none" /></div>
                                      <div className="space-y-1 pt-1 border-t border-amber-500/15">
                                        <Label className="text-[8px] font-bold uppercase text-amber-600/90">System vibe presets (free)</Label>
                                      <Select onValueChange={(name) => {
                                        const p = SYSTEM_VIBE_PRESETS.find((x) => x.name === name);
                                        if (p) {
                                          setHubVibe({ genre: p.genre, tempoBPM: p.tempoBPM, feeling: p.feeling, instrumentation: p.instrumentation, enabled: true });
                                          markHubSeeded('vibe');
                                        }
                                      }}>
                                        <SelectTrigger className="h-8 text-[8px] font-bold uppercase"><SelectValue placeholder="Pick a vibe preset…" /></SelectTrigger>
                                        <SelectContent className="z-[3100]">
                                          {SYSTEM_VIBE_PRESETS.map((p) => <SelectItem key={p.name} value={p.name} className="text-[9px] uppercase">{p.name}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      </div>
                                  </Card>
                              </HubSectionShell>

                              <HubSectionShell
                                  title="Intents"
                                  icon={Target}
                                  colorClass="text-sky-500"
                                  collapsed={hubCollapsed.intents}
                                  onToggle={() => toggleHubSection('intents')}
                                  summary={hubSectionSummary.intents}
                                  trailing={<Switch checked={intentsEnabled} onCheckedChange={setIntentsEnabled} />}
                              >
                                  <Card className={cn("bg-sky-500/5 border-sky-500/20 p-3 rounded-xl transition-opacity", !intentsEnabled && "opacity-50 pointer-events-none")}>
                                      <div className="space-y-3">
                                          <div className="flex flex-wrap gap-1.5 max-h-[min(14vh,120px)] overflow-y-auto studio-scrollbar pr-1">
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
                              </HubSectionShell>
                          </div>

                          {/* Column 2 — Creative core + remix tuning */}
                          <div className="flex flex-col gap-5 min-w-0 w-full">
                              <HubSectionShell
                                  title="Creative DNA"
                                  icon={Compass}
                                  colorClass="text-green-500"
                                  collapsed={hubCollapsed.creativeDna}
                                  onToggle={() => toggleHubSection('creativeDna')}
                                  summary={hubSectionSummary.creativeDna}
                                  trailing={
                                      <div className="flex items-center gap-3">
                                          {!isLooseTrack && (
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <div className="flex items-center gap-2 cursor-help">
                                                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Inherit Album</span>
                                                      <Switch checked={inheritAlbum} onCheckedChange={setInheritAlbum} />
                                                  </div>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom" className="max-w-[220px] text-[10px] leading-snug">
                                                  {DNA_HUB_TOOLTIPS.inheritAlbum}
                                              </TooltipContent>
                                          </Tooltip>
                                          )}
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <div className="flex items-center gap-2 cursor-help">
                                                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Track DNA</span>
                                                      <Switch checked={inheritTrack} onCheckedChange={setInheritTrack} />
                                                  </div>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom" className="max-w-[220px] text-[10px] leading-snug">
                                                  {DNA_HUB_TOOLTIPS.inheritTrack}
                                              </TooltipContent>
                                          </Tooltip>
                                      </div>
                                  }
                              >
                              <Card className="bg-green-500/5 border-green-500/20 p-4 rounded-xl shadow-2xl w-full min-w-0">
                                  <div className="space-y-3 w-full min-w-0">
                                      {[
                                        { id: 'setting_world', label: '1. Setting / World', placeholder: 'e.g. A rainy midnight in 1940s Chicago...' },
                                        { id: 'emotion_core', label: '2. Emotion / Core', placeholder: 'e.g. Bitter betrayal mixed with a sense of relief...' },
                                        { id: 'trigger_moment', label: '3. Trigger Moment', placeholder: 'e.g. When the final letter was signed in blood...' },
                                        { id: 'message_truth', label: '4. Message / Truth', placeholder: 'e.g. Loyalty is a luxury no one can afford...' },
                                        { id: 'tone_palette', label: '5. Tone / Palette', placeholder: 'e.g. Gritty, neon-drenched, smoky textures...' }
                                      ].map(f => (
                                          <div key={f.id} className="space-y-1.5 w-full min-w-0">
                                              <Label className="text-[9px] font-bold uppercase tracking-widest text-green-700/80">{f.label}</Label>
                                              <HubCreativeDnaTextarea
                                                  placeholder={f.placeholder}
                                                  value={(hubDirection[f.id as keyof Direction] as string) || ''}
                                                  onChange={(next) => setHubDirection(prev => ({ ...prev, [f.id]: next }))}
                                              />
                                          </div>
                                      ))}
                                  </div>
                              </Card>
                              </HubSectionShell>

                              <HubSectionShell
                                  title="Special Instructions"
                                  icon={MessageSquareQuote}
                                  colorClass="text-primary"
                                  collapsed={hubCollapsed.specialInstructions}
                                  onToggle={() => toggleHubSection('specialInstructions')}
                                  summary={hubSectionSummary.specialInstructions}
                              >
                                  <Card className="bg-primary/5 border-primary/20 p-4 rounded-xl">
                                      <Label className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-2 block">What do you want this song or remix to do?</Label>
                                      <Textarea 
                                          placeholder="e.g. Alternate braggadocio and vulnerability, use ocean imagery, keep hooks under 8 syllables, no filler ad-libs…" 
                                          className="bg-background/40 border-primary/10 min-h-[5rem] h-24 text-xs font-code p-3 resize-none" 
                                          value={lyricsAbout}
                                          onChange={(e) => {
                                              setLyricsAbout(e.target.value);
                                              if (e.target.value.trim()) markHubSeeded('specialInstructions');
                                          }}
                                      />
                                      <p className="text-[9px] text-muted-foreground mt-2 leading-snug italic">Direct creative brief — synthesis treats this as a core anchor alongside DNA strains and remix paths.</p>
                                  </Card>
                              </HubSectionShell>

                              {wizardState.selectedDirections.length > 0 && (
                                  <HubSectionShell
                                      title="Remix Directions"
                                      icon={GitBranch}
                                      colorClass="text-primary"
                                      collapsed={hubCollapsed.remix}
                                      onToggle={() => toggleHubSection('remix')}
                                      summary={hubSectionSummary.remix}
                                  >
                                      <Card className="bg-primary/5 border-primary/20 p-4 rounded-xl space-y-3">
                                          <div className="flex flex-wrap gap-1.5">
                                              {wizardState.selectedDirections.map(d => (
                                                  <Badge key={d.name} variant="outline" className="text-[9px] uppercase border-primary/30 text-primary py-0.5 px-2">{d.name} · {d.weight ?? 50}%</Badge>
                                              ))}
                                          </div>
                                          {renderRemixWeightControls(true)}
                                      </Card>
                                  </HubSectionShell>
                              )}
                          </div>

                          {/* Column 3 — Strains, style, guardrails */}
                          <div className="flex flex-col gap-5 min-w-0">
                              <HubSectionShell
                                  title="DNA Strains"
                                  icon={Dna}
                                  colorClass="text-primary"
                                  collapsed={hubCollapsed.dnaStrains}
                                  onToggle={() => toggleHubSection('dnaStrains')}
                                  summary={wizardState.analysis ? 'Extraction ready' : undefined}
                                  trailing={
                                      <Tabs value={strainTab} onValueChange={(v) => handleStrainTabChange(v as 'insights' | 'presets' | 'vault')} className="w-fit">
                                          <TabsList className="h-8 bg-white/5 border-white/10 p-0.5">
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <TabsTrigger value="insights" className="text-[9px] px-3 font-bold" onClick={() => expandHubSection('dnaStrains')}>INSIGHTS</TabsTrigger>
                                                  </TooltipTrigger>
                                                  <TooltipContent side="bottom" className="max-w-[200px] text-[10px] leading-snug">
                                                      {DNA_HUB_TOOLTIPS.vaultInsightsTab}
                                                  </TooltipContent>
                                              </Tooltip>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <TabsTrigger value="presets" className="text-[9px] px-3 font-bold" onClick={() => expandHubSection('dnaStrains')}>PRESETS</TabsTrigger>
                                                  </TooltipTrigger>
                                                  <TooltipContent side="bottom" className="max-w-[200px] text-[10px] leading-snug">
                                                      {DNA_HUB_TOOLTIPS.vaultPresetsTab}
                                                  </TooltipContent>
                                              </Tooltip>
                                              {isPro ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TabsTrigger value="vault" className="text-[9px] px-3 font-bold" onClick={() => expandHubSection('dnaStrains')}>VAULT</TabsTrigger>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="max-w-[200px] text-[10px] leading-snug">
                                                        {DNA_HUB_TOOLTIPS.vaultVaultTab}
                                                    </TooltipContent>
                                                </Tooltip>
                                              ) : (
                                                <UpgradeTooltip
                                                  feature="DNA Strains Vault"
                                                  benefit="Save and reload your custom DNA profiles across any track in your catalog."
                                                  example="Save an extraction once, then load it into every remix without re-analyzing."
                                                >
                                                  <TabsTrigger
                                                    value="vault"
                                                    disabled
                                                    className="text-[9px] px-3 font-bold cursor-not-allowed border border-dashed border-pink-500/35"
                                                    onClick={(e) => e.preventDefault()}
                                                  >
                                                    VAULT
                                                  </TabsTrigger>
                                                </UpgradeTooltip>
                                              )}
                                          </TabsList>
                                      </Tabs>
                                  }
                              >
                                  <Card className="bg-primary/5 border-primary/20 p-3 rounded-xl shadow-inner min-h-0">
                                      <div className="max-h-[min(52vh,520px)] overflow-y-auto studio-scrollbar pr-2">
                                          {strainTab === 'insights' ? (
                                              wizardState.analysis ? (
                                                  renderAnalysisStrainLayout(wizardState.analysis, 'sidebar')
                                              ) : (
                                                  <div className="h-[180px] flex flex-col items-center justify-center text-center p-6 gap-4 border-2 border-dashed border-white/5 rounded-lg">
                                                      <BrainCircuit className="h-10 w-10 text-muted-foreground/20" />
                                                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-4">No recent DNA extracted.</p>
                                                  </div>
                                              )
                                          ) : strainTab === 'presets' ? (
                                              renderHubDnaPresetList(SYSTEM_DNA_PRESETS as DnaPreset[], { deletable: false, keyPrefix: 'sys' })
                                          ) : !isPro ? (
                                              <div className={cn('flex flex-col items-center justify-center text-center p-8 gap-3 border-2 border-dashed rounded-lg min-h-[180px]', proLockShell('md'))}>
                                                <Lock className={proLockIcon('h-8 w-8')} />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">DNA Strains Vault — Studio Pro</p>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[240px]">
                                                  Saving custom profiles is Pro-only. Use <strong className="text-foreground">Presets</strong> or <strong className="text-foreground">Insights</strong> and tap <Zap className="inline h-3 w-3 text-primary align-[-2px]" /> to inject strains.
                                                </p>
                                                <ProLockBadge label="Pro" />
                                              </div>
                                          ) : (
                                              renderHubDnaPresetList(album?.dnaPresets ?? [], { deletable: true, keyPrefix: 'vault' })
                                          )}
                                      </div>
                                  </Card>
                              </HubSectionShell>

                              <HubSectionShell
                                  title="Style DNA"
                                  icon={Fingerprint}
                                  colorClass="text-fuchsia-500"
                                  collapsed={hubCollapsed.style}
                                  onToggle={() => toggleHubSection('style')}
                                  summary={hubSectionSummary.style}
                                  trailing={
                                      <div className="flex items-center gap-2">
                                        <Switch checked={hubStyleEnabled} onCheckedChange={setHubStyleEnabled} />
                                        <Tabs value={styleTab} onValueChange={(v) => handleStyleTabChange(v as 'current' | 'presets' | 'vault')} className="w-fit">
                                          <TabsList className="h-8 bg-white/5 border-white/10 p-0.5">
                                              <TabsTrigger value="current" className="text-[9px] px-3 font-bold" onClick={() => expandHubSection('style')}>LATEST</TabsTrigger>
                                              <TabsTrigger value="presets" className="text-[9px] px-3 font-bold" onClick={() => expandHubSection('style')}>PRESETS</TabsTrigger>
                                              {isPro ? (
                                                <TabsTrigger value="vault" className="text-[9px] px-3 font-bold" onClick={() => expandHubSection('style')}>VAULT</TabsTrigger>
                                              ) : (
                                                <UpgradeTooltip
                                                  feature="Style DNA Vault"
                                                  benefit="Save cadence and vocabulary profiles to reuse across tracks."
                                                  example="Save your flow DNA once and load it into every new draft."
                                                >
                                                  <TabsTrigger
                                                    value="vault"
                                                    disabled
                                                    className="text-[9px] px-3 font-bold cursor-not-allowed border border-dashed border-pink-500/35"
                                                    onClick={(e) => e.preventDefault()}
                                                  >
                                                    VAULT
                                                  </TabsTrigger>
                                                </UpgradeTooltip>
                                              )}
                                          </TabsList>
                                        </Tabs>
                                      </div>
                                  }
                              >
                                  <Card className={cn("bg-fuchsia-500/5 border-fuchsia-500/20 p-3 rounded-xl shadow-inner transition-opacity", !hubStyleEnabled && "opacity-50 pointer-events-none")}>
                                          {styleTab === 'current' ? (
                                              <div className="p-3 bg-background/40 border border-fuchsia-500/10 rounded-lg space-y-3">
                                                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-fuchsia-700">
                                                      <span>Active Profiling</span>
                                                      {isPro ? (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSaveStyleNamingOpen(true)}><Save className="h-3.5 w-3.5" /></Button>
                                                      ) : (
                                                        <LockedSaveButton feature="Style DNA Save" benefit="Save cadence and vocabulary profiles to your vault." size="sm" icon={Save} iconClassName="text-fuchsia-500" className="h-7 w-7 text-fuchsia-500 hover:bg-fuchsia-500/10" />
                                                      )}
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                      <div className="space-y-1">
                                                          <div className="flex justify-between text-[10px] font-bold uppercase"><span>Vocab</span><span>{hubStyleMetrics.vocabularyScore}%</span></div>
                                                          <Progress value={hubStyleMetrics.vocabularyScore} className="h-1.5 bg-fuchsia-500/10" />
                                                      </div>
                                                      <div className="space-y-1.5 rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/10 p-2 ring-1 ring-fuchsia-400/25 shadow-[0_0_18px_rgba(217,70,239,0.12)]">
                                                          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-fuchsia-200">
                                                            <span className="flex items-center gap-1.5">
                                                              <Waves className="h-3 w-3 text-fuchsia-400 animate-pulse shrink-0" />
                                                              Rhyme Pulse
                                                            </span>
                                                            <span>{hubStyleMetrics.rhymeComplexity}%</span>
                                                          </div>
                                                          <Progress value={hubStyleMetrics.rhymeComplexity} className="h-1.5 bg-fuchsia-500/10 [&>div]:bg-fuchsia-400" />
                                                      </div>
                                                  </div>
                                                  <p className="text-[10px] font-bold uppercase text-fuchsia-500/80">Cadence: {hubStyleMetrics.cadenceMap}</p>
                                                  <p className="text-xs text-foreground/90 italic leading-relaxed whitespace-pre-wrap break-words">"{hubStyleAnalysis || 'No style extracted yet — run DNA extraction or load a preset.'}"</p>
                                              </div>
                                          ) : styleTab === 'presets' ? (
                                              <div className="space-y-2 max-h-[min(18vh,160px)] overflow-y-auto studio-scrollbar pr-1">
                                                  {SYSTEM_STYLE_PRESETS.map((s, i) => (
                                                      <Card key={i} className="bg-background/40 border-white/5 p-2.5 flex items-center justify-between shadow-lg">
                                                          <div className="min-w-0">
                                                              <p className="text-xs font-bold text-fuchsia-400 truncate uppercase">{s.name}</p>
                                                              <p className="text-[10px] text-muted-foreground uppercase">{s.metrics.cadenceMap}</p>
                                                          </div>
                                                          <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-fuchsia-400 shrink-0"
                                                            onClick={() => {
                                                              setHubStyleAnalysis(s.analysis);
                                                              setHubStyleMetrics(s.metrics);
                                                              setHubStyleEnabled(true);
                                                              markHubSeeded('style');
                                                              toast({ title: 'Style preset loaded' });
                                                            }}
                                                          >
                                                            <RefreshCw className="h-3 w-3" />
                                                          </Button>
                                                      </Card>
                                                  ))}
                                              </div>
                                          ) : !isPro ? (
                                              <div className={cn('flex flex-col items-center justify-center text-center p-6 gap-3 border-2 border-dashed rounded-lg min-h-[120px]', proLockShell('md'))}>
                                                <Lock className={proLockIcon('h-7 w-7')} />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Style DNA Vault — Studio Pro</p>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[220px]">
                                                  Use <strong className="text-foreground">Presets</strong> or <strong className="text-foreground">Latest</strong> for this draft. Saving custom profiles requires Pro.
                                                </p>
                                                <ProLockBadge label="Pro" />
                                              </div>
                                          ) : (
                                              <div className="space-y-2 max-h-[min(18vh,160px)] overflow-y-auto studio-scrollbar pr-1">
                                                  {album?.stylePresets && album.stylePresets.length > 0 ? album.stylePresets.map((s, i) => (
                                                      <Card key={i} className="bg-background/40 border-white/5 p-2.5 flex items-center justify-between shadow-lg">
                                                          <div className="min-w-0">
                                                              <p className="text-xs font-bold text-fuchsia-400 truncate uppercase">{s.name}</p>
                                                              <p className="text-[10px] text-muted-foreground uppercase">{s.metrics.cadenceMap}</p>
                                                          </div>
                                                          <div className="flex items-center gap-2">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/40 hover:text-red-500" onClick={() => { updateAlbum(album.id, { stylePresets: album.stylePresets?.filter((_, idx) => idx !== i) }); toast({ title: "Style DNA Erased" }); }}><Trash2 className="h-3 w-3" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-fuchsia-400" onClick={() => { setHubStyleAnalysis(s.analysis); setHubStyleMetrics(s.metrics); markHubSeeded('style'); }}><RefreshCw className="h-3 w-3" /></Button>
                                                          </div>
                                                      </Card>
                                                  )) : <p className="text-center text-xs uppercase opacity-40 py-6">No style profiles saved.</p>}
                                              </div>
                                          )}
                                  </Card>
                              </HubSectionShell>

                              <HubSectionShell
                                  title="Guardrails"
                                  icon={Shield}
                                  colorClass="text-rose-500"
                                  collapsed={hubCollapsed.guardrails}
                                  onToggle={() => toggleHubSection('guardrails')}
                                  summary={hubSectionSummary.guardrails}
                                  trailing={<Switch checked={enableGuardrails} onCheckedChange={setEnableGuardrails} />}
                              >
                                  <Card className={cn("bg-rose-500/5 border-rose-500/20 p-3 rounded-xl space-y-3 transition-opacity", !enableGuardrails && "opacity-50 pointer-events-none")}>
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
                              </HubSectionShell>
                          </div>
                      </div>
                  </div>
              </ScrollArea>
              </div>
          )}

          {step === 1 && (
            <div className="flex flex-col h-full min-h-0 p-4 sm:p-6 md:p-8 gap-3 sm:gap-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-sky-500/10 to-transparent" aria-hidden />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <h3 className="text-lg sm:text-xl font-headline font-bold uppercase flex items-center gap-2 text-primary">
                      <NotebookPen className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"/> Seed DNA & REMIX
                    </h3>
                    <div className="flex items-center gap-3 bg-primary/5 px-3 sm:px-4 py-2 rounded-lg border border-primary/20 self-start sm:self-auto">
                        <Label htmlFor="sync-lyrics" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary/80">Sync Current Lyrics</Label>
                        <Switch id="sync-lyrics" checked={syncLyricsToggle} onCheckedChange={setSyncLyricsToggle} />
                    </div>
                </div>

                <div className="relative flex flex-1 min-h-0 flex-col md:flex-row rounded-xl border-2 border-primary/25 overflow-hidden bg-background/30 shadow-[inset_0_0_60px_rgba(56,189,248,0.04)]">
                  <Textarea
                    placeholder="Paste lyrics or rough notes to extract analytical strains..."
                    className="flex-1 min-h-[200px] md:min-h-0 font-code text-sm sm:text-base md:text-lg bg-background/40 border-0 rounded-none p-4 sm:p-5 md:p-6 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 md:max-w-[58%] lg:max-w-[55%]"
                    value={wizardState.lyrics}
                    onChange={(e) => {
                        setSyncLyricsToggle(false);
                        setWizardState(prev => ({ ...prev, lyrics: e.target.value }));
                    }}
                  />
                  <div className="hidden md:flex flex-1 min-w-[240px] max-w-[44%] border-l border-primary/20">
                    <DnaSeedExtractPanel lyrics={wizardState.lyrics} className="w-full" />
                  </div>
                </div>

                <div className="md:hidden shrink-0 h-[min(28vh,200px)] min-h-[140px] rounded-xl border border-primary/20 overflow-hidden">
                  <DnaSeedExtractPanel lyrics={wizardState.lyrics} className="w-full h-full" compact />
                </div>

                <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/20 border border-white/5 rounded-lg shrink-0">
                    <Checkbox id="rc" checked={permissionChecked} onCheckedChange={(c) => setPermissionChecked(!!c)} />
                    <Label htmlFor="rc" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest cursor-pointer text-foreground/70 leading-snug">I have clearance to utilize these lyrical assets.</Label>
                </div>
            </div>
          )}

          {step === 2 && wizardState.analysis && (
            <ScrollArea className="flex-grow p-8 studio-scrollbar relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-emerald-500/10 to-transparent" aria-hidden />
                <div className="relative max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 text-foreground pb-12">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-primary/10 p-4 rounded-xl border border-primary/20">
                        <div className="flex items-start gap-3 text-primary min-w-0">
                            <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
                            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide leading-relaxed">
                              Your lyrics, decoded. Tap <Zap className="inline h-3.5 w-3.5 align-[-2px] mx-0.5" /> on any strain to load it into this remix — then hit Define Paths.
                              {!isPro && (
                                <span className="block mt-1 text-[10px] font-code normal-case tracking-normal text-primary/80">
                                  Saving to your vault is Pro-only; everything here still works for this DNA / remix session.
                                </span>
                              )}
                            </p>
                        </div>
                        {isPro ? (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="default" size="sm" className="font-bold uppercase text-[10px] h-9 px-6 shadow-lg gap-2 shrink-0" onClick={() => setSaveNamingOpen(true)}>
                                    <Save className="h-4 w-4" /> Save DNA Profile
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[240px] text-[10px] leading-snug">
                                  {DNA_HUB_TOOLTIPS.saveDnaProfile}
                              </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline" className="text-[8px] uppercase border-primary/30 text-primary shrink-0 self-start sm:self-center">
                            Save to vault — Pro
                          </Badge>
                        )}
                    </div>
                    {renderAnalysisStrainLayout(wizardState.analysis)}
                </div>
            </ScrollArea>
          )}

          {step === 3 && (
            <div className="flex flex-col h-full px-4 pt-3 pb-2 gap-2 animate-in fade-in slide-in-from-bottom-8 relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/12 via-violet-500/5 to-transparent" aria-hidden />
                <div className="relative flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0 text-center sm:text-left">
                        <h2 className="text-lg font-headline font-bold text-primary uppercase leading-none">Choose Path</h2>
                        <p className="mt-1 text-[9px] text-muted-foreground uppercase tracking-[0.18em] leading-tight">Optional — select remix paths or skip straight to calibration.</p>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                              onClick={(e) => handleRelayAnalyze(wizardState.lyrics, e)}
                              disabled={isGenerating}
                              className="mx-auto shrink-0 text-[9px] font-bold uppercase tracking-widest text-primary/50 hover:text-primary border border-primary/10 hover:border-primary/40 rounded-full px-3 py-1 transition-all sm:mx-0"
                            >
                              ↻ Re-Matrix Ideas
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[220px] text-[10px] leading-snug">
                            {DNA_HUB_TOOLTIPS.reMatrixIdeas} Costs {getEffectiveCost('analyzeRelayAssets')} Ink.
                        </TooltipContent>
                    </Tooltip>
                </div>
                <ScrollArea className="relative flex-grow min-h-0 border border-white/10 rounded-xl bg-black/40 studio-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {(wizardState.directions || []).map((dir, idx) => {
                            const isSelected = wizardState.selectedDirections.some(d => d.name === dir.name);
                            return (
                                <Card 
                                    key={idx} 
                                    className={cn(
                                        "p-8 border-2 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between min-h-72 h-auto shadow-xl overflow-visible", 
                                        isSelected ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "border-border/50 bg-card hover:bg-white/5"
                                    )} 
                                    onClick={() => toggleRemixDirection(dir)}
                                >
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold uppercase text-primary tracking-[0.2em]">{dir.name}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed font-code">{dir.description}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="pt-4 space-y-3">
                                            <div className="flex justify-end"><CheckCircle2 className="h-6 w-6 text-primary" /></div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="text-[8px] font-bold uppercase text-primary cursor-help">Influence</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-[220px] text-[10px] leading-snug">
                                                            {DNA_HUB_TOOLTIPS.remixInfluence}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <span className="text-[8px] font-mono text-muted-foreground">
                                                        {wizardState.selectedDirections.find((d) => d.name === dir.name)?.weight ?? 50}%
                                                    </span>
                                                </div>
                                                <Slider
                                                    value={[wizardState.selectedDirections.find((d) => d.name === dir.name)?.weight ?? 50]}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    onValueChange={([v]) => updateRemixWeight(dir.name, v)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
          )}

          {step === 5 && wizardState.generatedVariant && (
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden lg:flex-row items-stretch animate-in fade-in slide-in-from-bottom-8 relative isolate">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-orange-500/6" aria-hidden />
                  <div className="relative shrink-0 lg:flex-1 lg:min-h-0 lg:min-w-0 flex flex-col order-1 lg:order-none py-3 px-2 sm:py-6 sm:px-4 z-[1]">
                      <Card className="w-full lg:flex-1 lg:min-h-0 border-2 shadow-2xl relative overflow-hidden bg-notebook-hub">
                        <style>{`
                            .bg-notebook-hub {
                                background-image: 
                                    linear-gradient(90deg, transparent 100px, rgba(255, 0, 0, 0.2) 100px, rgba(255, 0, 0, 0.2) 101px, transparent 101px),
                                    repeating-linear-gradient(transparent, transparent 31px, rgba(255, 255, 255, 0.05) 31px, rgba(255, 255, 255, 0.05) 32px);
                                background-size: 100% 32px;
                                background-color: #0c0c0c;
                                background-attachment: local;
                            }
                            @media (max-width: 639px) {
                                .bg-notebook-hub {
                                    background-image: 
                                        linear-gradient(90deg, transparent 2.75rem, rgba(255, 0, 0, 0.2) 2.75rem, rgba(255, 0, 0, 0.2) calc(2.75rem + 1px), transparent calc(2.75rem + 1px)),
                                        repeating-linear-gradient(transparent, transparent 31px, rgba(255, 255, 255, 0.05) 31px, rgba(255, 255, 255, 0.05) 32px);
                                }
                            }
                        `}</style>
                        <div className="max-h-[min(40vh,360px)] lg:max-h-none lg:h-full overflow-y-auto overflow-x-hidden studio-scrollbar overscroll-contain">
                            {previewRhymeGroups.length > 0 && (
                              <div className="mx-3 mt-3 sm:mx-6 sm:mt-4 flex items-center gap-2 rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-fuchsia-200">
                                <Waves className="h-3.5 w-3.5 text-fuchsia-400 animate-pulse shrink-0" />
                                Rhyme Pulse highlights active on this preview
                              </div>
                            )}
                            <div className="p-3 pt-4 sm:p-6 sm:pb-8 pb-6">
                                {wizardState.generatedVariant.sections.map((s, idx) => (
                                    <div key={idx} className="relative">
                                        <div
                                            className="flex items-end pl-[2.75rem] sm:pl-[120px]"
                                            style={{ height: '64px' }}
                                        >
                                            <h4 className="text-sm sm:text-xl font-headline font-bold text-sky-400 uppercase leading-none">[{s.name}]</h4>
                                        </div>
                                        <div className="space-y-0">
                                            {s.bars.map((line, lIdx) => (
                                                <div key={lIdx} className="relative group flex items-start min-h-[32px]">
                                                    <span className="absolute left-0 sm:left-[50px] font-mono text-muted-foreground/25 w-9 sm:w-10 text-right font-bold text-[9px] sm:text-[10px] leading-[32px]">{String(lIdx + 1).padStart(2, '0')}</span>
                                                    <div className="flex-grow flex items-start min-w-0 h-full relative overflow-hidden pl-[2.75rem] sm:pl-[145px]">
                                                        <p className="font-code font-bold text-[17px] sm:text-[22px] md:text-[24px] leading-[32px] tracking-tight text-white/90 whitespace-pre-wrap break-words w-full sm:-indent-[25px]">
                                                            <HighlightedText text={line} rhymeGroups={previewRhymeGroups} />
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                      </Card>
                  </div>
                  <div className="relative w-full lg:w-[340px] shrink-0 order-2 lg:order-none lg:min-h-0 p-3 sm:p-6 space-y-4 sm:space-y-6 bg-black/50 border-t lg:border-t-0 lg:border-l border-white/10 lg:overflow-y-auto studio-scrollbar z-[2]">
                      {approvalDraftHistory.length > 0 && (
                        <div className="space-y-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                            <Clock className="h-3 w-3 shrink-0" /> Session draft history
                          </p>
                          <p className="text-[8px] text-muted-foreground font-code leading-snug">
                            Earlier outputs from this remix run. Restore to preview — no extra Ink.
                          </p>
                          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto studio-scrollbar pr-0.5">
                            {approvalDraftHistory.map((snap, idx) => {
                              const isActive =
                                wizardState.generatedVariant &&
                                variantsMatch(wizardState.generatedVariant, snap.variant);
                              return (
                                <button
                                  key={snap.id}
                                  type="button"
                                  onClick={() => restoreApprovalDraft(snap.id)}
                                  className={cn(
                                    'w-full text-left rounded-md border px-2.5 py-2 transition-colors',
                                    isActive
                                      ? 'border-primary/50 bg-primary/10'
                                      : 'border-white/10 bg-black/30 hover:border-primary/35 hover:bg-primary/5'
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] font-bold uppercase text-white">
                                      Draft {approvalDraftHistory.length - idx}
                                    </span>
                                    <span className="text-[8px] font-mono text-muted-foreground shrink-0">
                                      {format(new Date(snap.savedAt), 'h:mm a')}
                                    </span>
                                  </div>
                                  <p className="text-[8px] text-muted-foreground mt-0.5">
                                    {snap.barCount} bars · {snap.settingsSummary.slice(0, 3).join(' · ') || 'Default mix'}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

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

                          {inheritAlbum && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-teal-500/5 border border-teal-500/15">
                                  <p className="text-[9px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5"><Compass className="h-3 w-3" /> Inherit Album</p>
                                  {hasDirectionContent(album?.direction) ? (
                                    <div className="space-y-1 mt-1">
                                        {album?.direction?.setting_world && <p className="text-[11px] text-white/50 leading-tight">• Setting: {album.direction.setting_world}</p>}
                                        {album?.direction?.emotion_core && <p className="text-[11px] text-white/50 leading-tight">• Core: {album.direction.emotion_core}</p>}
                                        {album?.direction?.message_truth && <p className="text-[11px] text-white/50 leading-tight">• Truth: {album.direction.message_truth}</p>}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-white/35 italic">Album direction will layer in when set on the album.</p>
                                  )}
                              </div>
                          )}

                          {inheritTrack && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-green-500/5 border border-green-500/15">
                                  <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1.5"><Compass className="h-3 w-3" /> Track DNA</p>
                                  <div className="space-y-1 mt-1">
                                      {hubDirection.setting_world && <p className="text-[11px] text-white/50 leading-tight">• Setting: {hubDirection.setting_world}</p>}
                                      {hubDirection.emotion_core && <p className="text-[11px] text-white/50 leading-tight">• Core: {hubDirection.emotion_core}</p>}
                                      {hubDirection.message_truth && <p className="text-[11px] text-white/50 leading-tight">• Truth: {hubDirection.message_truth}</p>}
                                      {!hasDirectionContent(hubDirection) && (
                                        <p className="text-[10px] text-white/35 italic">Track fields empty — add Creative DNA below or load a preset.</p>
                                      )}
                                  </div>
                              </div>
                          )}

                          {/* Receipt: Remix Paths */}
                          {wizardState.selectedDirections.length > 0 && (
                              <div className="space-y-1.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5"><GitBranch className="h-3 w-3" /> Selected Paths</p>
                                  <div className="flex flex-col gap-1.5 mt-1 min-w-0">
                                      {wizardState.selectedDirections.map((d) => (
                                        <div
                                          key={d.name}
                                          className="w-full min-w-0 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[9px] font-bold text-primary leading-snug break-words"
                                        >
                                          <span className="block break-words">{d.name}</span>
                                          <span className="mt-0.5 block font-mono text-[8px] font-normal text-primary/55">
                                            {d.weight ?? 50}% influence
                                          </span>
                                        </div>
                                      ))}
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
                                  <div className="flex flex-col gap-1.5 mt-1 min-w-0">
                                      {hubIntents.map((i) => (
                                        <div
                                          key={i}
                                          className="w-full min-w-0 rounded-md border border-sky-500/30 bg-sky-500/5 px-2 py-1.5 text-[9px] font-bold text-sky-400 leading-snug break-words"
                                        >
                                          {i}
                                        </div>
                                      ))}
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

                      <div className="hidden lg:block pt-6 border-t border-white/5 space-y-4">
                        <Card className="border-primary/30 bg-primary/5 p-4 space-y-3">
                            <CardTitle className="text-[10px] font-bold uppercase text-primary flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Apply Draft</CardTitle>
                            <p className="text-[9px] text-muted-foreground leading-relaxed">
                              Append adds all generated sections to the bottom of your current sheet. Replace clears existing lyrics and uses this draft only.
                            </p>
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-9 text-[9px] font-bold uppercase border-primary/30 text-primary justify-start gap-2"
                                onClick={() => handleApplyGeneratedDraft('append')}
                              >
                                <PlusCircle className="h-3.5 w-3.5 shrink-0" /> Add to Current Page
                              </Button>
                              <Button
                                size="sm"
                                className="w-full h-9 text-[9px] font-bold uppercase bg-primary text-white justify-start gap-2"
                                onClick={() => handleApplyGeneratedDraft('replace')}
                              >
                                <Replace className="h-3.5 w-3.5 shrink-0" /> Replace Current Lyrics
                              </Button>
                            </div>
                        </Card>
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

        {(step === 1 || step === 2 || step === 3 || step === 5 || step === 10) && !isGenerating && (
        <div className="shrink-0 flex flex-col p-3 sm:p-4 border-t border-white/5 bg-[#050505] gap-3 relative z-[60] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 min-w-0 w-full sm:w-auto">
                  {(step === 1 || step === 10) && (
                    <div className="flex items-center gap-2.5 bg-primary/10 px-4 sm:px-6 py-1.5 rounded-full border border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] self-start shrink-0">
                        <Droplets className={cn("h-4 w-4 text-primary shrink-0", isGenerating && "animate-pulse")} />
                        <span className="text-xs sm:text-sm font-bold uppercase font-code text-primary tracking-tight whitespace-nowrap">COST: {Math.round(step === 1 ? getEffectiveCost('analyzeRelayAssets') : activeDraftCharged)} INK</span>
                    </div>
                  )}
                  {step === 10 && (
                      <div className="flex flex-wrap gap-1.5 max-w-full sm:max-w-2xl sm:ml-4">
                          {activeBadges.map((b, i) => <Badge key={i} variant="outline" className={cn("text-[8px] font-bold uppercase py-0.5 px-2 bg-background/40", b.color, b.text === 'VIBE' && "animate-pulse")}>{b.text}</Badge>)}
                      </div>
                  )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto sm:justify-end shrink-0 min-w-0">
                  {step === 1 && <Button className="w-full sm:w-auto sm:min-w-[300px] px-6 sm:px-12 h-12 sm:h-14 font-bold text-base sm:text-xl rounded-full shadow-lg" disabled={!wizardState.lyrics.trim() || !permissionChecked || isGenerating} onClick={(e) => handleRelayAnalyze(wizardState.lyrics, e)} title={tooltip('analyzeRelayAssets')}>{buttonLabel('analyzeRelayAssets')}</Button>}
                  {step === 2 && <Button size="lg" className="w-full sm:w-auto sm:min-w-[300px] px-6 sm:px-12 h-12 sm:h-14 font-bold text-base sm:text-xl rounded-full shadow-lg" onClick={() => setStep(3)}>Define Paths <ChevronRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" /></Button>}
                  {step === 3 && (
                    <Button size="lg" className="w-full sm:w-auto sm:min-w-[300px] px-6 sm:px-12 h-12 sm:h-14 text-base sm:text-xl font-bold rounded-full shadow-lg bg-primary text-white" onClick={() => setStep(10)}>
                      Review & Calibrate <ChevronRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                  )}
                  {step === 10 && (
                      <Button onClick={(e) => wizardState.analysis ? handleRelayDraftSynthesis(e) : handleFullDraftGenerate(e)} disabled={isGenerating} size="lg" className="w-full sm:w-auto sm:min-w-[380px] max-w-full px-4 sm:px-14 h-12 sm:h-16 text-sm sm:text-2xl font-bold rounded-xl bg-primary text-white gap-2 sm:gap-4 shadow-[0_0_40px_rgba(59,130,246,0.3)]" title={wizardState.analysis ? tooltip('generateRelayDraft', activeDraftBase) : tooltip('generateDraftPerBar', activeDraftBase)}>
                          <Wand2 className="h-5 w-5 sm:h-7 sm:w-7 shrink-0" /> 
                          <span className="truncate sm:whitespace-normal">
                            {wizardState.analysis ? (
                              <>
                                <span className="sm:hidden">Synthesize ({activeDraftCharged} Ink)</span>
                                <span className="hidden sm:inline">Synthesize DNA Remix ({activeDraftCharged} Ink)</span>
                              </>
                            ) : (
                              <>
                                <span className="sm:hidden">Generate ({activeDraftCharged} Ink)</span>
                                <span className="hidden sm:inline">Generate Studio Draft ({activeDraftCharged} Ink)</span>
                              </>
                            )}
                          </span>
                      </Button>
                  )}
                  {step === 5 && (
                      <div className="flex flex-col sm:flex-row w-full gap-2 sm:gap-3 max-w-3xl">
                          <Button variant="outline" size="lg" className="w-full sm:flex-1 h-11 sm:h-14 text-xs sm:text-sm font-bold rounded-full" onClick={() => setStep(10)}><RefreshCw className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> Re-Calibrate</Button>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="outline" size="lg" className="w-full sm:flex-1 h-11 sm:h-14 text-xs sm:text-sm font-bold rounded-full border-primary/40 text-primary" onClick={() => handleApplyGeneratedDraft('append')}><PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> Add to Page</Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px] text-[10px] leading-snug">{DNA_HUB_TOOLTIPS.approvalAppend}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button size="lg" className="w-full sm:flex-1 h-11 sm:h-14 text-xs sm:text-sm font-bold rounded-full bg-primary text-white shadow-lg" onClick={() => handleApplyGeneratedDraft('replace')}><Replace className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> Replace Sheet</Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px] text-[10px] leading-snug">{DNA_HUB_TOOLTIPS.approvalReplace}</TooltipContent>
                          </Tooltip>
                      </div>
                  )}
              </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={remixSeedBackConfirmOpen} onOpenChange={setRemixSeedBackConfirmOpen}>
      <DialogContent
        overlayClassName="z-[2195] bg-black/85"
        className="z-[2200] sm:max-w-md bg-card border-2 border-amber-500/30"
      >
        <DialogHeader>
          <DialogTitle className="font-headline text-xl uppercase text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Return to Seed DNA?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm font-code leading-relaxed text-left text-muted-foreground space-y-2">
              <p>
                Back to <strong className="text-foreground">Seed DNA &amp; REMIX</strong> — re-extracting costs{' '}
                <strong className="text-primary">{analyzeRelayInkCost} Ink</strong>. Draft history on Approval clears.
              </p>
              {isPro && (
                <p className="text-[11px] text-foreground/75 border border-primary/15 rounded-md px-2.5 py-2 bg-primary/5">
                  Tip: <strong className="text-foreground">Save DNA Profile</strong> (blue button on Analysis) keeps this extraction in your vault.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="font-bold uppercase text-[10px]" onClick={() => setRemixSeedBackConfirmOpen(false)}>
            Stay on Analysis
          </Button>
          <Button className="font-bold uppercase text-[10px] bg-amber-600 hover:bg-amber-500" onClick={confirmReturnToRemixSeed}>
            Go to Seed Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ArchivalNamingDialog
        open={saveNamingOpen}
        onOpenChange={setSaveNamingOpen}
        onConfirm={(name: string) => handleConfirmSaveDNA(name)}
        type="DNA"
        sourceTrackTitle={track.title}
    />
    <ArchivalNamingDialog
        open={saveStyleNamingOpen}
        onOpenChange={setSaveStyleNamingOpen}
        onConfirm={(name: string) => handleConfirmSaveStyle(name)}
        type="Style"
        sourceTrackTitle={track.title}
    />
    </TooltipProvider>
    </>
  );
}
