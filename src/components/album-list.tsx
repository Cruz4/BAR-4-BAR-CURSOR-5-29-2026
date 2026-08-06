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

import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    PlusCircle, 
    Music, 
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
import { DnaDropLiveIndicator } from '@/components/dna-drop-live-indicator';
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
import { Card } from '@/components/ui/card';
import { DataContext } from '@/context/data-context';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import {
  canUserAddTrack,
  canUserAddAlbum,
  countUserTracks,
  FREE_ALBUM_LIMIT,
  FREE_ALBUM_LIMIT_TOAST,
  FREE_TRACK_LIMIT,
  FREE_TRACK_LIMIT_TOAST,
  isProOrTrial,
  isProUser,
} from '@/lib/subscription';
import { isDataUrl } from '@/lib/cover-art';
import { postGamificationEvent } from '@/lib/gamification-client';
import { VaultStudioProgress, VAULT_STUDIO_PROGRESS_MOBILE_EXPANDED_KEY } from '@/components/gamification/vault-studio-progress';
import { VaultProfileDock } from '@/components/profile/vault-profile-dock';
import { LiveDnaDropsManage } from '@/components/scene/scene-live-drops-strip';
import { VaultChamberAtmosphere } from '@/components/vault-chamber-atmosphere';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { trackUpgradeClick } from '@/lib/conversion-analytics';
import {
  LockedVaultSlot,
  OpenAlbumSlot,
  OpenTrackSlot,
  LockedToolbarButton,
  ProCreateAlbumSlot,
  ProCreateTrackSlot,
  IconWithLockOverlay,
  proLockIcon,
  proLockText,
} from '@/components/pro-lock';
import { FreeTierExpectationsBanner } from '@/components/free-tier-expectations-banner';
import { canExportVault, EXPORT_PRO_TOAST, IMPORT_PRO_TOAST } from '@/lib/tier-limits';
import { StudioGuidedTour } from '@/components/studio-guided-tour';
import {
  VAULT_PAGE_TOUR_STEPS,
  markVaultTutorialComplete,
  PENDING_VAULT_TOUR_REPLAY_KEY,
  REPLAY_VAULT_TOUR_EVENT,
  type LyricsTourStep,
} from '@/lib/studio-onboarding';
import { isVaultPath } from '@/lib/scene-home';
import {
  dispatchStudioPrivacyIntroEligible,
  queueStudioPrivacyIntro,
  setVaultTourRunning,
} from '@/lib/studio-privacy-intro';
import { getEditableAlbumIds, getEditableTrackIds, needsFreeEditableTrackPicker } from '@/lib/tier-limits';
import type { User } from '@/lib/types';
import { VisitorVaultBanner } from '@/components/visitor-vault-banner';
import { DowngradeTrackPickerDialog } from '@/components/downgrade-track-picker-dialog';
import { FirstSongHero } from '@/components/first-song-hero';

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
      const unlimitedCatalog = isProUser(user);
      const albumCount = albums.filter((a) => a.id !== 'unassigned').length;
      const trackCount = countUserTracks(albums);

      if (!unlimitedCatalog) {
          if (type === 'Album' && !canUserAddAlbum(albums, user)) {
              trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, { limitType: 'album', count: albumCount });
              trackUpgradeClick('slot_limit', { limitType: 'album', count: albumCount });
              void postGamificationEvent('album_limit_hit');
              toast(FREE_ALBUM_LIMIT_TOAST);
              onOpenChange(false);
              return;
          }
          if (type === 'Track' && !canUserAddTrack(albums, user)) {
              trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, { limitType: 'track', count: trackCount });
              trackUpgradeClick('slot_limit', { limitType: 'track', count: trackCount });
              toast(FREE_TRACK_LIMIT_TOAST);
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
                vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new idea'], enabled: false },
                intentRefs: [],
                sections: [{ id: `section-${Date.now()}`, type: 'verse', bars: [{ idx: 1, text: '', accepted: true, syllables: 0, rhymeKey: '?' }] }],
                status: 'in_progress',
                createdAt: new Date().toISOString(),
                direction: { enabled: false, inheritFromAlbum: false },
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

function FreeVisitorVault({
  sortedLooseTracks,
  filteredAlbums,
  realAlbums,
  totalTrackCount,
  onCreateAlbum,
  onCreateTrack,
  albums,
  user,
  moveTrack,
  onDeleteTrack,
}: {
  sortedLooseTracks: Track[];
  filteredAlbums: Album[];
  realAlbums: Album[];
  totalTrackCount: number;
  onCreateAlbum: () => void;
  onCreateTrack: () => void;
  albums: Album[];
  user: User | null;
  moveTrack: (trackId: string, fromAlbumId: string, toAlbumId: string) => void;
  onDeleteTrack: (track: Track) => void;
}) {
  const { toast } = useToast();
  const openTrackSlots = Math.max(0, FREE_TRACK_LIMIT - totalTrackCount);
  const editableTrackIds = getEditableTrackIds(albums, user);
  const editableAlbumIds = getEditableAlbumIds(albums, user);
  const hasExtraAlbums = realAlbums.length > FREE_ALBUM_LIMIT;
  const hasExtraTracks = totalTrackCount > FREE_TRACK_LIMIT;
  const editableLooseCount = sortedLooseTracks.filter((t) => editableTrackIds.has(t.id)).length;

  return (
    <div className="space-y-20 animate-in fade-in duration-700">
      <VisitorVaultBanner
        user={user}
        albums={albums}
        openTrackSlots={openTrackSlots}
        hasExtraAlbums={hasExtraAlbums}
      />

      <div className="space-y-6">
        <div className="flex items-center gap-4 border-l-4 border-sky-500 pl-6" data-tour="vault-loose-tracks">
          <Link
            href="/albums/unassigned"
            className="text-3xl font-headline font-bold text-foreground uppercase tracking-tighter flex items-center gap-3 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
          >
            <CassetteTape className="text-sky-500 h-8 w-8 shrink-0" />
            Loose Tracks
          </Link>
          <Badge variant="outline" className="border-sky-500/30 text-sky-400 font-mono">
            {hasExtraTracks
              ? `${totalTrackCount} saved · ${editableLooseCount} editable here`
              : `${totalTrackCount}/${FREE_TRACK_LIMIT}`}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedLooseTracks.map((track) => {
            const tierLocked = !editableTrackIds.has(track.id);
            return (
              <div
                key={track.id}
                className={cn(
                  'group flex items-center gap-2 py-4 pl-6 pr-3 rounded-2xl bg-card/95 border-2 transition-all shadow-xl',
                  tierLocked
                    ? 'border-pink-500/25 hover:border-pink-400/40'
                    : 'border-sky-500/30 hover:border-sky-400/60 hover:bg-sky-500/5'
                )}
              >
                <Link
                  href={`/albums/unassigned/tracks/${track.id}`}
                  className={cn(
                    'flex items-center gap-4 min-w-0 flex-1',
                    tierLocked ? 'opacity-90' : ''
                  )}
                >
                  <div className={cn('p-2 rounded-xl border shrink-0', tierLocked ? 'bg-muted/20 border-pink-500/20' : 'bg-sky-500/15 border-sky-500/30')}>
                    {tierLocked ? (
                      <IconWithLockOverlay icon={CassetteTape} size="lg" />
                    ) : (
                      <CassetteTape className="h-5 w-5 text-sky-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-bold font-headline text-lg text-foreground uppercase truncate">{track.title}</p>
                      <DnaDropLiveIndicator shareId={track.shareId} variant="compact" />
                      {tierLocked && (
                        <Badge variant="outline" className={cn('text-[7px] px-1.5 h-4 shrink-0', proLockText())}>View only</Badge>
                      )}
                    </div>
                    <p className={cn('text-xs uppercase font-code mt-0.5', tierLocked ? 'text-muted-foreground' : 'text-sky-400/80')}>
                      {tierLocked ? 'View-only · lyrics saved' : `Loose track · ${track.vibe?.genre}`}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-0.5 shrink-0">
                  {!tierLocked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-[10px] font-bold uppercase">
                            <Move className="mr-2 h-4 w-4" /> Move To Album
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="bg-card border-border">
                              {realAlbums.map((album) => (
                                <DropdownMenuItem
                                  key={album.id}
                                  onClick={() => {
                                    moveTrack(track.id, 'unassigned', album.id);
                                    toast({
                                      title: 'Track Assigned',
                                      description: `"${track.title}" moved to ${album.title}. Album DNA inherit is on.`,
                                    });
                                  }}
                                  className="text-[10px] font-bold uppercase"
                                >
                                  <Music className="mr-2 h-3 w-3" /> {album.title}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteTrack(track)}
                          className="text-red-500 focus:text-red-500 text-[10px] font-bold uppercase"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Scrap Track
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Link
                    href={`/albums/unassigned/tracks/${track.id}`}
                    className="p-1.5 text-muted-foreground group-hover:text-sky-400 transition-all"
                    aria-label={`Open ${track.title}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
          {Array.from({ length: openTrackSlots }, (_, i) => (
              <OpenTrackSlot key={`open-track-${i}`} onClick={onCreateTrack} />
          ))}
          {totalTrackCount < FREE_TRACK_LIMIT && (
            <LockedVaultSlot
              variant="track"
              label="Track 3 — Pro"
              sublabel="Go Pro for unlimited tracks"
            />
          )}
          {totalTrackCount >= FREE_TRACK_LIMIT && (
            <LockedVaultSlot variant="track" label="Unlimited Tracks" sublabel="Go Pro for no track cap" />
          )}
        </div>
      </div>

      <div className="space-y-10" data-tour="vault-collection">
        <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-6">
          <h2 className="text-3xl font-headline font-bold text-foreground uppercase tracking-tighter flex items-center gap-3">
            <Music className="text-emerald-500 h-8 w-8" /> YOUR COLLECTION
          </h2>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono">{realAlbums.length}/{FREE_ALBUM_LIMIT}</Badge>
        </div>
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-12 gap-y-12 px-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAlbums.map((albumItem) => (
            <VinylRecord
              key={albumItem.id}
              album={albumItem}
              tierLocked={!editableAlbumIds.has(albumItem.id)}
            />
          ))}
          {realAlbums.length < FREE_ALBUM_LIMIT && <OpenAlbumSlot onClick={onCreateAlbum} />}
          <LockedVaultSlot variant="album" label="Unlimited Albums" sublabel="Go Pro for unlimited albums" />
        </div>
      </div>
    </div>
  );
}

const VinylRecord = ({ album, tierLocked = false }: { album: Album; tierLocked?: boolean }) => (
    <Link href={`/albums/${album.id}`} className={cn('group relative aspect-square block', tierLocked && 'opacity-85')}>
        <div className="absolute top-3 right-3 z-30 pointer-events-none flex flex-col items-end gap-1">
          <DnaDropLiveIndicator shareId={album.shareId} variant="dot" className="pointer-events-auto" />
          {tierLocked && (
            <Badge variant="outline" className={cn('text-[7px] px-1.5 h-4 pointer-events-none', proLockText())}>View only</Badge>
          )}
        </div>
        {tierLocked && (
          <div className="absolute top-4 left-4 z-30 pointer-events-none">
            <IconWithLockOverlay icon={Music} size="lg" iconClassName="text-muted-foreground/70" />
          </div>
        )}
        <div className={cn(
          'absolute inset-0 bg-neutral-900 rounded-full flex items-center justify-center transition-all duration-700 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden border-[6px]',
          tierLocked ? 'border-pink-500/20 group-hover:rotate-[12deg]' : 'border-neutral-800 group-hover:rotate-[360deg]'
        )}
             style={{
                 backgroundImage: 'repeating-radial-gradient(circle at center, #1a1a1a 0px, #1a1a1a 2px, #111 4px, #111 5px)'
             }}>
            <div className="relative w-[38%] h-[38%] rounded-full overflow-hidden border-4 border-neutral-700 shadow-inner z-10 bg-neutral-800 flex items-center justify-center">
                {album.coverArtUrl ? (
                    isDataUrl(album.coverArtUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={album.coverArtUrl} alt={album.title} className="absolute inset-0 h-full w-full object-cover opacity-90" />
                    ) : (
                        <Image 
                            src={album.coverArtUrl} 
                            alt={album.title} 
                            fill 
                            className="object-cover opacity-90" 
                        />
                    )
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
            <div data-dark-surface className="bg-black/90 backdrop-blur-xl px-6 py-3 rounded-full border border-primary/40 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex flex-col items-center">
                <p className="font-headline text-xl font-bold text-white uppercase tracking-tighter text-center leading-none">{album.title}</p>
                <p className="text-[9px] text-primary/60 font-code font-bold uppercase tracking-[0.2em] text-center mt-1">{album.tracks?.length || 0} TRACKS</p>
            </div>
        </div>
    </Link>
);

export function AlbumList() {
  const [createItemType, setCreateItemType] = useState<'Album' | 'Track' | null>(null);
  const { albums, loading, deleteAlbum, deleteTrack, moveTrack, getAlbumById, mergeData, clearVault, isCloudSyncActive } = useContext(DataContext);
  const { user, loading: authLoading } = useAuth();
  const isPaidPro = isProUser(user);
  const hasProWorkflow = isProOrTrial(user);
  const albumCount = albums.filter((a) => a.id !== 'unassigned').length;
  const trackCount = countUserTracks(albums);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showClearVaultConfirm, setShowClearVaultConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearingVault, setIsClearingVault] = useState(false);
  const [dataToImport, setDataToImport] = useState<any>(null);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [looseTracksMinimized, setLooseTracksMinimized] = useState(false);
  const [downgradePickerDone, setDowngradePickerDone] = useState(false);
  const [vaultTourActive, setVaultTourActive] = useState(false);
  const [vaultTourStep, setVaultTourStep] = useState(0);
  const vaultTourAutoStartRef = useRef(false);

  const vaultProgressTourPinned =
    vaultTourActive && VAULT_PAGE_TOUR_STEPS[vaultTourStep]?.id === 'vault-progress';

  const showDowngradePicker =
    !downgradePickerDone &&
    !authLoading &&
    !loading &&
    user != null &&
    needsFreeEditableTrackPicker(user, albums);

  useEffect(() => {
    if (user && isProUser(user)) {
      setDowngradePickerDone(false);
    }
  }, [user?.subscriptionStatus, user?.proFeaturePreviewExpiresAt, user?.trialStartedAt]);

  const unassignedTracks = getAlbumById('unassigned')?.tracks || [];
  const realAlbums = albums.filter(a => a.id !== 'unassigned');

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PENDING_VAULT_TOUR_REPLAY_KEY)) {
        sessionStorage.removeItem(PENDING_VAULT_TOUR_REPLAY_KEY);
        setVaultTourStep(0);
        setVaultTourActive(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Scene "Start a track" / deep links land here with ?create=track|album.
  useEffect(() => {
    const create = searchParams.get('create');
    if (create === 'track') setCreateItemType('Track');
    else if (create === 'album') setCreateItemType('Album');
  }, [searchParams]);

  useEffect(() => {
    const onReplay = () => {
      setVaultTourStep(0);
      setVaultTourActive(true);
    };
    window.addEventListener(REPLAY_VAULT_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_VAULT_TOUR_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (!user || !isVaultPath(pathname) || loading || authLoading || vaultTourAutoStartRef.current) return;
    if (user.vaultTutorialCompletedAt) return;
    // Wait while demo→sheet handoff is navigating away from the vault.
    try {
      if (sessionStorage.getItem('b4b-demo-handoff-inflight') === '1') return;
    } catch {
      /* ignore */
    }
    // FirstSongHero empty-vault auto-open — don't start vault tour mid-handoff.
    if (albums.length === 0) return;

    vaultTourAutoStartRef.current = true;
    setVaultTourRunning(true);
    let activated = false;
    const t = setTimeout(() => {
      activated = true;
      setVaultTourActive(true);
    }, 1000);
    return () => {
      clearTimeout(t);
      if (!activated) setVaultTourRunning(false);
    };
  }, [user, pathname, loading, authLoading, albums.length]);

  useEffect(() => {
    setVaultTourRunning(vaultTourActive);
    if (!vaultTourActive) return;
    return () => setVaultTourRunning(false);
  }, [vaultTourActive]);

  const handleVaultTourBeforeStep = useCallback((step: LyricsTourStep) => {
    if (step.id === 'vault-loose-tracks') {
      setLooseTracksMinimized(false);
    }
    if (
      step.id === 'vault-header' ||
      step.id === 'vault-search' ||
      step.id === 'vault-create'
    ) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const handleVaultTourComplete = useCallback(
    async (skipped: boolean) => {
      setVaultTourActive(false);
      setVaultTourRunning(false);
      if (user && !user.vaultTutorialCompletedAt) {
        try {
          await markVaultTutorialComplete(user.id);
        } catch (e) {
          console.warn('Failed to save vault tutorial completion', e);
        }
      }
      if (!skipped) {
        void postGamificationEvent('tour_complete');
      }
      if (user && !user.studioPrivacyIntroCompletedAt) {
        queueStudioPrivacyIntro();
        window.setTimeout(() => dispatchStudioPrivacyIntroEligible(), 400);
      }
    },
    [user]
  );

  // Login and route transitions can leave the window scrolled mid-page before vault content paints.
  useEffect(() => {
    if (!isVaultPath(pathname) || loading) return;
    const previous = 'scrollRestoration' in history ? history.scrollRestoration : undefined;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    requestAnimationFrame(() => requestAnimationFrame(resetScroll));
    return () => {
      // Leave manual mode only while on the vault — otherwise album/track
      // navigations keep the vault's scrollY and open mid/bottom page.
      if ('scrollRestoration' in history && previous !== undefined) {
        history.scrollRestoration = previous;
      }
    };
  }, [pathname, loading]);

  // Unified Sorting Logic
  const sortData = (data: any[]) => {
      let sorted = [...data];
      if (sortBy === 'alphabetical') sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      else if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return sorted;
  };

  const filteredAlbums = useMemo(() => {
      const q = searchQuery.toLowerCase();
      let filtered = realAlbums.filter(a =>
        (a.title || '').toLowerCase().includes(q) || (a.theme || '').toLowerCase().includes(q)
      );
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
    if (!canExportVault(user)) {
      toast(EXPORT_PRO_TOAST);
      return;
    }
    const dataStr = JSON.stringify(albums, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = `bar4bar-studio-vault-${new Date().toISOString().split('T')[0]}.json`;
    link.href = url; link.click(); URL.revokeObjectURL(url);
    toast({ title: 'Studio Vault Exported!' });
  };

  const handleImportMerge = async () => {
    if (!dataToImport) return;
    if (!canExportVault(user)) {
      toast(IMPORT_PRO_TOAST);
      setShowImportConfirm(false);
      setDataToImport(null);
      return;
    }
    setIsImporting(true);
    try {
      let albumsPayload: Album[] = [];
      let looseTracks: Track[] = [];

      if (Array.isArray(dataToImport)) {
        const unassigned = dataToImport.find((a: Album) => a.id === 'unassigned');
        looseTracks = unassigned?.tracks || [];
        albumsPayload = dataToImport.filter((a: Album) => a.id !== 'unassigned');
      } else if (dataToImport.albums) {
        const unassigned = dataToImport.albums.find((a: Album) => a.id === 'unassigned');
        looseTracks = unassigned?.tracks || dataToImport.tracks || [];
        albumsPayload = dataToImport.albums.filter((a: Album) => a.id !== 'unassigned');
      } else {
        throw new Error('Invalid blueprint format');
      }

      await mergeData(albumsPayload, looseTracks);
      setShowImportConfirm(false);
      setDataToImport(null);
      toast({ title: 'Vault Merged Successfully', description: 'Imported albums and tracks saved to your cloud vault.' });
    } catch {
      toast({ variant: 'destructive', title: 'Import Failed', description: 'Could not merge studio blueprint.' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearVault = async () => {
    setIsClearingVault(true);
    try {
      await clearVault();
      setShowClearVaultConfirm(false);
      toast({ title: 'Vault Cleared', description: 'All albums and loose tracks removed. Start fresh.' });
    } catch {
      toast({ variant: 'destructive', title: 'Clear Failed', description: 'Could not erase vault. Try again.' });
    } finally {
      setIsClearingVault(false);
    }
  };

  if (loading) return <StudioLoader size="lg" fullscreen />;

  return (
    <TooltipProvider>
      <div className="flex-grow w-full relative min-h-screen selection:bg-primary/30 font-code" data-vault-shell>
        <FreeTierExpectationsBanner user={user} />
        <VaultChamberAtmosphere />

        <div className="relative z-20 w-full min-w-0 max-w-[100vw] xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,72rem)_minmax(0,1fr)] xl:grid-rows-[auto_auto] xl:items-start">
          <div className="relative min-w-0 w-full xl:col-start-2 xl:row-start-1 px-4 sm:px-6 pt-6">
            <header className="mb-8 pb-6 border-b border-border" data-tour="vault-header">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
                <div className="flex items-center gap-3 shrink-0">
                  <Waves className="h-8 w-8 text-primary shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary uppercase tracking-tighter leading-none">
                      The Vault
                    </h1>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-bold">
                      Professional Project Blueprints
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full lg:flex-1 lg:justify-end lg:max-w-3xl">
                    <div className="relative group w-full sm:min-w-[280px] sm:max-w-md sm:flex-1" data-tour="vault-search">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder='Search Vault... use "" for exact' 
                            className="pl-10 h-10 bg-muted border-border focus:border-primary/40 rounded-xl font-code font-bold text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && <Button variant="ghost" size="icon" className="absolute right-2 top-1 h-8 w-8 rounded-full" onClick={() => setSearchQuery('')}><X className="h-4 w-4" /></Button>}
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 px-4 bg-card/95 border-border rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest">
                                <ArrowUpDown className="h-4 w-4" /> Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => setSortBy('newest')} className="text-[10px] font-bold uppercase"><SortDesc className="mr-2 h-4 w-4" /> Newest First</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('oldest')} className="text-[10px] font-bold uppercase"><SortAsc className="mr-2 h-4 w-4" /> Oldest First</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('alphabetical')} className="text-[10px] font-bold uppercase"><SortAsc className="mr-2 h-4 w-4" /> Alphabetical</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" data-tour="vault-create" className="h-10 px-6 font-bold shadow-[0_0_25px_rgba(59,130,246,0.3)] bg-primary hover:bg-primary/90 text-white rounded-xl uppercase text-[10px] tracking-widest gap-2">
                                <PlusCircle className="h-4 w-4" /> Create New
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border w-48">
                            <DropdownMenuItem onClick={() => setCreateItemType('Album')} className="text-[10px] font-bold uppercase">
                                <Music className="mr-2 h-4 w-4" /> Concept Album
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCreateItemType('Track')} className="text-[10px] font-bold uppercase">
                                <CassetteTape className="mr-2 h-4 w-4" /> Loose Track
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <div className="flex gap-2">
                        {hasProWorkflow ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 border border-border bg-card/95 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                                <Import className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-[10px] font-bold">Import Studio Vault</p></TooltipContent>
                          </Tooltip>
                        ) : (
                          <LockedToolbarButton feature="Vault Import" benefit="Merge backup blueprints into your studio." icon={Import} />
                        )}
                        {hasProWorkflow ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 border border-border bg-card/95 rounded-xl" onClick={handleExport}>
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-[10px] font-bold">Export Studio Vault</p></TooltipContent>
                          </Tooltip>
                        ) : (
                          <LockedToolbarButton feature="Vault Export" benefit="Download your full studio as a portable blueprint." icon={Download} />
                        )}
                    </div>
                </div>
              </div>
            </header>

            {!loading && user && (
              <div className="xl:hidden mb-4 space-y-3">
                <VaultStudioProgress
                  variant="banner"
                  tourForceExpanded={vaultProgressTourPinned}
                  phoneStartsMinimized
                  defaultExpanded={false}
                  persistExpandedKey={VAULT_STUDIO_PROGRESS_MOBILE_EXPANDED_KEY}
                />
                <VaultProfileDock compact />
              </div>
            )}
          </div>

          {!loading && user && (
            <aside
              className="hidden xl:flex xl:col-start-1 xl:row-start-2 justify-end items-start self-start pr-2 2xl:pr-3 sticky top-[5.25rem] z-30 pointer-events-none [&>*]:pointer-events-auto"
              aria-label="Studio progress"
            >
              <VaultStudioProgress variant="sidebar" tourForceExpanded={vaultProgressTourPinned} />
            </aside>
          )}

          {!loading && user && (
            <aside
              className="hidden xl:flex xl:col-start-3 xl:row-start-2 justify-start items-start self-start pl-2 2xl:pl-3 sticky top-[5.25rem] z-30 pointer-events-none [&>*]:pointer-events-auto"
              aria-label="Artist Home and The Block"
            >
              <VaultProfileDock />
            </aside>
          )}

          <div className="relative min-w-0 w-full xl:col-start-2 xl:row-start-2 px-4 sm:px-6 pb-10">
            {!loading && user && <LiveDnaDropsManage className="mb-4" />}
            {user && isEmpty && !searchResults && <FirstSongHero />}
            {searchResults ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                            <h2 className="text-2xl font-headline font-bold text-foreground uppercase tracking-tight">Search Results ({searchResults.length})</h2>
                        </div>
                        <Button variant="ghost" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary" onClick={() => setSearchQuery('')}>Clear Search</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.map((res, i) => (
                            <Link key={i} href={res.type === 'album' ? `/albums/${res.id}` : `/albums/${res.albumId}/tracks/${res.id}`} className="group">
                                <Card className="p-4 bg-card/95 border-border hover:border-primary/40 hover:bg-primary/5 transition-all shadow-xl flex items-center justify-between group h-24">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all shrink-0">
                                            {res.type === 'album' ? <Music className="h-6 w-6 text-primary" /> : <CassetteTape className="h-6 w-6 text-primary" />}
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h4 className="font-bold text-lg text-foreground font-headline leading-tight uppercase group-hover:text-primary transition-colors truncate">{res.title}</h4>
                                                <DnaDropLiveIndicator shareId={res.shareId} variant="compact" />
                                                <Badge variant="outline" className={cn("text-[8px] font-bold uppercase px-1.5 h-4 border-border shrink-0", res.type === 'album' ? 'text-emerald-500' : 'text-sky-500')}>{res.type}</Badge>
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
            ) : !isPaidPro ? (
                <FreeVisitorVault
                  sortedLooseTracks={sortedLooseTracks}
                  filteredAlbums={filteredAlbums}
                  realAlbums={realAlbums}
                  totalTrackCount={trackCount}
                  onCreateAlbum={() => setCreateItemType('Album')}
                  onCreateTrack={() => setCreateItemType('Track')}
                  albums={albums}
                  user={user}
                  moveTrack={moveTrack}
                  onDeleteTrack={setTrackToDelete}
                />
            ) : (
                <div className="space-y-12">
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div
                              data-tour="vault-loose-tracks"
                              className="flex items-center justify-between border-l-4 border-primary pl-6"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <Link
                                      href="/albums/unassigned"
                                      className="text-2xl sm:text-3xl font-headline font-bold text-foreground uppercase tracking-tighter flex items-center gap-3 hover:text-primary transition-colors"
                                    >
                                      <CassetteTape className="text-primary h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
                                      Loose Tracks
                                    </Link>
                                    {unassignedTracks.length > 0 && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-10 w-10 min-h-10 min-w-10 rounded-full hover:bg-muted/80"
                                          onClick={() => setLooseTracksMinimized(!looseTracksMinimized)}
                                          aria-label={looseTracksMinimized ? 'Expand loose tracks' : 'Collapse loose tracks'}
                                        >
                                            {looseTracksMinimized ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                                        </Button>
                                        <p className="hidden sm:block text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Unassigned Singles & Ideas</p>
                                      </>
                                    )}
                                    {unassignedTracks.length === 0 && (
                                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Tap + to capture a single</p>
                                    )}
                                </div>
                                <Badge variant="outline" className="border-primary/20 text-primary font-mono shrink-0">{unassignedTracks.length}</Badge>
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
                                                <div key={track.id} className="group flex items-center gap-2 py-4 pl-6 pr-3 rounded-2xl bg-card/95 backdrop-blur-3xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all shadow-xl">
                                                    <Link href={`/albums/unassigned/tracks/${track.id}`} className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 group-hover:bg-primary/20 transition-all shrink-0">
                                                            <CassetteTape className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                              <p className="font-bold font-headline text-base text-foreground uppercase truncate">{track.title}</p>
                                                              <DnaDropLiveIndicator shareId={track.shareId} variant="compact" />
                                                            </div>
                                                            <p className="text-[8px] text-muted-foreground uppercase font-code mt-0.5">{track.vibe?.genre} &middot; {track.vibe?.tempoBPM} BPM</p>
                                                        </div>
                                                    </Link>
                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground">
                                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                                                                <DropdownMenuSub>
                                                                    <DropdownMenuSubTrigger className="text-[10px] font-bold uppercase"><Move className="mr-2 h-4 w-4" /> Move To Album</DropdownMenuSubTrigger>
                                                                    <DropdownMenuPortal>
                                                                        <DropdownMenuSubContent className="bg-card border-border">
                                                                            {realAlbums.map(album => (
                                                                                <DropdownMenuItem key={album.id} onClick={() => { moveTrack(track.id, 'unassigned', album.id); toast({ title: "Track Assigned", description: `"${track.title}" moved to ${album.title}. Album DNA inherit is on.` }); }} className="text-[10px] font-bold uppercase">
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
                                                        <Link
                                                            href={`/albums/unassigned/tracks/${track.id}`}
                                                            className="p-1.5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5"
                                                            aria-label={`Open ${track.title}`}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                            <ProCreateTrackSlot onClick={() => setCreateItemType('Track')} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                    </div>

                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200" data-tour="vault-collection">
                        <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-6">
                            <div>
                                <h2 className="text-3xl font-headline font-bold text-foreground uppercase tracking-tighter flex items-center gap-3">
                                    <Music className="text-emerald-500 h-8 w-8" /> YOUR COLLECTION
                                </h2>
                                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Concept Album DNA Architectures</p>
                            </div>
                            {filteredAlbums.length > 0 && (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono ml-auto">{filteredAlbums.length}</Badge>
                            )}
                        </div>
                        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-12 gap-y-12 px-2 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredAlbums.map((album) => (
                                <VinylRecord key={album.id} album={album} />
                            ))}
                            {isPaidPro && (
                              <ProCreateAlbumSlot onClick={() => setCreateItemType('Album')} />
                            )}
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>

        {user && !isEmpty && (
          <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
            <Button
              variant="outline"
              tabIndex={-1}
              onClick={() => setShowClearVaultConfirm(true)}
              className="pointer-events-auto h-6 min-h-6 px-2.5 gap-1 rounded-lg border-red-500/30 bg-card backdrop-blur-md text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.35)] font-bold text-[8px] uppercase tracking-wider"
            >
              <Trash2 className="h-3 w-3 shrink-0" />
              Clear Vault
            </Button>
          </div>
        )}
      </div>

      <CreateItemDialog
        open={!!createItemType}
        onOpenChange={(isOpen) => {
          if (isOpen) return;
          setCreateItemType(null);
          if (searchParams.get('create')) {
            router.replace(pathname, { scroll: false });
          }
        }}
        type={createItemType || 'Album'}
      />
      
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
          const file = e.target.files?.[0]; if(!file) return;
          if (!canExportVault(user)) {
            toast(IMPORT_PRO_TOAST);
            e.target.value = '';
            return;
          }
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
                  <AlertDialogAction onClick={handleImportMerge} disabled={isImporting} className="font-bold">
                    {isImporting ? 'Merging...' : 'Merge Blueprints'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearVaultConfirm} onOpenChange={setShowClearVaultConfirm}>
          <AlertDialogContent className="bg-card border-2 max-w-lg">
              <AlertDialogHeader>
                  <AlertDialogTitle className="font-headline text-2xl text-red-500 uppercase">Clear Vault / Start Fresh?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm font-code text-muted-foreground">
                      <p>
                        This permanently deletes all albums and loose tracks from your studio vault. Your style profile and account stay intact.
                      </p>
                      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-200/90">
                        <strong className="text-amber-300">Recommended:</strong> export your vault first so you can import it again later if you change your mind.
                      </p>
                    </div>
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleExport();
                      toast({
                        title: 'Vault Exported',
                        description: 'Backup saved. You can erase the vault when ready.',
                      });
                    }}
                    className="w-full sm:w-auto gap-2 font-bold border-primary/30 hover:bg-primary/10"
                  >
                    <Download className="h-4 w-4" />
                    Export Vault First
                  </Button>
                  <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                    <AlertDialogCancel className="font-bold" disabled={isClearingVault}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearVault} disabled={isClearingVault} className="bg-red-600 hover:bg-red-700 font-bold">
                      {isClearingVault ? 'Clearing...' : 'Erase Everything'}
                    </AlertDialogAction>
                  </div>
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
                  <AlertDialogAction onClick={() => { if(trackToDelete) { deleteTrack(trackToDelete.albumId || 'unassigned', trackToDelete.id); setTrackToDelete(null); toast({ title: "Track Scrapped" }); } }} className="bg-red-600 hover:bg-red-700 font-bold">Scrap Asset</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {user && (
        <DowngradeTrackPickerDialog
          open={showDowngradePicker}
          albums={albums}
          userId={user.id}
          onComplete={() => setDowngradePickerDone(true)}
        />
      )}

      <StudioGuidedTour
        active={vaultTourActive}
        stepIndex={vaultTourStep}
        onStepChange={setVaultTourStep}
        onComplete={handleVaultTourComplete}
        onBeforeStep={handleVaultTourBeforeStep}
        steps={VAULT_PAGE_TOUR_STEPS}
      />
    </TooltipProvider>
  );
}
