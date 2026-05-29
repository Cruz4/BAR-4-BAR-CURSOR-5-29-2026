'use client';

/**
 * @fileOverview MASTER LOCKDOWN (5/22/2026) - Real-Time Search & Vinyl Collection.
 * 
 * - LOGIC: Word-Boundary Quote Protocol (\bphrase\b).
 * - UI: Compact Loose Track Bars (py-4) with Minimize Toggle.
 * - SORT: Unified sorting logic applied to both Albums and Loose Tracks.
 * - MANAGEMENT: Move/Delete triggers for Unassigned Vault.
 * - FIX (5/23): Restored Track creation trigger to the Create New dropdown.
 * - UPDATE (5/29): Renamed main title to ALBUMS as requested.
 */

import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    PlusCircle, 
    Music, 
    BrainCircuit, 
    Sparkles, 
    Download, 
    Trash2, 
    MoreVertical, 
    Move, 
    CassetteTape, 
    HelpCircle, 
    NotebookPen, 
    Wand2, 
    Waves,
    Search,
    ArrowUpDown,
    X,
    ChevronRight,
    Import,
    ShieldAlert,
    Timer,
    SortDesc,
    SortAsc,
    ArrowRightLeft,
    Clock,
    Loader,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Album, Track } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { DataContext } from '@/context/data-context';
import { useRouter } from 'next/navigation';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { StudioLoader } from '@/components/studio-loader';
import { countUserTracks, FREE_ALBUM_LIMIT, FREE_TRACK_LIMIT, isProUser } from '@/lib/subscription';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { LockedVaultSlot, OpenAlbumSlot, OpenTrackSlot, LockedToolbarButton, ProLockBanner, ProCreateAlbumSlot, ProCreateTrackSlot, proLockIcon, proLockText } from '@/components/pro-lock';
import { Lock } from 'lucide-react';

const noiseDataUri = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

function CreateItemDialog({ open, onOpenChange, type }: { open: boolean, onOpenChange: (open: boolean) => void, type: 'Album' | 'Track' }) {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState(''); 
  const [showChoice, setShowChoice] = useState(false);
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const { addAlbum, addTrack, albums, isCloudSyncActive } = useContext(DataContext);
  const { user } = useAuth();
  const router = useRouter();

  const handleInitialSubmit = () => {
    if (!title.trim() || (type === 'Album' && !theme.trim())) {
      toast({ variant: 'destructive', title: 'Missing Information', description: "Please provide all required fields." });
      return;
    }
    if (type === 'Track') setShowChoice(true);
    else handleCreate();
  };

  const handleCreate = async (mode: 'blank' | 'workstation' = 'blank') => {
      const isPro = isProUser(user);
      const albumCount = albums.filter((a) => a.id !== 'unassigned').length;
      const trackCount = countUserTracks(albums);

      if (!isPro) {
          if (type === 'Album' && albumCount >= FREE_ALBUM_LIMIT) {
              trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, { limitType: 'album', count: albumCount });
              toast({ variant: 'destructive', title: 'Album Slot Locked', description: 'Free artists get 1 concept album. Upgrade for unlimited projects.' });
              router.push('/usage?tab=cloud');
              onOpenChange(false);
              return;
          }
          if (type === 'Track' && trackCount >= FREE_TRACK_LIMIT) {
              trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, { limitType: 'track', count: trackCount });
              toast({ variant: 'destructive', title: 'Track Slots Full', description: 'Free artists can work on 2 tracks at a time. Upgrade for unlimited slots.' });
              router.push('/usage?tab=cloud');
              onOpenChange(false);
              return;
          }
      }

      if (!user) return;
      setIsCreating(true);
      
      try {
          if (type === 'Album') {
            const newAlbum: Album = {
                id: `album-${Date.now()}`,
                ownerId: user.id,
                title: title,
                theme: theme,
                createdAt: new Date().toISOString(),
                tracks: [],
                direction: { enabled: true, inheritFromAlbum: true }
            };
            addAlbum(newAlbum);
            router.push(`/albums/${newAlbum.id}`);
          } else { 
            const newTrack: Omit<Track, 'id'> = {
                albumId: 'unassigned',
                ownerId: user.id,
                title: title,
                vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'] },
                intentRefs: [],
                sections: [{ id: `section-${Date.now()}`, type: 'verse', bars: [{ idx: 1, text: '', accepted: true, syllables: 0, rhymeKey: '?' }] }],
                status: 'in_progress',
                createdAt: new Date().toISOString(),
            };
            const created = addTrack('unassigned', { ...newTrack });
            if (mode === 'workstation') router.push(`/albums/unassigned/tracks/${created.id}?openGenerator=true`);
            else router.push(`/albums/unassigned/tracks/${created.id}`);
          }
      } catch (e) {
          toast({ variant: 'destructive', title: 'Creation Failed', description: (e as Error).message });
      } finally {
          onOpenChange(false);
          setIsCreating(false);
          setShowChoice(false);
          setTitle('');
          setTheme('');
      }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if(!o) setShowChoice(false); onOpenChange(o); }}>
      <DialogContent className="w-[90vw] max-w-[500px] rounded-xl bg-card border-2">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{showChoice ? 'Select Workspace Mode' : `Create New ${type}`}</DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">Configure your next studio project.</DialogDescription>
        </DialogHeader>
        {!showChoice ? (
            <>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">Title</Label>
                    <Input id="title" className="col-span-3 font-code" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'Album' ? "Project Title" : "Track Title"} />
                  </div>
                  {type === 'Album' && <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="theme" className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">Theme</Label>
                    <Textarea id="theme" className="col-span-3 font-code" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Album concept..." />
                  </div>}
                </div>
                <DialogFooter><Button onClick={handleInitialSubmit} disabled={isCreating} className="font-bold">Continue</Button></DialogFooter>
            </>
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

function StudioEmptyState({ onCreateAlbum, onCreateTrack }: { onCreateAlbum: () => void; onCreateTrack: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="text-center space-y-4 mb-12">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-2xl">
                    <BrainCircuit className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <h2 className="text-4xl font-headline font-bold text-white uppercase tracking-tighter">Initialize Studio</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em]">Start with a concept album or capture a loose track.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
                <Card className="group cursor-pointer border-2 hover:border-primary/50 transition-all bg-card/60 shadow-2xl" onClick={onCreateAlbum}>
                    <CardHeader className="text-center"><Music className="h-8 w-8 text-primary mx-auto mb-4" /><CardTitle className="font-headline text-2xl uppercase">Concept Album</CardTitle></CardHeader>
                    <CardFooter><Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest group-hover:text-primary">Create Album <ChevronRight className="ml-2 h-3.5 w-3.5" /></Button></CardFooter>
                </Card>
                <Card className="group cursor-pointer border-2 hover:border-primary/50 transition-all bg-card/60 shadow-2xl" onClick={onCreateTrack}>
                    <CardHeader className="text-center"><CassetteTape className="h-8 w-8 text-primary mx-auto mb-4" /><CardTitle className="font-headline text-2xl uppercase">Loose Track</CardTitle></CardHeader>
                    <CardFooter><Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest group-hover:text-primary">Capture Flow <ChevronRight className="ml-2 h-3.5 w-3.5" /></Button></CardFooter>
                </Card>
            </div>
        </div>
    );
}

function FreeVisitorVault({
  sortedLooseTracks,
  filteredAlbums,
  realAlbums,
  onCreateAlbum,
  onCreateTrack,
}: {
  sortedLooseTracks: Track[];
  filteredAlbums: Album[];
  realAlbums: Album[];
  onCreateAlbum: () => void;
  onCreateTrack: () => void;
}) {
  const trackSlots = Array.from({ length: FREE_TRACK_LIMIT }, (_, i) => sortedLooseTracks[i] ?? null);
  const album = filteredAlbums[0] ?? null;

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      <ProLockBanner>
        <p className={cn('text-xs', proLockText())}>Visitor Studio · 1 Album · 2 Tracks</p>
        <p className="text-[10px] text-muted-foreground mt-1">Everything glowing hot pink is Studio Pro — same look, same upgrade path. Open slots and folder icons are yours; system presets load in the editor.</p>
      </ProLockBanner>

      <div className="space-y-6">
        <div className="flex items-center gap-4 border-l-4 border-sky-500 pl-6">
          <h2 className="text-3xl font-headline font-bold text-white uppercase tracking-tighter flex items-center gap-3">
            <CassetteTape className="text-sky-500 h-8 w-8" /> Loose Tracks
          </h2>
          <Badge variant="outline" className="border-sky-500/30 text-sky-400 font-mono">{sortedLooseTracks.length}/{FREE_TRACK_LIMIT}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trackSlots.map((track, i) =>
            track ? (
              <div key={track.id} className="group relative">
                <Link href={`/albums/unassigned/tracks/${track.id}`} className="block py-4 px-6 rounded-2xl bg-black/40 border-2 border-sky-500/30 hover:border-sky-400/60 hover:bg-sky-500/5 transition-all flex items-center justify-between shadow-[0_0_16px_rgba(56,189,248,0.12)]">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2 bg-sky-500/15 rounded-xl border border-sky-500/30">
                      <CassetteTape className="h-5 w-5 text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold font-headline text-base text-white uppercase truncate">{track.title}</p>
                      <p className="text-[8px] text-sky-400/80 uppercase font-code mt-0.5">Open slot · {track.vibe?.genre}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-sky-400 shrink-0" />
                </Link>
              </div>
            ) : (
              <OpenTrackSlot key={`open-track-${i}`} onClick={onCreateTrack} />
            )
          )}
          <LockedVaultSlot variant="track" label="Unlimited Tracks" sublabel="Upgrade for no track cap" />
        </div>
      </div>

      <div className="space-y-10">
        <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-6">
          <h2 className="text-3xl font-headline font-bold text-white uppercase tracking-tighter flex items-center gap-3">
            <Music className="text-emerald-500 h-8 w-8" /> YOUR COLLECTION
          </h2>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono">{realAlbums.length}/{FREE_ALBUM_LIMIT}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-16 px-4">
          {album ? <VinylRecord key={album.id} album={album} /> : <OpenAlbumSlot onClick={onCreateAlbum} />}
          <LockedVaultSlot variant="album" label="Unlimited Albums" sublabel="Upgrade for full vault expansion" />
        </div>
      </div>
    </div>
  );
}

const VinylRecord = ({ album }: { album: Album }) => (
    <Link href={`/albums/${album.id}`} className="group relative aspect-square block">
        <div className="absolute inset-0 bg-neutral-900 rounded-full flex items-center justify-center transition-all duration-700 group-hover:rotate-[360deg] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden border-[6px] border-neutral-800"
             style={{
                 backgroundImage: 'repeating-radial-gradient(circle at center, #1a1a1a 0px, #1a1a1a 2px, #111 4px, #111 5px)'
             }}>
            <div className="relative w-[38%] h-[38%] rounded-full overflow-hidden border-4 border-neutral-700 shadow-inner z-10 bg-neutral-800 flex items-center justify-center">
                {album.coverArtUrl ? (
                    <Image 
                        src={album.coverArtUrl} 
                        alt={album.title} 
                        fill 
                        className="object-cover opacity-90" 
                    />
                ) : (
                    <div className="flex items-center justify-center h-full w-full p-2 bg-neutral-900">
                        <img src="/Logo.png" alt="B4B" className="w-full h-full object-contain opacity-20" />
                    </div>
                )}
                <div className="absolute w-3 h-3 bg-neutral-950 rounded-full border border-white/20 shadow-inner z-20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none rounded-full" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 pointer-events-none translate-y-4 group-hover:translate-y-0">
            <div className="bg-black/90 backdrop-blur-xl px-6 py-3 rounded-full border border-primary/40 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex flex-col items-center">
                <p className="font-headline text-xl font-bold text-white uppercase tracking-tighter text-center leading-none">{album.title}</p>
                <p className="text-[9px] text-primary/60 font-code font-bold uppercase tracking-[0.2em] text-center mt-1">{album.tracks?.length || 0} TRACKS</p>
            </div>
        </div>
    </Link>
);

export function AlbumList() {
  const [createItemType, setCreateItemType] = useState<'Album' | 'Track' | null>(null);
  const { albums, loading, deleteAlbum, deleteTrack, moveTrack, getAlbumById, mergeData, isCloudSyncActive } = useContext(DataContext);
  const { user } = useAuth();
  const isPro = isProUser(user);
  const albumCount = albums.filter((a) => a.id !== 'unassigned').length;
  const trackCount = countUserTracks(albums);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [dataToImport, setDataToImport] = useState<any>(null);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [looseTracksMinimized, setLooseTracksMinimized] = useState(false);

  const unassignedTracks = getAlbumById('unassigned')?.tracks || [];
  const realAlbums = albums.filter(a => a.id !== 'unassigned');

  // Unified Sorting Logic
  const sortData = (data: any[]) => {
      let sorted = [...data];
      if (sortBy === 'alphabetical') sorted.sort((a, b) => a.title.localeCompare(b.title));
      else if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted;
  };

  const filteredAlbums = useMemo(() => {
      let filtered = realAlbums.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.theme.toLowerCase().includes(searchQuery.toLowerCase()));
      return sortData(filtered);
  }, [realAlbums, searchQuery, sortBy]);

  const sortedLooseTracks = useMemo(() => {
      return sortData(unassignedTracks);
  }, [unassignedTracks, sortBy]);

  const searchResults = useMemo(() => {
      if (!searchQuery.trim()) return null;
      
      const quotedRegex = /"([^"]+)"/g;
      const phrases: string[] = [];
      let m;
      while ((m = quotedRegex.exec(searchQuery)) !== null) {
          phrases.push(m[1].toLowerCase());
      }
      const remaining = searchQuery.replace(quotedRegex, '').trim().toLowerCase();
      const words = remaining.split(/\s+/).filter(w => w.length > 0);

      const checkMatch = (target: string) => {
          if (!target) return false;
          const t = target.toLowerCase();
          for (const phrase of phrases) {
              const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escaped}\\b`, 'i');
              if (!regex.test(target)) return false;
          }
          for (const word of words) {
              if (!t.includes(word)) return false;
          }
          return true;
      };

      const results: any[] = [];
      albums.forEach(album => {
          const albumMatch = checkMatch(album.title) || checkMatch(album.theme);
          if (album.id !== 'unassigned' && albumMatch) {
              results.push({ ...album, type: 'album' });
          }
          album.tracks.forEach(track => {
              const titleMatch = checkMatch(track.title);
              const lyricsMatch = track.sections?.some(s => s.bars?.some(b => checkMatch(b.text)));
              if (titleMatch || lyricsMatch) {
                  const matchingBar = track.sections?.flatMap(s => s.bars).find(b => checkMatch(b.text))?.text;
                  results.push({ 
                    ...track, 
                    type: 'track', 
                    albumId: album.id, 
                    albumTitle: album.title,
                    matchingSnippet: matchingBar || track.sections?.[0]?.bars[0]?.text
                  });
              }
          });
      });
      return results;
  }, [albums, searchQuery]);

  const isEmpty = realAlbums.length === 0 && unassignedTracks.length === 0;

  const handleExport = () => {
    const dataStr = JSON.stringify(albums, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `bar4bar-studio-vault-${new Date().toISOString().split('T')[0]}.json`;
    link.href = url; link.click(); URL.revokeObjectURL(url);
    toast({ title: 'Studio Vault Exported!' });
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0a121e]"><StudioLoader size="lg" /></div>;

  return (
    <TooltipProvider>
      <div className="flex-grow w-full relative min-h-screen selection:bg-primary/30 font-code bg-[#0a121e]">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-repeat" style={{ backgroundImage: `url("${noiseDataUri}")` }} />
        </div>
        <div className="container relative z-20 mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8 border-b border-white/5 pb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Waves className="h-8 w-8 text-primary" />
                        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary uppercase tracking-tighter">ALBUMS</h1>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold opacity-60">Professional Project Blueprints</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group min-w-[320px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder='Search Vault... use "" for exact' 
                            className="pl-10 h-10 bg-black/60 border-white/5 focus:border-primary/40 rounded-xl font-code font-bold text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && <Button variant="ghost" size="icon" className="absolute right-2 top-1 h-8 w-8 rounded-full" onClick={() => setSearchQuery('')}><X className="h-4 w-4" /></Button>}
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 px-4 bg-black/40 border-white/5 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest">
                                <ArrowUpDown className="h-4 w-4" /> Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-white/10">
                            <DropdownMenuItem onClick={() => setSortBy('newest')} className="text-[10px] font-bold uppercase"><SortDesc className="mr-2 h-4 w-4" /> Newest First</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('oldest')} className="text-[10px] font-bold uppercase"><SortAsc className="mr-2 h-4 w-4" /> Oldest First</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('alphabetical')} className="text-[10px] font-bold uppercase"><SortAsc className="mr-2 h-4 w-4" /> Alphabetical</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" className="h-10 px-6 font-bold shadow-[0_0_25px_rgba(59,130,246,0.3)] bg-primary hover:bg-primary/90 text-white rounded-xl uppercase text-[10px] tracking-widest gap-2">
                                <PlusCircle className="h-4 w-4" /> Create New
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-white/10 w-48">
                            <DropdownMenuItem onClick={() => setCreateItemType('Album')} className="text-[10px] font-bold uppercase">
                                <Music className="mr-2 h-4 w-4" /> Concept Album
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCreateItemType('Track')} className="text-[10px] font-bold uppercase">
                                <CassetteTape className="mr-2 h-4 w-4" /> Loose Track
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <div className="flex gap-2">
                        {isPro ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 border border-white/5 bg-black/40 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                                <Import className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-[10px] font-bold">Import Studio Vault</p></TooltipContent>
                          </Tooltip>
                        ) : (
                          <LockedToolbarButton feature="Vault Import" benefit="Merge backup blueprints into your studio.">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg bg-transparent border-0 shadow-none hover:bg-pink-500/10">
                              <Lock className={proLockIcon('h-4 w-4')} />
                            </Button>
                          </LockedToolbarButton>
                        )}
                        {isPro ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 border border-white/5 bg-black/40 rounded-xl" onClick={handleExport}>
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-[10px] font-bold">Export Studio Vault</p></TooltipContent>
                          </Tooltip>
                        ) : (
                          <LockedToolbarButton feature="Vault Export" benefit="Download your full studio as a portable blueprint.">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg bg-transparent border-0 shadow-none hover:bg-pink-500/10">
                              <Lock className={proLockIcon('h-4 w-4')} />
                            </Button>
                          </LockedToolbarButton>
                        )}
                    </div>
                </div>
            </div>

            {searchResults ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                            <h2 className="text-2xl font-headline font-bold text-white uppercase tracking-tight">Search Results ({searchResults.length})</h2>
                        </div>
                        <Button variant="ghost" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary" onClick={() => setSearchQuery('')}>Clear Search</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.map((res, i) => (
                            <Link key={i} href={res.type === 'album' ? `/albums/${res.id}` : `/albums/${res.albumId}/tracks/${res.id}`} className="group">
                                <Card className="p-4 bg-black/40 border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all shadow-xl flex items-center justify-between group h-24">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all shrink-0">
                                            {res.type === 'album' ? <Music className="h-6 w-6 text-primary" /> : <CassetteTape className="h-6 w-6 text-primary" />}
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-lg text-white font-headline leading-tight uppercase group-hover:text-primary transition-colors truncate">{res.title}</h4>
                                                <Badge variant="outline" className={cn("text-[8px] font-bold uppercase px-1.5 h-4 border-white/10 shrink-0", res.type === 'album' ? 'text-emerald-500' : 'text-sky-500')}>{res.type}</Badge>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic font-code line-clamp-1 opacity-60">
                                                "{res.type === 'album' ? res.theme : (res.matchingSnippet || 'No lyrics drafted yet.')}"
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            ) : !isPro ? (
                <FreeVisitorVault
                  sortedLooseTracks={sortedLooseTracks}
                  filteredAlbums={filteredAlbums}
                  realAlbums={realAlbums}
                  onCreateAlbum={() => setCreateItemType('Album')}
                  onCreateTrack={() => setCreateItemType('Track')}
                />
            ) : isEmpty ? (
                <StudioEmptyState onCreateAlbum={() => setCreateItemType('Album')} onCreateTrack={() => setCreateItemType('Track')} />
            ) : (
                <div className="space-y-24">
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {(unassignedTracks.length > 0 || isPro) && (
                            <>
                            <div className="flex items-center justify-between border-l-4 border-primary pl-6">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-headline font-bold text-white uppercase tracking-tighter flex items-center gap-3">
                                        <CassetteTape className="text-primary h-8 w-8" /> Loose Tracks
                                    </h2>
                                    {unassignedTracks.length > 0 && (
                                      <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/5" onClick={() => setLooseTracksMinimized(!looseTracksMinimized)}>
                                            {looseTracksMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                        </Button>
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Unassigned Singles & Ideas</p>
                                      </>
                                    )}
                                </div>
                                <Badge variant="outline" className="border-primary/20 text-primary font-mono">{unassignedTracks.length}</Badge>
                            </div>
                            
                            <AnimatePresence>
                                {(!looseTracksMinimized || unassignedTracks.length === 0) && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {sortedLooseTracks.map(track => (
                                                <div key={track.id} className="group relative">
                                                    <Link href={`/albums/unassigned/tracks/${track.id}`} className="block py-4 px-6 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-between shadow-xl">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 group-hover:bg-primary/20 transition-all">
                                                                <CassetteTape className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold font-headline text-base text-white uppercase truncate pr-4">{track.title}</p>
                                                                <p className="text-[8px] text-muted-foreground uppercase font-code mt-0.5">{track.vibe?.genre} &middot; {track.vibe?.tempoBPM} BPM</p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                                                    </Link>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-black/60 hover:bg-black/80">
                                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48 bg-card border-white/10">
                                                                <DropdownMenuSub>
                                                                    <DropdownMenuSubTrigger className="text-[10px] font-bold uppercase"><Move className="mr-2 h-4 w-4" /> Move To Album</DropdownMenuSubTrigger>
                                                                    <DropdownMenuPortal>
                                                                        <DropdownMenuSubContent className="bg-card border-white/10">
                                                                            {realAlbums.map(album => (
                                                                                <DropdownMenuItem key={album.id} onClick={() => { moveTrack(track.id, 'unassigned', album.id); toast({ title: "Track Assigned", description: `"${track.title}" moved to ${album.title}.` }); }} className="text-[10px] font-bold uppercase">
                                                                                    <Music className="mr-2 h-3 w-3" /> {album.title}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuSubContent>
                                                                    </DropdownMenuPortal>
                                                                </DropdownMenuSub>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => setTrackToDelete(track)} className="text-red-500 focus:text-red-500 text-[10px] font-bold uppercase">
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Scrap Track
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))}
                                            {isPro && (
                                              <ProCreateTrackSlot onClick={() => setCreateItemType('Track')} />
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            </>
                        )}
                    </div>

                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-6">
                            <div>
                                <h2 className="text-3xl font-headline font-bold text-white uppercase tracking-tighter flex items-center gap-3">
                                    <Music className="text-emerald-500 h-8 w-8" /> YOUR COLLECTION
                                </h2>
                                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60">Concept Album DNA Architectures</p>
                            </div>
                            {filteredAlbums.length > 0 && (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono ml-auto">{filteredAlbums.length}</Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-16 px-4">
                            {filteredAlbums.map((album) => (
                                <VinylRecord key={album.id} album={album} />
                            ))}
                            {isPro && (
                              <ProCreateAlbumSlot onClick={() => setCreateItemType('Album')} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      <CreateItemDialog open={!!createItemType} onOpenChange={(isOpen) => !isOpen && setCreateItemType(null)} type={createItemType || 'Album'} />
      
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
          const file = e.target.files?.[0]; if(!file) return;
          const reader = new FileReader(); reader.onload = (ev) => { try { setDataToImport(JSON.parse(ev.target?.result as string)); setShowImportConfirm(true); } catch(err) { toast({ variant: 'destructive', title: 'Import Failed', description: 'Invalid studio blueprint file.' }); } }; reader.readAsText(file);
      }} />

      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
          <AlertDialogContent className="bg-card border-2">
              <AlertDialogHeader>
                  <AlertDialogTitle className="font-headline text-2xl uppercase">Initialize Vault Merge?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-code">This will load the imported albums and tracks into your current studio session. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold">Abort</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { mergeData(dataToImport.albums || dataToImport, []); setShowImportConfirm(false); toast({ title: "Vault Merged Successfully" }); }} className="font-bold">Merge Blueprints</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!trackToDelete} onOpenChange={(o) => !o && setTrackToDelete(null)}>
          <AlertDialogContent className="bg-card border-2">
              <AlertDialogHeader>
                  <AlertDialogTitle className="font-headline text-2xl text-red-500 uppercase">Scrap Lyrical Asset?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-code">Are you sure you want to permanently delete "{trackToDelete?.title}"? This cannot be recovered.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if(trackToDelete) { deleteTrack('unassigned', trackToDelete.id); setTrackToDelete(null); toast({ title: "Track Scrapped" }); } }} className="bg-red-600 hover:bg-red-700 font-bold">Scrap Asset</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
