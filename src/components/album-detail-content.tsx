'use client';

import React, { useState, useTransition, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { StudioLoader } from '@/components/studio-loader';
import type { Album, Track, Direction } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrackLiveIndicators, AlbumLiveIndicators } from '@/components/track-live-indicators';
import {
  ListMusic,
  PlusCircle,
  Trash2,
  FileDown,
  Pencil,
  Upload,
  Loader,
  ChevronLeft,
  Compass,
  MoreVertical,
  ChevronDown,
  CheckCircle2,
  NotebookPen,
  ArrowRightLeft,
  Dna,
  Lock,
  ArrowUp,
  ArrowDown,
  LogOut,
  CassetteTape,
  Move,
  Sparkles,
  ScanLine,
  Save,
  FolderOpen,
  Loader2,
  Disc3,
  Music,
  Search,
  ArrowUpDown,
  SortDesc,
  SortAsc,
  Filter,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { AlbumMotifDebtsPanel } from '@/components/album-motif-debts-panel';
import { ExportDialog } from './export-dialog';
import { AlbumVaultReleasePanel } from '@/components/album-vault-release-panel';
import { TooltipProvider } from './ui/tooltip';
import { DataContext } from '@/context/data-context';
import { useAuth } from '@/hooks/use-auth';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { GUEST_TRY_PATH, isGuestTryAlbumId, isGuestTrySheetEnabled } from '@/lib/guest-try';
import { vaultHref } from '@/lib/scene-home';
import { navigateBackToReleaseCatalog } from '@/lib/release-catalog-navigation';
import { ShareReachStrip } from '@/components/reach/share-reach-strip';
import {
  canUserAddTrack,
  countUserTracks,
  FreeTrackLimitError,
  FREE_TRACK_LIMIT_TOAST,
  isProOrTrial,
  isProUser,
} from '@/lib/subscription';
import {
  getEditableTrackIds,
  isAlbumOverTierLimit,
  isTrackOverTierLimit,
  TIER_LIMIT_LOCKED_TOAST,
  canExportVault,
  EXPORT_PRO_TOAST,
  isDowngradedProVault,
  needsFreeEditableTrackPicker,
} from '@/lib/tier-limits';
import { getAlbumLimitBanner } from '@/lib/free-vault-copy';
import { VisitorVaultBanner } from '@/components/visitor-vault-banner';
import { DowngradeTrackPickerDialog } from '@/components/downgrade-track-picker-dialog';
import { LockedProFeatureButton, ProCreateTrackSlot, proLockText } from '@/components/pro-lock';
import { ArchivalNamingDialog } from '@/components/archival-naming-dialog';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { trackUpgradeClick } from '@/lib/conversion-analytics';
import { format } from 'date-fns';
import { countRhymeBars } from '@/lib/lyrics-units';
import { withAiAuth } from '@/lib/ai-client';
import { lazyExtractAlbumDna } from '@/lib/lazy-ai-flows';
import {
  albumDnaFieldsHaveContent,
  buildAlbumDnaCorpus,
} from '@/lib/album-dna-extract';
import {
  buildDnaPresetFromDirection,
  partitionDnaPresetsBySource,
} from '@/lib/dna-strands';
import type { DnaPreset } from '@/lib/types';
import { AI_COSTS } from '@/lib/costs';
import { inkTooltip } from '@/lib/ink-labels';
import { cn } from '@/lib/utils';
import {
  looseTrackSearchHaystack,
  matchesLooseTrackFilter,
  sortLooseTracks,
  vaultLiveFilterLabels,
  type LooseTrackFilter,
  type LooseTrackSort,
} from '@/lib/track-live-flags';
import {
  studioVaultCard,
  studioVaultCardTitle,
  studioVaultMetricCell,
  studioVaultRowButton,
} from '@/lib/studio-panel-styles';
import { isDataUrl } from '@/lib/cover-art';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import { releaseShareIdOf, releaseStatusOf } from '@/lib/release-management';
import {
  processCoverArtFile,
  COVER_ART_EXPORT_SIZE,
  COVER_ART_MIN_DIMENSION,
} from '@/lib/cover-art';
import { Switch } from '@/components/ui/switch';
import { PressStageControl } from '@/components/press-stage-control';
import { AddBlankSheetsDialog } from '@/components/add-blank-sheets-dialog';
import { AlbumPageAtmosphere } from '@/components/album-page-atmosphere';
import {
  albumTrackSearchHaystack,
  readPressTrackingPref,
  sortAlbumTracks,
  type AlbumTrackSortDir,
  type AlbumTrackSortKey,
} from '@/lib/press-release-tracking';

const ALBUM_SORT_LABELS: Record<AlbumTrackSortKey, string> = {
  manual: 'Album order',
  name: 'Name',
  created: 'Date created',
  updated: 'Last edited',
  progress: '% finished',
};

function shortTrackDate(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : format(date, 'MMM d, yyyy');
}

function CreateTrackDialog({
  open,
  onOpenChange,
  albumId,
  albums,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumId: string;
  albums: Album[];
}) {
    const [title, setTitle] = useState('');
    const [showChoice, setShowChoice] = useState(false);
    const { toast } = useToast();
    const { addTrack } = useContext(DataContext);
    const { user } = useAuth();
    const router = useRouter();

    const handleCreate = async (mode: 'blank' | 'workstation' = 'blank') => {
        if (!user) return;
        if (!canUserAddTrack(albums, user)) {
            const trackCount = countUserTracks(albums);
            trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, {
              limitType: 'track',
              count: trackCount,
            });
            trackUpgradeClick('slot_limit', { limitType: 'track', count: trackCount });
            toast(FREE_TRACK_LIMIT_TOAST);
            onOpenChange(false);
            return;
        }
        try {
            const newTrack: Omit<Track, 'id'> = {
                albumId,
                ownerId: user.id,
                title: title || 'Untitled Track',
                vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'], enabled: false },
                intentRefs: [],
                sections: [{ id: `section-${Date.now()}`, type: 'verse', bars: [{ idx: 1, text: '', accepted: true, syllables: 0, rhymeKey: '?' }] }],
                status: 'in_progress',
                createdAt: new Date().toISOString(),
                pressStage: 'beat',
                direction: {
                  enabled: true,
                  inheritFromAlbum: albumId !== 'unassigned',
                },
            };
            const created = addTrack(albumId, newTrack);
            if (mode === 'workstation') router.push(`/albums/${albumId}/tracks/${created.id}?openGenerator=true`);
            else router.push(`/albums/${albumId}/tracks/${created.id}`);
            onOpenChange(false);
        } catch (e) {
            if (e instanceof FreeTrackLimitError) {
                const trackCount = countUserTracks(albums);
                trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, {
                  limitType: 'track',
                  count: trackCount,
                });
                trackUpgradeClick('slot_limit', { limitType: 'track', count: trackCount });
                toast(FREE_TRACK_LIMIT_TOAST);
            } else {
                toast({ variant: 'destructive', title: 'Creation Failed', description: (e as Error).message });
            }
        } finally {
            setShowChoice(false);
            setTitle('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if(!o) setShowChoice(false); onOpenChange(o); }}>
            <DialogContent className="sm:max-w-md bg-card border-2">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">{showChoice ? 'Workspace Mode' : 'New Lyrical Asset'}</DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight">Initialize a new track within this blueprint.</DialogDescription>
                </DialogHeader>
                {!showChoice ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Track Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midnight Session" className="font-code font-bold" />
                        </div>
                        <Button onClick={() => setShowChoice(true)} disabled={!title.trim()} className="w-full h-12 font-bold">Continue</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
                        <Button
                          variant="outline"
                          className="min-h-[11rem] h-auto w-full min-w-0 whitespace-normal flex flex-col items-center justify-center gap-2.5 p-5 text-center"
                          onClick={() => handleCreate('blank')}
                        >
                            <NotebookPen className="h-8 w-8 text-muted-foreground shrink-0" />
                            <div className="w-full min-w-0 space-y-1.5 px-1">
                              <p className="font-bold uppercase tracking-widest text-xs">Blank Station</p>
                              <p className="text-[10px] font-code text-muted-foreground leading-snug normal-case tracking-normal break-words text-balance">
                                Empty lyrics sheet — write and structure bars yourself.
                              </p>
                            </div>
                        </Button>
                        <Button
                          className="min-h-[11rem] h-auto w-full min-w-0 whitespace-normal flex flex-col items-center justify-center gap-2.5 p-5 text-center bg-primary/5 border-primary/20"
                          onClick={() => handleCreate('workstation')}
                        >
                            <Sparkles className="h-8 w-8 text-primary shrink-0" />
                            <div className="w-full min-w-0 space-y-1.5 px-1">
                              <p className="font-bold uppercase tracking-widest text-xs">Enter Workstation</p>
                              <p className="text-[10px] font-code text-muted-foreground leading-snug normal-case tracking-normal break-words text-balance">
                                Opens DNA &amp; REMIX to generate a full draft, then edit on the sheet.
                              </p>
                            </div>
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function formatPresetSavedAt(iso: string): string {
  try {
    return format(new Date(iso), 'MMM d, yyyy');
  } catch {
    return 'Saved';
  }
}

function AlbumDnaVaultDialog({
  open,
  onOpenChange,
  presets,
  onLoad,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: DnaPreset[];
  onLoad: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const { album: albumEntries, track: trackEntries } = useMemo(
    () => partitionDnaPresetsBySource(presets),
    [presets]
  );
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setConfirmDeleteIdx(null);
  }, [open]);

  const renderSection = (
    title: string,
    hint: string,
    entries: Array<{ preset: DnaPreset; index: number }>,
    empty: string
  ) => (
    <section className="space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-500">{title}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground font-code leading-relaxed">{hint}</p>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-[11px] text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map(({ preset, index }) => (
            <li
              key={`${preset.name}-${preset.createdAt}-${index}`}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{preset.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {preset.sourceTrackTitle ? `${preset.sourceTrackTitle} · ` : ''}
                    {formatPresetSavedAt(preset.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-[10px] font-bold uppercase"
                    onClick={() => onLoad(index)}
                  >
                    Load
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Delete ${preset.name}`}
                    onClick={() => setConfirmDeleteIdx(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-emerald-500/25 bg-card">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl uppercase tracking-tight text-emerald-500">
              Load Album DNA
            </DialogTitle>
            <DialogDescription className="font-code text-[11px] leading-relaxed">
              Album profiles fill World / Emotion / Message from album saves. Track DNA profiles apply those
              same fields from a track you saved earlier. Delete anything you no longer need.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-1">
            {renderSection(
              'Album DNA',
              'Saved from this album’s Extract / Save flow.',
              albumEntries,
              'No album DNA profiles saved yet.'
            )}
            {renderSection(
              'Track DNA',
              'Saved from a track sheet or workstation — apply World / Emotion / Message from that profile.',
              trackEntries,
              'No track DNA profiles in this album vault yet.'
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDeleteIdx !== null}
        onOpenChange={(o) => !o && setConfirmDeleteIdx(null)}
      >
        <AlertDialogContent className="bg-card border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl uppercase text-red-500">
              Delete DNA profile?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-code">
              Remove
              {confirmDeleteIdx != null && presets[confirmDeleteIdx]
                ? ` “${presets[confirmDeleteIdx].name}”`
                : ' this profile'}{' '}
              from this album’s vault. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-bold bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmDeleteIdx != null) onDelete(confirmDeleteIdx);
                setConfirmDeleteIdx(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DNAStrainMixerDialog({ open, onOpenChange, album, onApply }: { open: boolean, onOpenChange: (open: boolean) => void, album: Album, onApply: (dir: Partial<Direction>) => void }) {
    const { user } = useAuth();
    const presets = useMemo(() => album.dnaPresets || [], [album.dnaPresets]);
    const { album: albumEntries, track: trackEntries } = useMemo(
      () => partitionDnaPresetsBySource(presets),
      [presets]
    );
    const [mixedStrains, setMixedStrains] = useState<Partial<Direction>>({});
    const { toast } = useToast();

    useEffect(() => { if (open) setMixedStrains(album.direction || {}); }, [open, album.direction]);

    if (user?.subscriptionStatus !== 'active') {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="bg-card border-2 text-center p-12">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-bold uppercase">Pro Feature Locked</DialogTitle>
                        <DialogDescription className="text-muted-foreground font-code mt-4">Upgrade required to use DNA Strain Mixer.</DialogDescription>
                    </DialogHeader>
                    <Lock className="mx-auto h-12 w-12 text-primary mb-6" />
                    <p className="text-muted-foreground font-code mb-8">DNA Strain Mixing is reserved for Studio Residents. Upgrade to Pro to calibrate your project foundation.</p>
                    <Button onClick={() => window.location.href = '/pricing'}>View Studio Tiers</Button>
                </DialogContent>
            </Dialog>
        );
    }

    const handleSelectStrain = (field: keyof Direction, presetIdx: string) => {
        const preset = presets[parseInt(presetIdx)];
        if (preset) setMixedStrains(prev => ({ ...prev, [field]: preset.mapping[field] }));
    };

    const FIELDS: { id: keyof Direction, label: string }[] = [
        { id: 'setting_world', label: '1. Setting / World' },
        { id: 'emotion_core', label: '2. Emotion / Core' },
        { id: 'trigger_moment', label: '3. Trigger Moment' },
        { id: 'message_truth', label: '4. Message / Truth' },
        { id: 'tone_palette', label: '5. Tone / Palette' }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col bg-card border-2 p-0 overflow-hidden rounded-xl shadow-2xl border-emerald-500/20">
                <DialogHeader className="p-8 pb-4 border-b shrink-0 bg-emerald-500/5">
                    <DialogTitle className="font-headline text-4xl flex items-center gap-3 text-emerald-500 tracking-tighter">
                        <ArrowRightLeft className="h-10 w-10" /> DNA STRAIN MIXER
                    </DialogTitle>
                    <DialogDescription className="font-code text-[11px] uppercase tracking-[0.3em] text-emerald-600/60 mt-1">Select individual strains from album or track DNA saves to build a hybrid foundation.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto studio-scrollbar p-8">
                    <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto pb-12">
                        {FIELDS.map(f => (
                            <div key={f.id} className="space-y-4 p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <Label className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600/80">{f.label}</Label>
                                    <Select onValueChange={(val) => handleSelectStrain(f.id, val)}>
                                        <SelectTrigger className="w-full sm:w-[320px] h-9 text-[10px] font-bold uppercase bg-background/50 border-emerald-500/20">
                                            <SelectValue placeholder="LOAD STRAIN FROM VAULT" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {albumEntries.length > 0 && (
                                              <SelectGroup>
                                                <SelectLabel className="text-[9px] uppercase tracking-widest text-emerald-500/80">
                                                  Album DNA
                                                </SelectLabel>
                                                {albumEntries.map(({ preset, index }) => (
                                                  <SelectItem key={`a-${index}`} value={String(index)} className="text-[10px] font-bold uppercase">
                                                    {preset.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectGroup>
                                            )}
                                            {trackEntries.length > 0 && (
                                              <SelectGroup>
                                                <SelectLabel className="text-[9px] uppercase tracking-widest text-sky-400/80">
                                                  Track DNA
                                                </SelectLabel>
                                                {trackEntries.map(({ preset, index }) => (
                                                  <SelectItem key={`t-${index}`} value={String(index)} className="text-[10px] font-bold uppercase">
                                                    {preset.name}
                                                    {preset.sourceTrackTitle ? ` · ${preset.sourceTrackTitle}` : ''}
                                                  </SelectItem>
                                                ))}
                                              </SelectGroup>
                                            )}
                                            {presets.length === 0 && (
                                              <SelectItem value="__none" disabled className="text-[10px]">
                                                No saved DNA yet
                                              </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Textarea 
                                    className="min-h-[100px] text-sm font-code bg-background/40 border-emerald-500/10 p-4 leading-relaxed" 
                                    value={mixedStrains[f.id] as string || ''} 
                                    onChange={(e) => setMixedStrains(prev => ({ ...prev, [f.id]: e.target.value }))}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row justify-between items-center p-8 border-t bg-emerald-500/5 shrink-0 gap-6">
                    <div className="flex items-center gap-3 text-emerald-700/60">
                        <Dna className="h-4 w-4" />
                        <p className="text-[10px] uppercase font-bold tracking-widest italic text-center sm:text-left max-w-md">Mix world-building from one track with the emotional core of another.</p>
                    </div>
                    <Button onClick={() => { onApply(mixedStrains); onOpenChange(false); toast({ title: "DNA Strains Re-Mixed" }); }} size="lg" className="w-full sm:w-auto px-12 h-14 font-bold shadow-lg rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="h-6 w-6 mr-2" /> Apply Mixed Strains
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditCoverArtDialog({ album, onOpenChange }: { album: Album, onOpenChange: (open: boolean) => void }) {
    const { updateAlbum } = useContext(DataContext);
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [imagePreview, setImagePreview] = useState<string | null>(album.coverArtUrl || null);
    const [processingCover, setProcessingCover] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setProcessingCover(true);
        try {
            const { dataUrl } = await processCoverArtFile(file);
            setImagePreview(dataUrl);
            toast({
                title: 'Cover optimized',
                description: `Saved as ${COVER_ART_EXPORT_SIZE}×${COVER_ART_EXPORT_SIZE} for sharp vault & Lyrics DNA Drop display.`,
            });
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Image not accepted',
                description: e instanceof Error ? e.message : 'Could not process image.',
            });
        } finally {
            setProcessingCover(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => { startSavingTransition(() => { updateAlbum(album.id, { coverArtUrl: imagePreview || undefined }); toast({ title: 'Cover updated!' }); onOpenChange(false); }); }

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Edit Album Cover</DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight font-code">
                        Square cover, min {COVER_ART_MIN_DIMENSION}px per side — we export {COVER_ART_EXPORT_SIZE}×{COVER_ART_EXPORT_SIZE} for vault vinyls and Lyrics DNA Drops.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-48 h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-muted/20 relative overflow-hidden">
                            {imagePreview ? (
                                isDataUrl(imagePreview) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
                                ) : (
                                    <Image src={imagePreview} alt="Preview" width={192} height={192} className="object-cover w-full h-full" />
                                )
                            ) : (
                                <>
                                    <Image src="/Logo.png" alt="AKAsheet" width={48} height={48} className="w-12 h-12 opacity-20 mb-2" />
                                    <p className="text-[8px] font-bold uppercase text-muted-foreground text-center px-2">
                                        Min {COVER_ART_MIN_DIMENSION}px · exports {COVER_ART_EXPORT_SIZE}px square
                                    </p>
                                </>
                            )}
                        </div>
                        <Button variant="outline" size="sm" disabled={processingCover} onClick={() => fileInputRef.current?.click()}>
                            {processingCover ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {processingCover ? 'Processing…' : 'Change Image'}
                        </Button>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleSave} disabled={isSaving}>Save Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function LooseTracksSidebar({
  tracks,
  realAlbums,
  onMoveTrack,
  onAddTrack,
}: {
  tracks: Track[];
  realAlbums: Album[];
  onMoveTrack: (trackId: string, targetAlbumId: string) => void;
  onAddTrack: () => void;
}) {
  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tracks.forEach((t) => {
      const g = t.vibe?.genre?.trim() || 'Untitled vibe';
      counts.set(g, (counts.get(g) || 0) + 1);
    });
    return Array.from(counts.entries()).slice(0, 4);
  }, [tracks]);

  const totalBars = useMemo(
    () => tracks.reduce((sum, t) => sum + countRhymeBars(t.sections), 0),
    [tracks]
  );

  return (
    <div className="space-y-6">
      <Card className={cn('overflow-hidden border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-primary/10 shadow-xl', studioVaultCard)}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('text-lg', studioVaultCardTitle)}>Vault Snapshot</CardTitle>
          <CardDescription className="text-[9px] uppercase tracking-widest font-bold text-sky-400/80">
            Singles waiting for a home
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 pb-5">
          <div className={studioVaultMetricCell}>
            <p className={cn('text-2xl', studioVaultCardTitle)}>{tracks.length}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Tracks</p>
          </div>
          <div className={studioVaultMetricCell}>
            <p className={cn('text-2xl', studioVaultCardTitle)}>{totalBars}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Bars</p>
          </div>
          <div className={studioVaultMetricCell}>
            <p className={cn('text-2xl', studioVaultCardTitle)}>{realAlbums.length}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Albums</p>
          </div>
        </CardContent>
        {genreCounts.length > 0 && (
          <div className="border-t border-border dark:border-white/5 px-5 py-4 flex flex-wrap gap-2">
            {genreCounts.map(([genre, count]) => (
              <Badge key={genre} variant="outline" className="text-[8px] border-sky-500/25 text-sky-300 font-code">
                {genre} · {count}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className={studioVaultCard}>
        <CardHeader className="pb-3">
          <CardTitle className={cn('text-lg flex items-center gap-2', studioVaultCardTitle)}>
            <Move className="h-4 w-4 text-primary" />
            Assign to Album
          </CardTitle>
          <CardDescription className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
            Pick a track, then park it in a collection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pb-5">
          {realAlbums.length > 0 ? (
            realAlbums.map((targetAlbum) => (
              <DropdownMenu key={targetAlbum.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn('w-full flex items-center gap-3 text-left hover:border-primary/30 hover:bg-primary/5 transition-all', studioVaultRowButton)}
                  >
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-muted/50 overflow-hidden flex items-center justify-center dark:border-white/10 dark:bg-neutral-900">
                      {targetAlbum.coverArtUrl ? (
                        isDataUrl(targetAlbum.coverArtUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={targetAlbum.coverArtUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={targetAlbum.coverArtUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
                        )
                      ) : (
                        <ListMusic className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm truncate', studioVaultCardTitle)}>{targetAlbum.title}</p>
                      <p className="text-[9px] font-code text-muted-foreground uppercase">
                        {targetAlbum.tracks?.length ?? 0} track{(targetAlbum.tracks?.length ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border w-56 max-h-64 overflow-y-auto dark:border-white/10">
                  {tracks.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => onMoveTrack(t.id, targetAlbum.id)}
                      className="text-[10px] font-bold uppercase truncate"
                    >
                      <PlusCircle className="mr-2 h-3 w-3 shrink-0" />
                      {t.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3 dark:border-white/10">
              <p className="text-[10px] font-code text-muted-foreground uppercase tracking-widest">No albums yet</p>
              <Button variant="outline" size="sm" asChild className="text-[9px] font-bold uppercase">
                <Link href={vaultHref()}>Create from The Vault</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-primary/15 bg-gradient-to-t from-primary/10 to-transparent">
        <CardContent className="p-5 space-y-3">
          <p className="text-[10px] font-code text-muted-foreground leading-relaxed">
            Loose tracks stay editable here until you assign them. Use the card menu or the shelf above to move ideas into an album blueprint.
          </p>
          <Button onClick={onAddTrack} className="w-full h-10 font-bold text-[10px] uppercase tracking-widest">
            <PlusCircle className="mr-2 h-4 w-4" /> New Loose Track
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LooseTrackCard({
  track,
  index,
  albumId,
  realAlbums,
  onMoveTrack,
  onDelete,
  tierLocked = false,
}: {
  track: Track;
  index: number;
  albumId: string;
  realAlbums: Album[];
  onMoveTrack: (trackId: string, targetAlbumId: string) => void;
  onDelete: () => void;
  tierLocked?: boolean;
}) {
  const barCount = countRhymeBars(track.sections);
  const sectionCount = track.sections?.length ?? 0;

  return (
    <div className="group relative flex min-w-0 items-start gap-3 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card via-card/95 to-primary/[0.045] px-3 py-3 transition-all hover:border-primary/35 hover:bg-primary/[0.055] hover:shadow-[0_12px_32px_rgba(59,130,246,0.1)] sm:gap-4 sm:px-4 dark:border-white/10 dark:from-black/55 dark:via-black/40 dark:to-primary/[0.08]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-code text-[11px] font-bold tabular-nums text-primary/80">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0 flex-1 py-0.5">
        <Link href={`/albums/${albumId}/tracks/${track.id}`}>
        <p className={cn('break-words text-base leading-tight transition-colors group-hover:text-primary sm:text-lg', studioVaultCardTitle)}>
          {track.title}
        </p>
        </Link>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <TrackLiveIndicators track={track} variant="compact" linkLivePages />
          {tierLocked ? (
            <Badge variant="outline" className={cn('h-5 px-1.5 text-[7px]', proLockText())}>View only</Badge>
          ) : null}
          <Badge variant="outline" className="h-auto min-h-5 max-w-full whitespace-normal break-words px-2 py-0.5 text-left font-code text-[8px] leading-tight text-muted-foreground dark:border-white/10">
            {track.vibe?.genre || 'No genre'}
          </Badge>
          <span className="whitespace-nowrap font-code text-[9px] uppercase text-muted-foreground/70">
            {track.vibe?.tempoBPM ?? '—'} BPM
          </span>
          <span className="font-code text-[9px] uppercase text-muted-foreground/70">
            {barCount} bar{barCount === 1 ? '' : 's'} · {sectionCount} section{sectionCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {!tierLocked ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground opacity-75 hover:bg-primary/10 hover:text-primary group-hover:opacity-100" aria-label={`Manage ${track.title}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-border bg-card dark:border-white/10">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-[10px] font-bold uppercase">
                <Move className="mr-2 h-4 w-4" /> Move To Album
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="border-border bg-card dark:border-white/10">
                  {realAlbums.map((targetAlbum) => (
                    <DropdownMenuItem
                      key={targetAlbum.id}
                      onClick={() => onMoveTrack(track.id, targetAlbum.id)}
                      className="text-[10px] font-bold uppercase"
                    >
                      <PlusCircle className="mr-2 h-3 w-3" /> {targetAlbum.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-[10px] font-bold uppercase text-red-500 focus:text-red-500">
              <Trash2 className="mr-2 h-4 w-4" /> Scrap Asset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function AlbumDetailContent({ albumId }: { albumId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const isPro = isProOrTrial(user);
  const { getAlbumById, updateAlbum, updateTrack, deleteTrack, loading, moveTrack, deleteAlbum, albums } = useContext(DataContext);
  const totalTrackCount = countUserTracks(albums);
  const albumTierLocked = isAlbumOverTierLimit(albumId, albums, user);
  const editableTrackIds = getEditableTrackIds(albums, user);
  const canAddTrack = canUserAddTrack(albums, user) && !albumTierLocked;
  const openCreateTrack = () => {
    if (albumTierLocked) {
      toast(TIER_LIMIT_LOCKED_TOAST);
      return;
    }
    if (!canUserAddTrack(albums, user)) {
      trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, { limitType: 'track', count: totalTrackCount });
      trackUpgradeClick('slot_limit', { limitType: 'track', count: totalTrackCount });
      toast(FREE_TRACK_LIMIT_TOAST);
      return;
    }
    setCreateTrackOpen(true);
  };
  const openBlankSheets = () => {
    if (albumTierLocked) {
      toast(TIER_LIMIT_LOCKED_TOAST);
      return;
    }
    if (!canUserAddTrack(albums, user)) {
      trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, { limitType: 'track', count: totalTrackCount });
      trackUpgradeClick('slot_limit', { limitType: 'track', count: totalTrackCount });
      toast(FREE_TRACK_LIMIT_TOAST);
      return;
    }
    setBlankSheetsOpen(true);
  };
  const [album, setAlbum] = useState<Album | null>(null);

  useEffect(() => {
    if (isGuestTrySheetEnabled() && isGuestTryAlbumId(albumId) && !user) {
      router.replace(GUEST_TRY_PATH);
    }
  }, [albumId, user, router]);

  useEffect(() => {
    if (!loading) {
      const currentAlbum = getAlbumById(albumId);
      if (currentAlbum) setAlbum(currentAlbum);
      else { setTimeout(() => { if (!getAlbumById(albumId)) router.push(vaultHref()); }, 1000); }
    }
  }, [albumId, loading, getAlbumById, router]);

  // Vault can leave window mid-scroll (manual scrollRestoration). Always land at top.
  const loadedAlbumId = album?.id;
  useEffect(() => {
    if (loading || !loadedAlbumId || loadedAlbumId !== albumId) return;
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    requestAnimationFrame(() => requestAnimationFrame(resetScroll));
  }, [albumId, loading, loadedAlbumId]);

  const [editCoverArtDialogOpen, setEditCoverArtDialogOpen] = useState(false);
  const [strainMixerOpen, setStrainMixerOpen] = useState(false);
  const [createTrackOpen, setCreateTrackOpen] = useState(false);
  const [blankSheetsOpen, setBlankSheetsOpen] = useState(false);
  const [albumSearch, setAlbumSearch] = useState('');
  const [albumSort, setAlbumSort] = useState<AlbumTrackSortKey>('manual');
  const [albumSortDir, setAlbumSortDir] = useState<AlbumTrackSortDir>('asc');
  const [renamingTrackId, setRenamingTrackId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pressTrackingPref, setPressTrackingPref] = useState(true);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [downgradePickerDone, setDowngradePickerDone] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [looseSearch, setLooseSearch] = useState('');
  const [looseSort, setLooseSort] = useState<LooseTrackSort>('newest');
  const [looseFilter, setLooseFilter] = useState<LooseTrackFilter>('all');
  const [extractingAlbumDna, setExtractingAlbumDna] = useState(false);
  const [saveAlbumDnaOpen, setSaveAlbumDnaOpen] = useState(false);
  const [confirmExtractOpen, setConfirmExtractOpen] = useState(false);
  const [loadDnaVaultOpen, setLoadDnaVaultOpen] = useState(false);
  const [confirmLoadPresetIdx, setConfirmLoadPresetIdx] = useState<number | null>(null);

  const handleAlbumUpdate = (updates: Partial<Album>) => {
    if (!album) return;
    if (albumTierLocked) {
      toast(TIER_LIMIT_LOCKED_TOAST);
      return;
    }
    updateAlbum(album.id, updates);
  };
  const handleDirectionUpdate = (field: keyof Direction, value: string) => {
    if (album) handleAlbumUpdate({ direction: { ...(album.direction || {}), [field]: value } });
  };

  const applyAlbumDnaFields = (fields: {
    setting_world?: string;
    emotion_core?: string;
    message_truth?: string;
  }) => {
    if (!album) return;
    handleAlbumUpdate({
      direction: {
        ...(album.direction || {}),
        setting_world: fields.setting_world ?? album.direction?.setting_world,
        emotion_core: fields.emotion_core ?? album.direction?.emotion_core,
        message_truth: fields.message_truth ?? album.direction?.message_truth,
        enabled: true,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const runExtractAlbumDna = async () => {
    if (!album || albumTierLocked) {
      if (albumTierLocked) toast(TIER_LIMIT_LOCKED_TOAST);
      return;
    }
    if (!isPro) {
      toast({
        variant: 'destructive',
        title: 'Studio Pro required',
        description: 'Extract Album DNA is a Pro feature.',
      });
      return;
    }
    setExtractingAlbumDna(true);
    try {
      const { corpus, trackCount, truncated } = buildAlbumDnaCorpus(album);
      const result = await lazyExtractAlbumDna(
        await withAiAuth({
          albumTitle: album.title,
          albumTheme: album.theme || undefined,
          tracksCorpus: corpus,
          userName: user?.displayName,
        })
      );
      applyAlbumDnaFields({
        setting_world: result.setting_world,
        emotion_core: result.emotion_core,
        message_truth: result.message_truth,
      });
      toast({
        title: 'Album DNA extracted',
        description: truncated
          ? `Filled World / Emotion / Message from ${trackCount} tracks (lyrics truncated to fit).`
          : `Filled World / Emotion / Message from ${trackCount} tracks.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Extract failed',
        description: e instanceof Error ? e.message : 'Could not extract Album DNA.',
      });
    } finally {
      setExtractingAlbumDna(false);
    }
  };

  const requestExtractAlbumDna = () => {
    if (!album || albumTierLocked) {
      if (albumTierLocked) toast(TIER_LIMIT_LOCKED_TOAST);
      return;
    }
    if (!isPro) {
      toast({
        variant: 'destructive',
        title: 'Studio Pro required',
        description: 'Extract Album DNA is a Pro feature.',
      });
      return;
    }
    try {
      buildAlbumDnaCorpus(album);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Nothing to extract',
        description: e instanceof Error ? e.message : 'Add track lyrics first.',
      });
      return;
    }
    if (albumDnaFieldsHaveContent(album.direction)) {
      setConfirmExtractOpen(true);
      return;
    }
    void runExtractAlbumDna();
  };

  const handleSaveAlbumDna = (name: string) => {
    if (!album || !isPro) return;
    const mapping = {
      setting_world: album.direction?.setting_world || '',
      emotion_core: album.direction?.emotion_core || '',
      message_truth: album.direction?.message_truth || '',
    };
    if (
      !mapping.setting_world.trim() &&
      !mapping.emotion_core.trim() &&
      !mapping.message_truth.trim()
    ) {
      toast({
        variant: 'destructive',
        title: 'Nothing to save',
        description: 'Fill or extract World Building, Emotional Core, or Message Truth first.',
      });
      return;
    }
    const profile = buildDnaPresetFromDirection({
      name,
      sourceTrackTitle: `Album · ${album.title}`,
      sourceKind: 'album',
      direction: mapping,
    });
    const existing = album.dnaPresets || [];
    handleAlbumUpdate({ dnaPresets: [...existing, profile] });
    toast({ title: 'Album DNA saved', description: `"${name}" stored in this album’s vault.` });
  };

  const applyLoadAlbumDnaPreset = (idx: number) => {
    if (!album) return;
    const preset = album.dnaPresets?.[idx];
    if (!preset?.mapping) return;
    applyAlbumDnaFields({
      setting_world: preset.mapping.setting_world || '',
      emotion_core: preset.mapping.emotion_core || '',
      message_truth: preset.mapping.message_truth || '',
    });
    toast({ title: 'Album DNA loaded', description: `"${preset.name}" applied to World / Emotion / Message.` });
    setConfirmLoadPresetIdx(null);
    setLoadDnaVaultOpen(false);
  };

  const requestLoadAlbumDnaPreset = (idx: number) => {
    if (!album || !isPro) return;
    if (albumDnaFieldsHaveContent(album.direction)) {
      setConfirmLoadPresetIdx(idx);
      return;
    }
    applyLoadAlbumDnaPreset(idx);
  };

  const handleDeleteDnaPreset = (idx: number) => {
    if (!album || !isPro) return;
    const existing = album.dnaPresets || [];
    const removed = existing[idx];
    if (!removed) return;
    handleAlbumUpdate({ dnaPresets: existing.filter((_, i) => i !== idx) });
    toast({
      title: 'DNA profile deleted',
      description: `"${removed.name}" removed from this album’s vault.`,
    });
  };

  const handleReorderTrack = (id: string, direction: 'up' | 'down') => {
      if (!album || albumTierLocked) {
        if (albumTierLocked) toast(TIER_LIMIT_LOCKED_TOAST);
        return;
      }
      const idx = album.tracks.findIndex(t => t.id === id);
      if (idx === -1) return;
      const newTracks = [...album.tracks];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newTracks.length) return;
      [newTracks[idx], newTracks[targetIdx]] = [newTracks[targetIdx], newTracks[idx]];
      handleAlbumUpdate({
        tracks: newTracks,
        trackOrder: newTracks.map((track) => track.id),
      });
  };

  const handleUnassignTrack = (trackId: string) => {
      if (albumTierLocked || isTrackOverTierLimit(trackId, albumId, albums, user)) {
        toast(TIER_LIMIT_LOCKED_TOAST);
        return;
      }
      moveTrack(trackId, albumId, 'unassigned');
      toast({ title: "Track Unassigned", description: "Moved to Loose Tracks vault." });
  };

  const handleMoveToAlbum = (trackId: string, targetAlbumId: string) => {
    if (albumTierLocked || isTrackOverTierLimit(trackId, albumId, albums, user)) {
      toast(TIER_LIMIT_LOCKED_TOAST);
      return;
    }
    moveTrack(trackId, albumId, targetAlbumId);
    const target = realAlbums.find((a) => a.id === targetAlbumId);
    toast({
      title: 'Track Assigned',
      description: target ? `Moved to ${target.title}.` : 'Track assigned to album.',
    });
  };

  const formattedCreationDate = useMemo(() => {
    if (!album?.createdAt) return 'Initialized';
    const date = new Date(album.createdAt);
    return isNaN(date.getTime()) ? 'Initialized' : format(date, 'MMM d, yyyy');
  }, [album?.createdAt]);

  const isUnassignedVault = album?.id === 'unassigned';
  const realAlbums = albums.filter(a => a.id !== 'unassigned');

  const liveAlbumReleaseShareId = useMemo(() => {
    if (!album || isUnassignedVault) return undefined;
    const bundle = { ...album, tracks: album.tracks };
    if (releaseStatusOf(bundle) !== 'live') return undefined;
    return releaseShareIdOf(bundle);
  }, [album, isUnassignedVault]);

  const displayedLooseTracks = useMemo(() => {
    if (!isUnassignedVault || !album?.tracks) return [];
    const q = looseSearch.trim().toLowerCase();
    let rows = album.tracks.filter((track) => matchesLooseTrackFilter(track, looseFilter));
    if (q) {
      rows = rows.filter((track) => looseTrackSearchHaystack(track).includes(q));
    }
    return sortLooseTracks(rows, looseSort);
  }, [album?.tracks, isUnassignedVault, looseSearch, looseSort, looseFilter]);

  useEffect(() => {
    const syncPref = () => setPressTrackingPref(readPressTrackingPref());
    syncPref();
    window.addEventListener('b4b-press-tracking-changed', syncPref);
    return () => window.removeEventListener('b4b-press-tracking-changed', syncPref);
  }, []);

  const trackingOn =
    album && typeof album.pressTrackingEnabled === 'boolean'
      ? album.pressTrackingEnabled
      : pressTrackingPref;

  useEffect(() => {
    if (!trackingOn && albumSort === 'progress') setAlbumSort('manual');
  }, [trackingOn, albumSort]);

  const displayedAlbumTracks = useMemo(() => {
    if (isUnassignedVault || !album?.tracks) return [];
    const q = albumSearch.trim().toLowerCase();
    const rows = q
      ? album.tracks.filter((track) => albumTrackSearchHaystack(track).includes(q))
      : album.tracks;
    return sortAlbumTracks(rows, albumSort, albumSortDir);
  }, [album?.tracks, isUnassignedVault, albumSearch, albumSort, albumSortDir]);

  const canReorderAlbumTracks = !isUnassignedVault && albumSort === 'manual' && !albumSearch.trim();

  const commitAlbumTrackRename = (track: Track) => {
    const next = renameDraft.trim() || 'Untitled Track';
    if (next !== track.title) updateTrack(albumId, track.id, { title: next });
    setRenamingTrackId(null);
  };

  const applyAlbumSort = (key: AlbumTrackSortKey) => {
    setAlbumSort(key);
    if (key === 'name') setAlbumSortDir('asc');
    else if (key !== 'manual') setAlbumSortDir('desc');
  };

  const looseFilterLabels = vaultLiveFilterLabels;
  const showDowngradePicker =
    !downgradePickerDone && !loading && user != null && needsFreeEditableTrackPicker(user, albums);

  const currentUserIsPro = Boolean(user && isProUser(user));
  useEffect(() => {
    if (currentUserIsPro) {
      setDowngradePickerDone(false);
    }
  }, [currentUserIsPro]);

  if (loading || !album) return <StudioLoader size="lg" fullscreen />;

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full selection:bg-primary/30 overflow-x-hidden font-code" data-album-shell>
        <AlbumPageAtmosphere />

        <div className="relative z-20 container mx-auto px-3 sm:px-6 py-6 sm:py-10 min-w-0 md:pl-32">
            <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (navigateBackToReleaseCatalog(router)) return;
                  router.push(vaultHref());
                }}
                className="-ml-1 sm:-ml-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-all"
              >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Vault
              </Button>
              {liveAlbumReleaseShareId && user?.id === album.ownerId ? (
                <ShareReachStrip
                  shareId={liveAlbumReleaseShareId}
                  ownerId={album.ownerId}
                  className="text-[10px]"
                />
              ) : null}
            </div>

            {albumTierLocked && (
              <div className="mb-6 rounded-xl border border-pink-500/25 bg-pink-500/10 px-4 py-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-pink-400 shrink-0" />
                <p className={cn('text-[10px] font-code leading-snug', proLockText())}>
                  {getAlbumLimitBanner(user, albums)}
                </p>
              </div>
            )}

            {isUnassignedVault && !isPro && isDowngradedProVault(user, albums) && (
              <div className="mb-6">
                <VisitorVaultBanner user={user} albums={albums} />
              </div>
            )}

            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 sm:gap-8 mb-8 sm:mb-12">
                <div className={cn('space-y-3 sm:space-y-4 min-w-0 w-full', isUnassignedVault ? 'lg:max-w-2xl' : 'flex-grow')}>
                    <Input 
                        defaultValue={album.title} 
                        readOnly={albumTierLocked}
                        onBlur={(e) => !albumTierLocked && handleAlbumUpdate({ title: e.target.value })} 
                        className={cn(
                          'text-3xl sm:text-5xl md:text-7xl font-headline font-bold text-foreground dark:text-white bg-transparent border-0 p-0 focus-visible:ring-0 h-auto tracking-tighter uppercase leading-none w-full max-w-full',
                          albumTierLocked && 'opacity-80 cursor-default'
                        )}
                    />
                    <Textarea 
                        defaultValue={album.theme} 
                        readOnly={albumTierLocked}
                        onBlur={(e) => !albumTierLocked && handleAlbumUpdate({ theme: e.target.value })} 
                        className={cn(
                          'text-base sm:text-xl text-muted-foreground bg-transparent border-0 p-0 focus-visible:ring-0 font-code min-h-[60px] resize-none leading-relaxed italic w-full max-w-full break-words',
                          albumTierLocked && 'opacity-80 cursor-default'
                        )}
                        placeholder="Album concept..."
                    />
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-2">
                        <span className="text-[10px] font-code text-muted-foreground/60 uppercase">Created {formattedCreationDate}</span>
                        {isUnassignedVault && (
                          <Badge variant="outline" className="text-[8px] border-sky-500/30 text-sky-400 font-mono">
                            {album.tracks?.length ?? 0} loose
                          </Badge>
                        )}
                        <AlbumLiveIndicators album={album} variant="badge" />
                    </div>
                </div>
                
                {!isUnassignedVault ? (
                    <div className="relative group shrink-0 w-full sm:w-auto flex justify-center lg:justify-end">
                        <div className="absolute top-2 right-2 z-20 sm:top-3 sm:right-3 flex items-center gap-1.5">
                          <AlbumLiveIndicators album={album} variant="dot" className="gap-1.5" />
                        </div>
                        <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-4 border-white/5 bg-neutral-900 flex flex-col items-center justify-center relative">
                            {album.coverArtUrl ? (
                                isDataUrl(album.coverArtUrl) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={album.coverArtUrl} alt="Cover" className="object-cover w-full h-full" />
                                ) : (
                                    <Image src={album.coverArtUrl} alt="Cover" width={256} height={256} className="object-cover w-full h-full" priority />
                                )
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Image src="/Logo.png" alt="AKAsheet" width={64} height={64} className="w-16 h-16 opacity-10" />
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">1000 x 1000px</p>
                                </div>
                            )}
                            {!albumTierLocked && (
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                  <Button variant="secondary" size="sm" onClick={() => setEditCoverArtDialogOpen(true)} className="h-10 px-6 font-bold text-xs rounded-xl shadow-2xl">
                                      <Pencil className="mr-2 h-4 w-4" /> {album.coverArtUrl ? 'Change Cover' : 'Upload Cover'}
                                  </Button>
                              </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full lg:w-[min(100%,340px)] shrink-0 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-primary/10 p-5 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/25">
                                <CassetteTape className="h-6 w-6 text-sky-400" />
                            </div>
                            <div>
                                <p className={cn('text-lg tracking-tight', studioVaultCardTitle)}>Idea Shelf</p>
                                <p className="text-[9px] font-code text-muted-foreground uppercase tracking-widest">Unassigned workspace</p>
                            </div>
                        </div>
                        <p className="text-[11px] font-code text-muted-foreground leading-relaxed">
                            Drafts live here until you slot them into an album. Open any card to write, or assign from the shelf on the right.
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-8 pb-40 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.72fr)]">
                <div className="min-w-0 space-y-10">
                    <Card className={cn('backdrop-blur-3xl shadow-2xl overflow-hidden min-w-0', studioVaultCard)}>
                        <CardHeader className="flex min-w-0 flex-col gap-4 border-b border-border p-4 sm:p-6 md:flex-row md:flex-wrap md:items-center md:justify-between md:p-8 dark:border-white/5">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 shrink-0">
                                <div className="p-2 sm:p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0">
                                    {isUnassignedVault ? <CassetteTape className="h-6 w-6 sm:h-8 sm:w-8 text-primary" /> : <ListMusic className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />}
                                </div>
                                <div className="min-w-0">
                                    <CardTitle className="break-words font-headline text-lg uppercase tracking-tighter sm:text-xl md:text-2xl lg:text-3xl">{isUnassignedVault ? 'Idea Vault' : 'Tracklist'}</CardTitle>
                                    <p className="mt-0.5 break-words text-[8px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[9px]">Asset Reordering &amp; Management</p>
                                </div>
                            </div>
                            <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:flex md:flex-1 md:flex-wrap md:items-center md:justify-end">
                                <Button
                                  onClick={openCreateTrack}
                                  disabled={!canAddTrack}
                                  className="h-9 w-full min-w-0 px-3 font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 md:w-auto md:flex-none md:px-6"
                                >
                                    <PlusCircle className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" /> Add Track
                                </Button>
                                {!isUnassignedVault && (
                                  <Button
                                    variant="outline"
                                    onClick={openBlankSheets}
                                    disabled={!canAddTrack}
                                    className="h-9 w-full min-w-0 px-3 font-bold text-[10px] uppercase tracking-widest border-sky-500/30 rounded-xl bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 md:w-auto md:flex-none md:px-4"
                                  >
                                    <NotebookPen className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" /> Add sheets
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-full min-w-0 px-3 font-bold text-[10px] uppercase tracking-widest border-border rounded-xl bg-muted/40 md:w-auto md:flex-none md:px-4 dark:border-white/10 dark:bg-white/5"
                                  onClick={() => {
                                    if (!canExportVault(user)) {
                                      toast(EXPORT_PRO_TOAST);
                                      return;
                                    }
                                    setExportDialogOpen(true);
                                  }}
                                >
                                    <FileDown className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" /> Export
                                </Button>
                                {!isUnassignedVault && firstDropsOn ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-full min-w-0 px-3 font-bold text-[10px] uppercase tracking-widest border-fuchsia-400/40 rounded-xl bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20 md:w-auto md:flex-none md:px-4"
                                      onClick={() =>
                                        openFirstDropLathe({
                                          albumId: album.id,
                                          mode: 'album',
                                          ...(releaseShareIdOf({ ...album, tracks: album.tracks })
                                            ? {
                                                shareId: releaseShareIdOf({ ...album, tracks: album.tracks }),
                                              }
                                            : {}),
                                        })
                                      }
                                    >
                                      <Disc3 className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" />{' '}
                                      {releaseStatusOf({ ...album, tracks: album.tracks }) === 'live'
                                        ? 'Manage album release'
                                        : 'Release album'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-full min-w-0 px-3 font-bold text-[10px] uppercase tracking-widest border-fuchsia-400/40 rounded-xl bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20 md:w-auto md:flex-none md:px-4"
                                      onClick={() => openFirstDropLathe({ albumId: album.id, mode: 'song' })}
                                    >
                                      <Music className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" /> Release single
                                    </Button>
                                  </>
                                ) : null}
                            </div>
                        </CardHeader>
                        {!isUnassignedVault ? (
                          <div className="flex flex-col gap-3 border-b border-border px-4 sm:px-6 md:px-8 py-4 dark:border-white/5">
                            <AlbumVaultReleasePanel album={album} />
                            {album.tracks?.length > 0 ? (
                              <div className="relative w-full">
                                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  value={albumSearch}
                                  onChange={(e) => setAlbumSearch(e.target.value)}
                                  placeholder="Search sheets… title, genre, mood, stage"
                                  className="h-10 border-border bg-muted/40 pl-10 pr-10 font-code text-xs font-bold dark:border-white/10"
                                />
                                {albumSearch ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-8 w-8 rounded-full"
                                    onClick={() => setAlbumSearch('')}
                                    aria-label="Clear search"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            ) : null}
                            <div className="flex flex-wrap items-center gap-2">
                              {album.tracks?.length > 0 ? (
                                <>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-2 border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider dark:border-white/10"
                                      >
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                        Sort · {ALBUM_SORT_LABELS[albumSort]}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-card border-border dark:border-white/10">
                                      {(Object.keys(ALBUM_SORT_LABELS) as AlbumTrackSortKey[])
                                        .filter((key) => trackingOn || key !== 'progress')
                                        .map((key) => (
                                          <DropdownMenuItem
                                            key={key}
                                            onClick={() => applyAlbumSort(key)}
                                            className={cn(
                                              'text-[10px] font-bold uppercase',
                                              albumSort === key && 'bg-primary/10 text-primary'
                                            )}
                                          >
                                            {ALBUM_SORT_LABELS[key]}
                                          </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  {albumSort !== 'manual' ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 gap-2 border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider dark:border-white/10"
                                      onClick={() => setAlbumSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
                                    >
                                      {albumSortDir === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
                                      {albumSortDir === 'asc' ? 'Ascending' : 'Descending'}
                                    </Button>
                                  ) : null}
                                </>
                              ) : null}
                              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-1.5">
                                <Label htmlFor="album-press-tracking" className="text-[9px] font-bold uppercase tracking-wider text-sky-200">
                                  Press / Release tracking
                                </Label>
                                <Switch
                                  id="album-press-tracking"
                                  checked={trackingOn}
                                  disabled={albumTierLocked}
                                  onCheckedChange={(next) => handleAlbumUpdate({ pressTrackingEnabled: next })}
                                />
                              </div>
                              {album.tracks?.length > 0 ? (
                                <Badge variant="outline" className="ml-auto border-sky-500/30 font-mono text-sky-400">
                                  {displayedAlbumTracks.length} shown
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 border-b border-border px-4 sm:px-6 md:px-8 py-4 dark:border-white/5">
                            <div className="relative w-full">
                              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                value={looseSearch}
                                onChange={(e) => setLooseSearch(e.target.value)}
                                placeholder='Search loose tracks… title, genre, mood'
                                className="h-10 border-border bg-muted/40 pl-10 pr-10 font-code text-xs font-bold dark:border-white/10"
                              />
                              {looseSearch ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1 h-8 w-8 rounded-full"
                                  onClick={() => setLooseSearch('')}
                                  aria-label="Clear search"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-2 border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider dark:border-white/10"
                                  >
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                    Sort · {looseSort === 'newest' ? 'Newest' : looseSort === 'oldest' ? 'Oldest' : 'A–Z'}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-card border-border dark:border-white/10">
                                  <DropdownMenuItem onClick={() => setLooseSort('newest')} className="text-[10px] font-bold uppercase">
                                    <SortDesc className="mr-2 h-4 w-4" /> Newest first
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setLooseSort('oldest')} className="text-[10px] font-bold uppercase">
                                    <SortAsc className="mr-2 h-4 w-4" /> Oldest first
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setLooseSort('alphabetical')} className="text-[10px] font-bold uppercase">
                                    <SortAsc className="mr-2 h-4 w-4" /> Alphabetical
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-2 border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider dark:border-white/10"
                                  >
                                    <Filter className="h-3.5 w-3.5" />
                                    Filter · {looseFilterLabels[looseFilter]}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-card border-border dark:border-white/10">
                                  {(Object.keys(looseFilterLabels) as LooseTrackFilter[]).map((key) => (
                                    <DropdownMenuItem
                                      key={key}
                                      onClick={() => setLooseFilter(key)}
                                      className={cn(
                                        'text-[10px] font-bold uppercase',
                                        looseFilter === key && 'bg-primary/10 text-primary'
                                      )}
                                    >
                                      {looseFilterLabels[key]}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Badge variant="outline" className="ml-auto border-sky-500/30 font-mono text-sky-400">
                                {displayedLooseTracks.length} shown
                              </Badge>
                            </div>
                          </div>
                        )}
                        <CardContent className={cn(isUnassignedVault ? 'p-3 sm:p-5' : 'p-0')}>
                            {album.tracks?.length > 0 ? (
                              isUnassignedVault ? (
                                displayedLooseTracks.length > 0 ? (
                                <div className="space-y-2.5">
                                  {displayedLooseTracks.map((track, index) => (
                                    <LooseTrackCard
                                      key={track.id}
                                      track={track}
                                      index={index}
                                      albumId={album.id}
                                      realAlbums={realAlbums}
                                      onMoveTrack={handleMoveToAlbum}
                                      onDelete={() => setTrackToDelete(track)}
                                      tierLocked={!editableTrackIds.has(track.id)}
                                    />
                                  ))}
                                  {isPro && (
                                    <ProCreateTrackSlot onClick={openCreateTrack} />
                                  )}
                                </div>
                                ) : (
                                  <div className="py-16 text-center flex flex-col items-center gap-4 opacity-60">
                                    <Search className="h-10 w-10 text-muted-foreground" />
                                    <p className="font-code text-sm uppercase tracking-[0.25em]">No tracks match your search or filter</p>
                                    <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase" onClick={() => { setLooseSearch(''); setLooseFilter('all'); }}>
                                      Clear filters
                                    </Button>
                                  </div>
                                )
                              ) : displayedAlbumTracks.length > 0 ? (
                                <div className="space-y-2 p-3 sm:p-4">
                                {displayedAlbumTracks.map((track, index) => {
                                  const trackTierLocked = albumTierLocked || !editableTrackIds.has(track.id);
                                  const barCount = countRhymeBars(track.sections);
                                  const sectionCount = track.sections?.length ?? 0;
                                  const trackReleaseId = releaseShareIdOf(track);
                                  const albumReleaseId = releaseShareIdOf({ ...album, tracks: album.tracks });
                                  const includedInLiveAlbum = Boolean(
                                    !trackReleaseId &&
                                    albumReleaseId &&
                                    releaseStatusOf({ ...album, tracks: album.tracks }) === 'live' &&
                                    normalizeDropAudio(track.dropAudio)
                                  );
                                  const createdLabel = shortTrackDate(track.createdAt);
                                  const editedLabel = shortTrackDate(track.updatedAt);
                                  const albumOrderIndex = album.tracks.findIndex((row) => row.id === track.id);
                                  return (
                                    <div key={track.id} className="group relative flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card via-card/95 to-emerald-500/[0.035] p-3 transition-all hover:border-primary/30 hover:bg-primary/[0.045] hover:shadow-[0_12px_32px_rgba(59,130,246,0.08)] sm:flex-row sm:items-center sm:gap-4 sm:p-4 dark:border-white/10 dark:from-black/55 dark:via-black/40 dark:to-emerald-500/[0.06]">
                                        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-code text-[11px] font-bold tabular-nums text-primary/75 transition-all group-hover:border-primary/40 group-hover:text-primary">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {renamingTrackId === track.id ? (
                                              <Input
                                                value={renameDraft}
                                                autoFocus
                                                onChange={(e) => setRenameDraft(e.target.value)}
                                                onBlur={() => commitAlbumTrackRename(track)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitAlbumTrackRename(track);
                                                  }
                                                  if (e.key === 'Escape') setRenamingTrackId(null);
                                                }}
                                                className="h-9 font-headline text-base font-bold sm:text-xl"
                                              />
                                            ) : (
                                              <div className="flex min-w-0 items-start gap-1.5">
                                                <Link href={`/albums/${album.id}/tracks/${track.id}`} className="min-w-0 flex-1">
                                                  <p className={cn('break-words text-base leading-tight transition-colors group-hover:text-primary sm:text-xl', studioVaultCardTitle)}>{track.title}</p>
                                                </Link>
                                                {!trackTierLocked ? (
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                                                    onClick={() => {
                                                      setRenamingTrackId(track.id);
                                                      setRenameDraft(track.title);
                                                    }}
                                                    aria-label={`Rename ${track.title}`}
                                                  >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                  </Button>
                                                ) : null}
                                              </div>
                                            )}
                                            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                                                <TrackLiveIndicators
                                                  track={track}
                                                  variant="compact"
                                                  linkLivePages
                                                  releaseLive={includedInLiveAlbum ? true : undefined}
                                                  releaseHref={includedInLiveAlbum ? `/share/${albumReleaseId}` : undefined}
                                                />
                                                {trackTierLocked && (
                                                  <Badge variant="outline" className={cn('h-5 px-1.5 text-[8px]', proLockText())}>View only</Badge>
                                                )}
                                                <Badge variant="outline" className="h-auto min-h-5 max-w-full whitespace-normal break-words px-2 py-0.5 text-left font-code text-[8px] leading-tight text-muted-foreground dark:border-white/10">{track.vibe?.genre || 'No genre'}</Badge>
                                                <span className="whitespace-nowrap font-code text-[9px] uppercase text-muted-foreground/70">{track.vibe?.tempoBPM ?? '—'} BPM</span>
                                                <span className="font-code text-[9px] uppercase text-muted-foreground/70">
                                                  {barCount} bar{barCount === 1 ? '' : 's'} · {sectionCount} section{sectionCount === 1 ? '' : 's'}
                                                </span>
                                                {createdLabel ? (
                                                  <span className="font-code text-[9px] uppercase text-muted-foreground/70">Created {createdLabel}</span>
                                                ) : null}
                                                {editedLabel && editedLabel !== createdLabel ? (
                                                  <span className="font-code text-[9px] uppercase text-muted-foreground/70">Edited {editedLabel}</span>
                                                ) : null}
                                            </div>
                                        </div>
                                        </div>
                                        {trackingOn ? (
                                          <div className="w-full min-w-0 pl-12 sm:w-48 sm:shrink-0 sm:pl-0">
                                            <PressStageControl
                                              compact
                                              stage={track.pressStage}
                                              disabled={trackTierLocked}
                                              onChange={(pressStage) => updateTrack(album.id, track.id, { pressStage })}
                                            />
                                          </div>
                                        ) : null}
                                        <div className="flex shrink-0 items-center justify-end gap-1 pl-12 opacity-100 transition-opacity sm:justify-start sm:pl-0 sm:opacity-65 sm:group-hover:opacity-100">
                                            {canReorderAlbumTracks && !trackTierLocked && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => handleReorderTrack(track.id, 'up')} disabled={albumOrderIndex <= 0}><ArrowUp className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => handleReorderTrack(track.id, 'down')} disabled={albumOrderIndex === album.tracks.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                                </>
                                            )}
                                            {!trackTierLocked && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white"><MoreVertical className="h-5 w-5" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-card border-border w-48 dark:border-white/10">
                                                    {isUnassignedVault ? (
                                                        <>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger className="text-[10px] font-bold uppercase"><Move className="mr-2 h-4 w-4" /> Move To Album</DropdownMenuSubTrigger>
                                                                <DropdownMenuPortal>
                                                                    <DropdownMenuSubContent className="bg-card border-border dark:border-white/10">
                                                                        {realAlbums.map(targetAlbum => (
                                                                            <DropdownMenuItem key={targetAlbum.id} onClick={() => { moveTrack(track.id, 'unassigned', targetAlbum.id); toast({ title: "Track Assigned", description: `"${track.title}" moved to ${targetAlbum.title}. Album DNA inherit is on.` }); }} className="text-[10px] font-bold uppercase">
                                                                                <PlusCircle className="mr-2 h-3 w-3" /> {targetAlbum.title}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuSubContent>
                                                                </DropdownMenuPortal>
                                                            </DropdownMenuSub>
                                                        </>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleUnassignTrack(track.id)} className="text-[10px] font-bold uppercase"><LogOut className="mr-2 h-4 w-4" /> Make Loose Track</DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setTrackToDelete(track)} className="text-red-500 focus:text-red-500 text-[10px] font-bold uppercase"><Trash2 className="mr-2 h-4 w-4" /> Scrap Asset</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                  );
                                })}
                                </div>
                              ) : (
                                  <div className="py-16 text-center flex flex-col items-center gap-4 opacity-60">
                                    <Search className="h-10 w-10 text-muted-foreground" />
                                    <p className="font-code text-sm uppercase tracking-[0.25em]">No sheets match your search</p>
                                    <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase" onClick={() => setAlbumSearch('')}>
                                      Clear search
                                    </Button>
                                  </div>
                                )
                            ) : isUnassignedVault && isPro ? (
                                    <div className="space-y-2.5 p-3 sm:p-5">
                                      <ProCreateTrackSlot onClick={openCreateTrack} />
                                    </div>
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-6 opacity-30">
                                        <CassetteTape className="h-16 w-16" />
                                        <p className="font-code text-sm uppercase tracking-[0.4em]">No tracks in this blueprint</p>
                                        {!isUnassignedVault ? (
                                          <div className="flex flex-wrap items-center justify-center gap-2 opacity-100">
                                            <Button onClick={openCreateTrack} disabled={!canAddTrack} className="h-9 font-bold text-[10px] uppercase">
                                              <PlusCircle className="mr-1.5 h-4 w-4" /> Add Track
                                            </Button>
                                            <Button variant="outline" onClick={openBlankSheets} disabled={!canAddTrack} className="h-9 font-bold text-[10px] uppercase">
                                              <NotebookPen className="mr-1.5 h-4 w-4" /> Add sheets
                                            </Button>
                                          </div>
                                        ) : null}
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </div>

                <div className={cn('min-w-0', isUnassignedVault ? 'space-y-6' : 'space-y-10')}>
                    {isUnassignedVault ? (
                      <LooseTracksSidebar
                        tracks={album.tracks ?? []}
                        realAlbums={realAlbums}
                        onMoveTrack={handleMoveToAlbum}
                        onAddTrack={openCreateTrack}
                      />
                    ) : (
                    <>
                    {!isUnassignedVault && (
                        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-2xl rounded-2xl">
                            <CardHeader className="flex min-w-0 flex-col gap-4 p-4 sm:p-6 md:p-8">
                                <div className="flex flex-col">
                                    <CardTitle className="font-headline text-2xl flex items-center gap-3 text-emerald-500 uppercase tracking-tighter"><Compass className="h-6 w-6" /> Album DNA</CardTitle>
                                    <CardDescription className="text-[9px] uppercase font-bold tracking-widest text-emerald-600/60 mt-1">Foundational Alignment</CardDescription>
                                </div>
                                <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
                                    {isPro ? (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={albumTierLocked || extractingAlbumDna}
                                          title={inkTooltip('extractAlbumDna')}
                                          className="h-9 gap-1.5 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:bg-emerald-500/10"
                                          onClick={requestExtractAlbumDna}
                                        >
                                          {extractingAlbumDna ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <ScanLine className="h-3.5 w-3.5" />
                                          )}
                                          Extract
                                          <span className="text-[9px] opacity-70">{AI_COSTS.extractAlbumDna} Ink</span>
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={albumTierLocked}
                                          className="h-9 gap-1.5 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:bg-emerald-500/10"
                                          onClick={() => setSaveAlbumDnaOpen(true)}
                                        >
                                          <Save className="h-3.5 w-3.5" /> Save
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={albumTierLocked || !(album.dnaPresets?.length)}
                                          className="h-9 gap-1.5 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:bg-emerald-500/10"
                                          onClick={() => setLoadDnaVaultOpen(true)}
                                        >
                                          <FolderOpen className="h-3.5 w-3.5" /> Load
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <LockedProFeatureButton
                                          feature="Extract Album DNA"
                                          benefit="Synthesize World Building, Emotional Core, and Message Truth from every track in order."
                                          example="Pro reads the full album arc, then fills the three Album DNA fields."
                                          icon={ScanLine}
                                          label="Extract"
                                          size="sm"
                                          variant="outline"
                                          className="h-9 text-[10px] font-bold uppercase tracking-wider"
                                        />
                                        <LockedProFeatureButton
                                          feature="Save Album DNA"
                                          benefit="Archive World / Emotion / Message profiles on this album for later load."
                                          icon={Save}
                                          label="Save"
                                          size="sm"
                                          variant="outline"
                                          className="h-9 text-[10px] font-bold uppercase tracking-wider"
                                        />
                                        <LockedProFeatureButton
                                          feature="Load Album DNA"
                                          benefit="Reload a saved Album DNA profile into World / Emotion / Message."
                                          icon={FolderOpen}
                                          label="Load"
                                          size="sm"
                                          variant="outline"
                                          className="h-9 text-[10px] font-bold uppercase tracking-wider"
                                        />
                                      </>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-emerald-600 hover:bg-emerald-500/10 rounded-xl" onClick={() => setStrainMixerOpen(true)} disabled={albumTierLocked}>
                                        <ArrowRightLeft className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className={cn('px-8 pb-10 space-y-6 font-code', albumTierLocked && 'opacity-70 pointer-events-none')}>
                                {[
                                    { id: 'setting_world', label: 'WORLD BUILDING', placeholder: 'The setting of this album...' },
                                    { id: 'emotion_core', label: 'EMOTIONAL CORE', placeholder: 'The primary feeling...' },
                                    { id: 'message_truth', label: 'MESSAGE TRUTH', placeholder: 'The ultimate truth...' }
                                ].map(f => (
                                    <div key={f.id} className="space-y-2">
                                        <Label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{f.label}</Label>
                                        <Textarea 
                                            placeholder={f.placeholder} 
                                            className="bg-background/40 border-emerald-500/10 min-h-[80px] text-xs leading-relaxed focus:border-emerald-500/40" 
                                            value={album.direction?.[f.id as keyof Direction] as string || ''}
                                            onChange={(e) => handleDirectionUpdate(f.id as any, e.target.value)}
                                            readOnly={albumTierLocked}
                                        />
                                    </div>
                                ))}
                                <div className="space-y-2 pt-4 border-t border-emerald-500/15">
                                  <Label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                                    Album motifs (ledger)
                                  </Label>
                                  <p className="text-[9px] text-muted-foreground leading-snug">
                                    One line per motif the album owes — not a repeat checklist. Open means it never landed in lyrics yet.
                                  </p>
                                  <Textarea
                                    placeholder="Neon rain&#10;Father&apos;s voicemail&#10;Empty highway"
                                    className="bg-background/40 border-emerald-500/10 min-h-[88px] text-xs leading-relaxed focus:border-emerald-500/40 font-code"
                                    value={(album.thingsToSay ?? []).join('\n')}
                                    readOnly={albumTierLocked}
                                    onChange={(e) => {
                                      const lines = e.target.value
                                        .split('\n')
                                        .map((l) => l.trim())
                                        .filter(Boolean);
                                      handleAlbumUpdate({ thingsToSay: lines });
                                    }}
                                  />
                                  {album.tracks?.[0] ? (
                                    <AlbumMotifDebtsPanel
                                      album={album}
                                      track={{ ...album.tracks[0], id: '__album_overview__' }}
                                      compact
                                    />
                                  ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!isUnassignedVault && (
                        <div className="pt-8">
                            <Button 
                              variant="ghost" 
                              disabled={albumTierLocked}
                              className="w-full h-11 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 font-bold uppercase text-[10px] tracking-widest disabled:opacity-40" 
                              onClick={() => {
                                if (albumTierLocked) { toast(TIER_LIMIT_LOCKED_TOAST); return; }
                                if(confirm("PERMANENT DATA WIPE: Are you absolutely sure you want to delete this entire album blueprint and all associated tracks? This cannot be undone.")) { deleteAlbum(albumId); router.push(vaultHref()); }
                              }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Album
                            </Button>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {strainMixerOpen && <DNAStrainMixerDialog open={strainMixerOpen} onOpenChange={setStrainMixerOpen} album={album} onApply={(dir) => handleAlbumUpdate({ direction: { ...album.direction, ...dir } })} />}

      <AlbumDnaVaultDialog
        open={loadDnaVaultOpen}
        onOpenChange={setLoadDnaVaultOpen}
        presets={album.dnaPresets || []}
        onLoad={requestLoadAlbumDnaPreset}
        onDelete={handleDeleteDnaPreset}
      />
      {editCoverArtDialogOpen && <EditCoverArtDialog album={album} onOpenChange={setEditCoverArtDialogOpen} />}
      {createTrackOpen && (
        <CreateTrackDialog
          open={createTrackOpen}
          onOpenChange={setCreateTrackOpen}
          albumId={albumId}
          albums={albums}
        />
      )}
      {!isUnassignedVault && (
        <AddBlankSheetsDialog
          open={blankSheetsOpen}
          onOpenChange={setBlankSheetsOpen}
          albumId={albumId}
        />
      )}
      
      <ExportDialog 
        open={exportDialogOpen} 
        onOpenChange={setExportDialogOpen} 
        album={album} 
        tracks={album.tracks} 
        exportType="album" 
      />
      
      <AlertDialog open={!!trackToDelete} onOpenChange={(o) => !o && setTrackToDelete(null)}>
          <AlertDialogContent className="bg-card border-2">
              <AlertDialogHeader>
                  <AlertDialogTitle className="font-headline text-2xl text-red-500 uppercase">Scrap Lyrical Asset?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-code">Are you sure you want to permanently delete "{trackToDelete?.title}"? This cannot be recovered.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if(trackToDelete) { deleteTrack(albumId, trackToDelete.id); setTrackToDelete(null); toast({ title: "Track Scrapped" }); } }} className="bg-red-600 hover:bg-red-700 font-bold">Scrap Asset</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExtractOpen} onOpenChange={setConfirmExtractOpen}>
        <AlertDialogContent className="bg-card border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl uppercase text-emerald-500">
              Overwrite Album DNA?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-code">
              Extract will replace World Building, Emotional Core, and Message Truth with a new
              album-wide synthesis ({AI_COSTS.extractAlbumDna} Ink).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-bold bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setConfirmExtractOpen(false);
                void runExtractAlbumDna();
              }}
            >
              Extract & overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmLoadPresetIdx !== null}
        onOpenChange={(o) => !o && setConfirmLoadPresetIdx(null)}
      >
        <AlertDialogContent className="bg-card border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl uppercase text-emerald-500">
              Load Album DNA?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-code">
              This will overwrite World Building, Emotional Core, and Message Truth with the saved
              profile
              {confirmLoadPresetIdx != null && album.dnaPresets?.[confirmLoadPresetIdx]
                ? ` “${album.dnaPresets[confirmLoadPresetIdx].name}”`
                : ''}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-bold bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (confirmLoadPresetIdx != null) applyLoadAlbumDnaPreset(confirmLoadPresetIdx);
              }}
            >
              Load & overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArchivalNamingDialog
        open={saveAlbumDnaOpen}
        onOpenChange={setSaveAlbumDnaOpen}
        type="DNA"
        sourceTrackTitle={album.title}
        profileLabel="ALBUM DNA Profile"
        onConfirm={handleSaveAlbumDna}
      />

      {user && showDowngradePicker && (
        <DowngradeTrackPickerDialog
          open
          albums={albums}
          userId={user.id}
          onComplete={() => setDowngradePickerDone(true)}
        />
      )}
    </TooltipProvider>
  );
}
