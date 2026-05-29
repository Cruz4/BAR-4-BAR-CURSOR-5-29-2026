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
  Sparkles
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
import { TooltipProvider } from './ui/tooltip';
import { DataContext } from '@/context/data-context';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

function CreateTrackDialog({ open, onOpenChange, albumId }: { open: boolean, onOpenChange: (open: boolean) => void, albumId: string }) {
    const [title, setTitle] = useState('');
    const [showChoice, setShowChoice] = useState(false);
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const { addTrack } = useContext(DataContext);
    const { user } = useAuth();
    const router = useRouter();

    const handleCreate = async (mode: 'blank' | 'workstation' = 'blank') => {
        if (!user) return;
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
            };
            const created = addTrack(albumId, newTrack);
            if (mode === 'workstation') router.push(`/albums/${albumId}/tracks/${created.id}?openGenerator=true`);
            else router.push(`/albums/${albumId}/tracks/${created.id}`);
            onOpenChange(false);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: (e as Error).message });
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
                        <Button variant="outline" className="h-40 flex flex-col gap-3 p-6" onClick={() => handleCreate('blank')}>
                            <NotebookPen className="h-8 w-8 text-muted-foreground" />
                            <div className="text-center"><p className="font-bold uppercase tracking-widest text-xs">Blank Station</p></div>
                        </Button>
                        <Button className="h-40 flex flex-col gap-3 p-6 bg-primary/5 border-primary/20" onClick={() => handleCreate('workstation')}>
                            <Sparkles className="h-8 w-8 text-primary" />
                            <div className="text-center"><p className="font-bold uppercase tracking-widest text-xs">Enter Workstation</p></div>
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 800 * 1024) { toast({ variant: "destructive", title: "Image too large" }); return; }
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => { startSavingTransition(() => { updateAlbum(album.id, { coverArtUrl: imagePreview || undefined }); toast({ title: 'Cover updated!' }); onOpenChange(false); }); }

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Edit Album Cover</DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-tight font-code">Update the visual representation of this project.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-48 h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-muted/20 relative overflow-hidden">
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Preview" width={192} height={192} className="object-cover w-full h-full" />
                            ) : (
                                <>
                                    <img src="/Logo.png" alt="B4B" className="w-12 h-12 opacity-20 mb-2" />
                                    <p className="text-[8px] font-bold uppercase text-muted-foreground">Recommended: 1000 x 1000px</p>
                                </>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Change Image</Button>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleSave} disabled={isSaving}>Save Changes</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AlbumDetailContent({ albumId }: { albumId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { getAlbumById, updateAlbum, deleteTrack, loading, moveTrack, deleteAlbum, albums } = useContext(DataContext);
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
  
  const handleAlbumUpdate = (updates: Partial<Album>) => { if (album) updateAlbum(album.id, updates); }
  const handleDirectionUpdate = (field: keyof Direction, value: string) => { if (album) handleAlbumUpdate({ direction: { ...(album.direction || {}), [field]: value } }); };

  const handleReorderTrack = (id: string, direction: 'up' | 'down') => {
      if (!album) return;
      const idx = album.tracks.findIndex(t => t.id === id);
      if (idx === -1) return;
      const newTracks = [...album.tracks];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newTracks.length) return;
      [newTracks[idx], newTracks[targetIdx]] = [newTracks[targetIdx], newTracks[idx]];
      handleAlbumUpdate({ tracks: newTracks });
  };

  const handleUnassignTrack = (trackId: string) => {
      moveTrack(trackId, albumId, 'unassigned');
      toast({ title: "Track Unassigned", description: "Moved to Loose Tracks vault." });
  };

  const formattedCreationDate = useMemo(() => {
    if (!album?.createdAt) return 'Initialized';
    const date = new Date(album.createdAt);
    return isNaN(date.getTime()) ? 'Initialized' : format(date, 'MMM d, yyyy');
  }, [album?.createdAt]);

  const isUnassignedVault = album?.id === 'unassigned';
  const realAlbums = albums.filter(a => a.id !== 'unassigned');

  if (loading || !album) return <div className="flex h-screen items-center justify-center bg-[#0a121e]"><Loader className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <TooltipProvider>
      <div className="container mx-auto px-6 py-10 relative min-h-screen selection:bg-primary/30 overflow-x-hidden bg-[#0a121e]">
        <div className="absolute inset-0 top-0 bottom-0 left-0 right-0 pointer-events-none">
            <div className="h-full w-full bg-[repeating-linear-gradient(theme(colors.border/.4),theme(colors.border/.4)_1px,transparent_1px,transparent_24px)] opacity-50"></div>
            <div className="absolute inset-y-0 left-0 w-px bg-primary/20 ml-12 md:ml-24"></div>
        </div>
        
        <div className="relative z-10 pl-16 md:pl-32">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="mb-6 -ml-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                <ChevronLeft className="mr-2 h-4 w-4" /> Collection
            </Button>

            <div className="flex flex-col lg:flex-row items-start justify-between gap-12 mb-16">
                <div className="flex-grow w-full space-y-4">
                    <Input 
                        defaultValue={album.title} 
                        onBlur={(e) => updateAlbum(album.id, { title: e.target.value })} 
                        className="text-5xl md:text-7xl font-headline font-bold text-white bg-transparent border-0 p-0 focus-visible:ring-0 h-auto tracking-tighter uppercase leading-none" 
                    />
                    <Textarea 
                        defaultValue={album.theme} 
                        onBlur={(e) => updateAlbum(album.id, { theme: e.target.value })} 
                        className="text-xl text-muted-foreground bg-transparent border-0 p-0 focus-visible:ring-0 font-code min-h-[60px] resize-none leading-relaxed italic" 
                        placeholder="Album concept..."
                    />
                    <div className="flex items-center gap-4 pt-2">
                        <span className="text-[10px] font-code text-muted-foreground/60 uppercase">Created {formattedCreationDate}</span>
                    </div>
                </div>
                
                {!isUnassignedVault && (
                    <div className="relative group shrink-0">
                        <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-4 border-white/5 bg-neutral-900 flex flex-col items-center justify-center relative">
                            {album.coverArtUrl ? (
                                <Image src={album.coverArtUrl} alt="Cover" width={256} height={256} className="object-cover w-full h-full" priority />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <img src="/Logo.png" alt="B4B" className="w-16 h-16 opacity-10" />
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">1000 x 1000px</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                <Button variant="secondary" size="sm" onClick={() => setEditCoverArtDialogOpen(true)} className="h-10 px-6 font-bold text-xs rounded-xl shadow-2xl">
                                    <Pencil className="mr-2 h-4 w-4" /> {album.coverArtUrl ? 'Change Cover' : 'Upload Cover'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pb-40">
                <div className="lg:col-span-2 space-y-10">
                    <Card className="bg-black/40 border-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                    {isUnassignedVault ? <CassetteTape className="h-8 w-8 text-primary" /> : <ListMusic className="h-8 w-8 text-primary" />}
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-3xl uppercase tracking-tighter">{isUnassignedVault ? 'Idea Vault' : 'Tracklist'}</CardTitle>
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Asset Reordering & Management</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={() => setCreateTrackOpen(true)} className="h-9 px-6 font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Track
                                </Button>
                                <Button variant="outline" size="sm" className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest border-white/10 rounded-xl bg-white/5" onClick={() => setExportDialogOpen(true)}>
                                    <FileDown className="mr-2 h-4 w-4" /> Export All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-white/5">
                                {album.tracks?.length > 0 ? album.tracks.map((track, index) => (
                                    <div key={track.id} className="group flex items-center p-6 hover:bg-primary/5 transition-all">
                                        <div className="text-muted-foreground font-code text-xl mr-6 w-8 text-right opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <Link href={`/albums/${album.id}/tracks/${track.id}`} className="flex-grow min-w-0">
                                            <p className="font-bold font-headline text-2xl text-white uppercase tracking-tight group-hover:text-primary transition-colors">{track.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-white/10 text-muted-foreground font-code">{track.vibe?.genre}</Badge>
                                                <span className="text-[9px] text-muted-foreground/60 font-code uppercase">{track.vibe?.tempoBPM} BPM</span>
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!isUnassignedVault && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => handleReorderTrack(track.id, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => handleReorderTrack(track.id, 'down')} disabled={index === album.tracks.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                                                </>
                                            )}
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
                                                                            <DropdownMenuItem key={targetAlbum.id} onClick={() => { moveTrack(track.id, 'unassigned', targetAlbum.id); toast({ title: "Track Assigned", description: `"${track.title}" moved to ${targetAlbum.title}.` }); }} className="text-[10px] font-bold uppercase">
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
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-6 opacity-30">
                                        <CassetteTape className="h-16 w-16" />
                                        <p className="font-code text-sm uppercase tracking-[0.4em]">No tracks in this blueprint</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-10">
                    {!isUnassignedVault && (
                        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-2xl rounded-2xl">
                            <CardHeader className="flex flex-row items-center justify-between p-8">
                                <div className="flex flex-col">
                                    <CardTitle className="font-headline text-2xl flex items-center gap-3 text-emerald-500 uppercase tracking-tighter"><Compass className="h-6 w-6" /> Album DNA</CardTitle>
                                    <CardDescription className="text-[9px] uppercase font-bold tracking-widest text-emerald-600/60 mt-1">Foundational Alignment</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-emerald-600 hover:bg-emerald-500/10 rounded-xl" onClick={() => setStrainMixerOpen(true)}>
                                    <ArrowRightLeft className="h-5 w-5" />
                                </Button>
                            </CardHeader>
                            <CardContent className="px-8 pb-10 space-y-6 font-code">
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
                              className="w-full h-11 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 font-bold uppercase text-[10px] tracking-widest" 
                              onClick={() => { if(confirm("PERMANENT DATA WIPE: Are you absolutely sure you want to delete this entire album blueprint and all associated tracks? This cannot be undone.")) { deleteAlbum(albumId); router.push('/'); } }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Album
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {strainMixerOpen && <DNAStrainMixerDialog open={strainMixerOpen} onOpenChange={setStrainMixerOpen} album={album} onApply={(dir) => handleAlbumUpdate({ direction: { ...album.direction, ...dir } })} />}
      {editCoverArtDialogOpen && <EditCoverArtDialog album={album} onOpenChange={setEditCoverArtDialogOpen} />}
      {createTrackOpen && <CreateTrackDialog open={createTrackOpen} onOpenChange={setCreateTrackOpen} albumId={albumId} />}
      
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
    </TooltipProvider>
  );
}
