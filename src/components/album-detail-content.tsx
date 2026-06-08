'use client';

import React, { useState, useTransition, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Album, Track, Direction } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DnaDropLiveIndicator } from '@/components/dna-drop-live-indicator';
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
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Zap,
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
  Globe,
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
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { ExportDialog } from './export-dialog';
import { ShareDialog } from './share-dialog';
import { TooltipProvider } from './ui/tooltip';
import { DataContext } from '@/context/data-context';
import { useAuth } from '@/hooks/use-auth';
import {
  canUserAddTrack,
  countUserTracks,
  FreeTrackLimitError,
  FREE_TRACK_LIMIT,
  FREE_TRACK_LIMIT_TOAST,
  isProOrTrial,
} from '@/lib/subscription';
import {
  getEditableTrackIds,
  isAlbumOverTierLimit,
  isTrackOverTierLimit,
  TIER_LIMIT_ALBUM_BANNER,
  TIER_LIMIT_LOCKED_TOAST,
} from '@/lib/tier-limits';
import { LockedProFeatureButton, ProCreateTrackSlot, proLockText } from '@/components/pro-lock';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { format } from 'date-fns';
import { countRhymeBars } from '@/lib/lyrics-units';
import { cn } from '@/lib/utils';
import { isDataUrl } from '@/lib/cover-art';
import {
  processCoverArtFile,
  COVER_ART_EXPORT_SIZE,
  COVER_ART_MIN_DIMENSION,
} from '@/lib/cover-art';

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
    const [isCreating, setIsCreating] = useState(false);
    const { addTrack } = useContext(DataContext);
    const { user } = useAuth();
    const router = useRouter();

    const handleCreate = async (mode: 'blank' | 'workstation' = 'blank') => {
        if (!user) return;
        if (!canUserAddTrack(albums, user)) {
            trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, {
              limitType: 'track',
              count: countUserTracks(albums),
            });
            toast(FREE_TRACK_LIMIT_TOAST);
            router.push('/usage?tab=cloud');
            onOpenChange(false);
            return;
        }
        setIsCreating(true);
        try {
            const newTrack: Omit<Track, 'id'> = {
                albumId,
                ownerId: user.id,
                title: title || 'Untitled Track',
                vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'] },
                intentRefs: [],
                sections: [{ id: `section-${Date.now()}`, type: 'verse', bars: [{ idx: 1, text: '', accepted: true, syllables: 0, rhymeKey: '?' }] }],
                status: 'in_progress',
                createdAt: new Date().toISOString(),
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
                trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, {
                  limitType: 'track',
                  count: countUserTracks(albums),
                });
                toast(FREE_TRACK_LIMIT_TOAST);
                router.push('/usage?tab=cloud');
            } else {
                toast({ variant: 'destructive', title: 'Creation Failed', description: (e as Error).message });
            }
        } finally {
            setIsCreating(false);
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

function DNAStrainMixerDialog({ open, onOpenChange, album, onApply }: { open: boolean, onOpenChange: (open: boolean) => void, album: Album, onApply: (dir: Partial<Direction>) => void }) {
    const { user } = useAuth();
    const presets = album.dnaPresets || [];
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
                    <DialogDescription className="font-code text-[11px] uppercase tracking-[0.3em] text-emerald-600/60 mt-1">Select individual strains from your saved profiles to build a hybrid foundation.</DialogDescription>
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
                                            {presets.map((p, i) => (
                                                <SelectItem key={i} value={String(i)} className="text-[10px] font-bold uppercase">{p.name}</SelectItem>
                                            ))}
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
    const { user } = useAuth();
    const { updateAlbum } = useContext(DataContext);
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [imagePreview, setImagePreview] = useState<string | null>(album.coverArtUrl || null);
    const [processingCover, setProcessingCover] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (user?.subscriptionStatus !== 'active') {
        return (
            <Dialog open={true} onOpenChange={onOpenChange}>
                <DialogContent className="bg-card border-2 text-center p-12">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-bold uppercase">Pro Feature Locked</DialogTitle>
                        <DialogDescription className="text-xs uppercase tracking-tight font-code mt-2">Upgrade required to use custom cover art.</DialogDescription>
                    </DialogHeader>
                    <Lock className="mx-auto h-12 w-12 text-primary mb-6" />
                    <p className="text-muted-foreground font-code mb-8">Custom cover art is restricted to Studio Residents. Upgrade to personalize your project.</p>
                    <Button onClick={() => window.location.href = '/pricing'}>View Studio Tiers</Button>
                </DialogContent>
            </Dialog>
        );
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setProcessingCover(true);
        try {
            const { dataUrl } = await processCoverArtFile(file);
            setImagePreview(dataUrl);
            toast({
                title: 'Cover optimized',
                description: `Saved as ${COVER_ART_EXPORT_SIZE}×${COVER_ART_EXPORT_SIZE} for sharp vault & DNA Drop display.`,
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
                        Square cover, min {COVER_ART_MIN_DIMENSION}px per side — we export {COVER_ART_EXPORT_SIZE}×{COVER_ART_EXPORT_SIZE} for vault vinyls and DNA Drops.
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
                                    <img src="/Logo.png" alt="B4B" className="w-12 h-12 opacity-20 mb-2" />
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
      <Card className="overflow-hidden rounded-2xl border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-black/50 to-primary/10 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-lg uppercase tracking-tight text-white">Vault Snapshot</CardTitle>
          <CardDescription className="text-[9px] uppercase tracking-widest font-bold text-sky-400/80">
            Singles waiting for a home
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 pb-5">
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
            <p className="font-headline text-2xl text-white">{tracks.length}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Tracks</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
            <p className="font-headline text-2xl text-white">{totalBars}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Bars</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
            <p className="font-headline text-2xl text-white">{realAlbums.length}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Albums</p>
          </div>
        </CardContent>
        {genreCounts.length > 0 && (
          <div className="border-t border-white/5 px-5 py-4 flex flex-wrap gap-2">
            {genreCounts.map(([genre, count]) => (
              <Badge key={genre} variant="outline" className="text-[8px] border-sky-500/25 text-sky-300 font-code">
                {genre} · {count}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-2xl border-white/10 bg-black/40 backdrop-blur-xl shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="font-headline text-lg uppercase tracking-tight text-white flex items-center gap-2">
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
                    className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-neutral-900 overflow-hidden flex items-center justify-center">
                      {targetAlbum.coverArtUrl ? (
                        <Image src={targetAlbum.coverArtUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        <ListMusic className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-headline text-sm uppercase text-white truncate">{targetAlbum.title}</p>
                      <p className="text-[9px] font-code text-muted-foreground uppercase">
                        {targetAlbum.tracks?.length ?? 0} track{(targetAlbum.tracks?.length ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-white/10 w-56 max-h-64 overflow-y-auto">
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
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center space-y-3">
              <p className="text-[10px] font-code text-muted-foreground uppercase tracking-widest">No albums yet</p>
              <Button variant="outline" size="sm" asChild className="text-[9px] font-bold uppercase">
                <Link href="/">Create from The Vault</Link>
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
    <div className="group relative flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-black/60 via-black/40 to-primary/[0.06] p-5 hover:border-primary/35 hover:shadow-[0_0_32px_rgba(59,130,246,0.12)] transition-all min-h-[168px]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-code text-sm text-primary/70 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
        {!tierLocked && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white opacity-70 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-white/10 w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-[10px] font-bold uppercase">
                  <Move className="mr-2 h-4 w-4" /> Move To Album
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-card border-white/10">
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
              <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:text-red-500 text-[10px] font-bold uppercase">
                <Trash2 className="mr-2 h-4 w-4" /> Scrap Asset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {tierLocked && (
          <Badge variant="outline" className={cn('text-[7px] px-1.5 h-5', proLockText())}>View only</Badge>
        )}
      </div>

      <Link href={`/albums/${albumId}/tracks/${track.id}`} className="flex flex-col flex-1 min-w-0">
        <p className="font-headline text-xl md:text-2xl text-white uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2">
          {track.title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <DnaDropLiveIndicator shareId={track.shareId} variant="badge" />
          <Badge variant="outline" className="h-5 px-2 text-[8px] border-white/10 text-muted-foreground font-code">
            {track.vibe?.genre || 'No genre'}
          </Badge>
          <span className="text-[9px] text-muted-foreground/70 font-code uppercase">{track.vibe?.tempoBPM ?? '—'} BPM</span>
        </div>
        <p className="text-[9px] font-code text-muted-foreground/80 uppercase tracking-widest mt-auto pt-4">
          {barCount} bar{barCount === 1 ? '' : 's'} · {sectionCount} section{sectionCount === 1 ? '' : 's'}
        </p>
      </Link>
    </div>
  );
}

export function AlbumDetailContent({ albumId }: { albumId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPro = isProOrTrial(user);
  const { getAlbumById, updateAlbum, deleteTrack, loading, moveTrack, deleteAlbum, albums } = useContext(DataContext);
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
      toast(FREE_TRACK_LIMIT_TOAST);
      router.push('/usage?tab=cloud');
      return;
    }
    setCreateTrackOpen(true);
  };
  const [album, setAlbum] = useState<Album | null>(null);

  useEffect(() => {
    if (!loading) {
      const currentAlbum = getAlbumById(albumId);
      if (currentAlbum) setAlbum(currentAlbum);
      else { setTimeout(() => { if (!getAlbumById(albumId)) router.push('/'); }, 1000); }
    }
  }, [albumId, loading, getAlbumById, router]);

  const [editCoverArtDialogOpen, setEditCoverArtDialogOpen] = useState(false);
  const [strainMixerOpen, setStrainMixerOpen] = useState(false);
  const [createTrackOpen, setCreateTrackOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
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
      handleAlbumUpdate({ tracks: newTracks });
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

  if (loading || !album) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <TooltipProvider>
      <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-10 relative min-h-screen selection:bg-primary/30 overflow-x-hidden">
        <div className="absolute inset-0 top-0 bottom-0 left-0 right-0 pointer-events-none">
            <div className="h-full w-full bg-[repeating-linear-gradient(theme(colors.border/.4),theme(colors.border/.4)_1px,transparent_1px,transparent_24px)] opacity-50"></div>
            <div className="absolute inset-y-0 left-0 w-px bg-primary/20 ml-12 md:ml-24 hidden sm:block"></div>
        </div>
        
        <div className="relative z-10 min-w-0 md:pl-32">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="mb-4 sm:mb-6 -ml-1 sm:-ml-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                <ChevronLeft className="mr-2 h-4 w-4" /> Collection
            </Button>

            {albumTierLocked && (
              <div className="mb-6 rounded-xl border border-pink-500/25 bg-pink-500/10 px-4 py-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-pink-400 shrink-0" />
                <p className={cn('text-[10px] font-code leading-snug', proLockText())}>{TIER_LIMIT_ALBUM_BANNER}</p>
              </div>
            )}

            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 sm:gap-8 mb-8 sm:mb-12">
                <div className={cn('space-y-3 sm:space-y-4 min-w-0 w-full', isUnassignedVault ? 'lg:max-w-2xl' : 'flex-grow')}>
                    <Input 
                        defaultValue={album.title} 
                        readOnly={albumTierLocked}
                        onBlur={(e) => !albumTierLocked && handleAlbumUpdate({ title: e.target.value })} 
                        className={cn(
                          'text-3xl sm:text-5xl md:text-7xl font-headline font-bold text-white bg-transparent border-0 p-0 focus-visible:ring-0 h-auto tracking-tighter uppercase leading-none w-full max-w-full',
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
                        <DnaDropLiveIndicator shareId={album.shareId} variant="badge" />
                    </div>
                </div>
                
                {!isUnassignedVault ? (
                    <div className="relative group shrink-0 w-full sm:w-auto flex justify-center lg:justify-end">
                        <div className="absolute top-2 right-2 z-20 sm:top-3 sm:right-3">
                          <DnaDropLiveIndicator shareId={album.shareId} variant="dot" />
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
                                    <img src="/Logo.png" alt="B4B" className="w-16 h-16 opacity-10" />
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
                    <div className="w-full lg:w-[min(100%,340px)] shrink-0 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-black/50 to-primary/10 p-5 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/25">
                                <CassetteTape className="h-6 w-6 text-sky-400" />
                            </div>
                            <div>
                                <p className="font-headline text-lg uppercase text-white tracking-tight">Idea Shelf</p>
                                <p className="text-[9px] font-code text-muted-foreground uppercase tracking-widest">Unassigned workspace</p>
                            </div>
                        </div>
                        <p className="text-[11px] font-code text-muted-foreground leading-relaxed">
                            Drafts live here until you slot them into an album. Open any card to write, or assign from the shelf on the right.
                        </p>
                    </div>
                )}
            </div>

            <div className={cn('grid gap-8 pb-40', isUnassignedVault ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1 lg:grid-cols-3')}>
                <div className={cn('space-y-10', isUnassignedVault ? 'xl:col-span-8' : 'lg:col-span-2')}>
                    <Card className="bg-black/40 border-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-2xl min-w-0">
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 sm:p-6 md:p-8 border-b border-white/5">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 shrink-0">
                                <div className="p-2 sm:p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0">
                                    {isUnassignedVault ? <CassetteTape className="h-6 w-6 sm:h-8 sm:w-8 text-primary" /> : <ListMusic className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />}
                                </div>
                                <div className="min-w-0">
                                    <CardTitle className="font-headline text-lg sm:text-xl md:text-2xl lg:text-3xl uppercase tracking-tighter whitespace-nowrap">{isUnassignedVault ? 'Idea Vault' : 'Tracklist'}</CardTitle>
                                    <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5 whitespace-nowrap">Asset Reordering & Management</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end shrink-0">
                                <Button
                                  onClick={openCreateTrack}
                                  disabled={!canAddTrack}
                                  className="h-9 px-3 sm:px-6 font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 flex-1 sm:flex-none min-w-0"
                                >
                                    <PlusCircle className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" /> Add Track
                                </Button>
                                <Button variant="outline" size="sm" className="h-9 px-3 sm:px-4 font-bold text-[10px] uppercase tracking-widest border-white/10 rounded-xl bg-white/5 flex-1 sm:flex-none min-w-0" onClick={() => setExportDialogOpen(true)}>
                                    <FileDown className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" /> Export
                                </Button>
                                {!isUnassignedVault && (
                                  isPro ? (
                                    <Button variant="outline" size="sm" className="h-9 px-3 sm:px-4 font-bold text-[10px] uppercase tracking-widest border-primary/30 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 flex-1 sm:flex-none min-w-0" onClick={() => setShareDialogOpen(true)}>
                                      <Globe className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" /> DNA Drop
                                    </Button>
                                  ) : (
                                    <LockedProFeatureButton
                                      feature="DNA Drop"
                                      benefit="Publish a shareable link to your album blueprint for collab and feedback."
                                      icon={Globe}
                                      iconClassName="text-primary"
                                      label="DNA Drop"
                                      variant="outline"
                                      className="h-9 px-3 sm:px-4 font-bold text-[10px] uppercase tracking-widest flex-1 sm:flex-none min-w-0 border-primary/30 bg-primary/5 text-primary"
                                    />
                                  )
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className={cn(isUnassignedVault ? 'p-6' : 'p-0')}>
                            {album.tracks?.length > 0 ? (
                              isUnassignedVault ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {album.tracks.map((track, index) => (
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
                                <div className="divide-y divide-white/5">
                                {album.tracks.map((track, index) => {
                                  const trackTierLocked = albumTierLocked || !editableTrackIds.has(track.id);
                                  return (
                                    <div key={track.id} className="group flex flex-col gap-3 sm:flex-row sm:items-center p-4 sm:p-6 hover:bg-primary/5 transition-all min-w-0">
                                        <div className="flex items-start gap-3 sm:gap-0 min-w-0 flex-1 w-full">
                                        <div className="text-muted-foreground font-code text-base sm:text-xl sm:mr-6 w-7 sm:w-8 text-right opacity-60 sm:opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0 pt-0.5">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <Link href={`/albums/${album.id}/tracks/${track.id}`} className="flex-grow min-w-0">
                                            <p className="font-bold font-headline text-lg sm:text-2xl text-white uppercase tracking-tight group-hover:text-primary transition-colors break-words">{track.title}</p>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                                                <DnaDropLiveIndicator shareId={track.shareId} variant="compact" />
                                                {trackTierLocked && (
                                                  <Badge variant="outline" className={cn('h-4 px-1.5 text-[8px]', proLockText())}>View only</Badge>
                                                )}
                                                <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-white/10 text-muted-foreground font-code">{track.vibe?.genre}</Badge>
                                                <span className="text-[9px] text-muted-foreground/60 font-code uppercase">{track.vibe?.tempoBPM} BPM</span>
                                            </div>
                                        </Link>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end sm:justify-start opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 pl-10 sm:pl-0">
                                            {!isUnassignedVault && !trackTierLocked && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => handleReorderTrack(track.id, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => handleReorderTrack(track.id, 'down')} disabled={index === album.tracks.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                                </>
                                            )}
                                            {!trackTierLocked && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white"><MoreVertical className="h-5 w-5" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-card border-white/10 w-48">
                                                    {isUnassignedVault ? (
                                                        <>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger className="text-[10px] font-bold uppercase"><Move className="mr-2 h-4 w-4" /> Move To Album</DropdownMenuSubTrigger>
                                                                <DropdownMenuPortal>
                                                                    <DropdownMenuSubContent className="bg-card border-white/10">
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
                              )
                            ) : isUnassignedVault && isPro ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <ProCreateTrackSlot onClick={openCreateTrack} />
                                    </div>
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-6 opacity-30">
                                        <CassetteTape className="h-16 w-16" />
                                        <p className="font-code text-sm uppercase tracking-[0.4em]">No tracks in this blueprint</p>
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </div>

                <div className={cn(isUnassignedVault ? 'xl:col-span-4 space-y-6' : 'space-y-10')}>
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
                            <CardHeader className="flex flex-row items-center justify-between p-8">
                                <div className="flex flex-col">
                                    <CardTitle className="font-headline text-2xl flex items-center gap-3 text-emerald-500 uppercase tracking-tighter"><Compass className="h-6 w-6" /> Album DNA</CardTitle>
                                    <CardDescription className="text-[9px] uppercase font-bold tracking-widest text-emerald-600/60 mt-1">Foundational Alignment</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-emerald-600 hover:bg-emerald-500/10 rounded-xl" onClick={() => setStrainMixerOpen(true)} disabled={albumTierLocked}>
                                    <ArrowRightLeft className="h-5 w-5" />
                                </Button>
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
                                if(confirm("PERMANENT DATA WIPE: Are you absolutely sure you want to delete this entire album blueprint and all associated tracks? This cannot be undone.")) { deleteAlbum(albumId); router.push('/'); }
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
      {editCoverArtDialogOpen && <EditCoverArtDialog album={album} onOpenChange={setEditCoverArtDialogOpen} />}
      {createTrackOpen && (
        <CreateTrackDialog
          open={createTrackOpen}
          onOpenChange={setCreateTrackOpen}
          albumId={albumId}
          albums={albums}
        />
      )}
      
      <ExportDialog 
        open={exportDialogOpen} 
        onOpenChange={setExportDialogOpen} 
        album={album} 
        tracks={album.tracks} 
        exportType="album" 
      />
      {!isUnassignedVault && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          type="album"
          id={album.id}
          title={album.title}
          existingShareId={album.shareId}
        />
      )}

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
    </TooltipProvider>
  );
}
