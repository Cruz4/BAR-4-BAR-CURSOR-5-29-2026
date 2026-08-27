'use client';

import React, { useEffect, useState, useContext, useMemo, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { DataContext } from '@/context/data-context';
import type { ProjectShare, Album, Track } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Globe,
    Compass,
    Target,
    Sparkles,
    Import,
    Eye,
    Zap,
    Clock,
    LogIn,
    EyeOff,
    ExternalLink,
    Link2,
    ChevronLeft,
    Pencil,
    Disc3,
} from 'lucide-react';
import { StudioLoader } from '@/components/studio-loader';
import { ShareCoverImage } from '@/components/share-cover-image';
import { format } from 'date-fns';
import {
  sharedTrackIntents,
  resolveSharedDirection,
  resolveDnaDropCoverArt,
  findTrackInVault,
  normalizeDnaDropMedia,
  type DnaDropTrackPayload,
  type DnaDropAlbumPayload,
} from '@/lib/dna-drop';
import { isLooseTrackAlbum } from '@/lib/co-writer-rules';
import { DnaDropAlbumHub } from '@/components/dna-drop-album-hub';
import { DropListenPanel } from '@/components/drop-listen-panel';
import { AlbumReleasePlaylist } from '@/components/album-release-playlist';
import { DropSocialPanel } from '@/components/drop-social-panel';
import { normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import { EmbedPlayer } from '@/components/profile/embed-player';
import { parseEmbedUrl } from '@/lib/profile/embeds';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { recordShareImport } from '@/lib/share-import-client';
import { HighlightedText } from '@/components/highlighted-text';
import { buildClientRhymeGroups } from '@/lib/lyrics-analysis/client-rhyme-groups';
import { vaultHref } from '@/lib/scene-home';
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
import Link from 'next/link';
import { buildDropBuyLoginPath, buildLoginPath } from '@/lib/checkout-intent';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { manageRelease } from '@/lib/release-management-client';

export default function SharedProjectPage() {
    const params = useParams();
    const shareId = params.shareId as string;
    const router = useRouter();
    const { toast } = useToast();
    const { user, authReady } = useAuth();
    const { mergeData, isCloudSyncActive, getAlbumById, albums, revokeDNA } = useContext(DataContext);

    const [share, setShare] = useState<ProjectShare | null>(null);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isTakingOffline, setIsTakingOffline] = useState(false);
    const [offlineConfirmOpen, setOfflineConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchShare = async () => {
            if (!authReady) return;
            const docRef = doc(db, 'shares', shareId);
            const [snap, visibilityResponse] = await Promise.all([
                getDoc(docRef),
                fetch(`/api/dna/manage?shareId=${encodeURIComponent(shareId)}`, { cache: 'no-store' }),
            ]);
            if (snap.exists()) {
                const data = snap.data() as ProjectShare;
                const visibility = visibilityResponse.ok
                    ? await visibilityResponse.json() as { dnaLive?: boolean; releaseLive?: boolean }
                    : null;
                const isPublic = Boolean(visibility?.dnaLive || visibility?.releaseLive);
                if (isPublic || user?.id === data.ownerId) {
                    setShare(data);
                    updateDoc(docRef, { views: increment(1) }).catch(() => undefined);
                } else {
                    setShare(null);
                }
            }
            setLoading(false);
        };
        void fetchShare();
    }, [shareId, authReady, user?.id]);

    const formattedShareDate = useMemo(() => {
        if (!share?.updatedAt && !share?.createdAt) return 'Recent';
        const date = new Date(share.updatedAt || share.createdAt);
        return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM d, yyyy');
    }, [share?.updatedAt, share?.createdAt]);

    const project = share?.data as DnaDropAlbumPayload | DnaDropTrackPayload | undefined;
    const isAlbum = share?.type === 'album';
    const trackProject = !isAlbum ? (project as DnaDropTrackPayload | undefined) : undefined;
    const direction = project ? resolveSharedDirection(project) : undefined;
    const displayIntents = useMemo(() => {
        if (!project) return [] as string[];
        if (isAlbum) return (project as DnaDropAlbumPayload).thingsToSay ?? [];
        return sharedTrackIntents(project as DnaDropTrackPayload);
    }, [project, isAlbum]);
    const dropMedia = useMemo(
      () => normalizeDnaDropMedia(project?.dnaDropMedia),
      [project]
    );
    const hasFirstDropAudio = useMemo(() => {
      if (!project) return false;
      if (isAlbum) {
        return Boolean(
          (project as DnaDropAlbumPayload).tracks?.some((t) => normalizeDropAudio(t.dropAudio))
        );
      }
      return Boolean(normalizeDropAudio((project as DnaDropTrackPayload).dropAudio));
    }, [project, isAlbum]);
    const isOwnShare = Boolean(user && share && user.id === share.ownerId);
    const isReleaseShare = Boolean(
      project && hasFirstDropAudio && (
        project.releaseShareId === shareId
        || share?.releaseStatus === 'live'
        || (!project.releaseShareId && share?.releaseStatus !== 'unlisted')
      )
    );

    const vaultTrack = useMemo(() => {
        if (!project || isAlbum) return null;
        return findTrackInVault(albums, project.id);
    }, [project, isAlbum, albums]);

    /** Track art first; else album cover from snapshot context (or vault for older drops). */
    const coverArtSrc = useMemo(() => {
        if (!project) return undefined;
        if (isAlbum) return (project as DnaDropAlbumPayload).coverArtUrl;
        const vaultAlbum = vaultTrack?.album;
        const vaultAlbumCover =
          vaultAlbum && !isLooseTrackAlbum(vaultAlbum) ? vaultAlbum.coverArtUrl : undefined;
        return resolveDnaDropCoverArt(project as DnaDropTrackPayload, vaultAlbumCover);
    }, [project, isAlbum, vaultTrack]);

    /** Rhyme Pulse–style end-word highlighting for the shared lyrics sheet (track drops only). */
    const rhymeGroups = useMemo(() => {
        if (!project || isAlbum) return [];
        const lines: string[] = [];
        for (const sec of (project as DnaDropTrackPayload).sections || []) {
            for (const bar of sec.bars || []) {
                if (bar.text?.trim()) lines.push(bar.text);
            }
        }
        return buildClientRhymeGroups(lines);
    }, [project, isAlbum]);

    const alreadyInVault = useMemo(() => {
        if (!project || !isOwnShare) return false;
        if (isAlbum) return Boolean(getAlbumById(project.id));
        return Boolean(vaultTrack);
    }, [project, isOwnShare, isAlbum, getAlbumById, vaultTrack]);

    const editHref = useMemo(() => {
        if (!project) return null;
        if (isAlbum) return `/albums/${project.id}`;
        return `/albums/${vaultTrack?.album.id ?? 'unassigned'}/tracks/${project.id}`;
    }, [project, isAlbum, vaultTrack]);

    const ownerEditLabel = isAlbum ? 'Open album' : 'Edit track sheet';

    const openInVault = useCallback(() => {
        if (!editHref) return;
        router.push(editHref);
    }, [editHref, router]);

    const homeHref = user ? vaultHref() : '/';

    const handleLeavePage = useCallback(() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
            return;
        }
        router.push(homeHref);
    }, [router, homeHref]);

    const handleImportClick = () => {
        if (!authReady) return;

        if (!user) {
            router.push(`${buildLoginPath(`/share/${shareId}`)}&intent=dna-import`);
            return;
        }

        if (!isCloudSyncActive) {
            router.push(`/pricing?next=${encodeURIComponent(`/share/${shareId}`)}`);
            return;
        }

        if (isOwnShare && alreadyInVault) {
            openInVault();
            return;
        }

        setConfirmOpen(true);
    };

    const handleConfirmImport = async () => {
        if (!share || !project) return;

        setConfirmOpen(false);
        setIsImporting(true);
        try {
            const data = share.data;
            if (share.type === 'album') await mergeData([data as Album], []);
            else await mergeData([], [data as Track]);

            await recordShareImport(shareId);

            toast({
                title: 'DNA Imported',
                description: `"${project.title}" was merged into your vault. You can edit it anytime.`,
            });

            if (isAlbum) router.push(`/albums/${(data as Album).id}`);
            else router.push(`/albums/unassigned/tracks/${(data as Track).id}`);
        } catch (e) {
            console.error('Import failed', e);
            toast({
                variant: 'destructive',
                title: 'Import failed',
                description: 'Could not merge this DNA Drop. Try again in a moment.',
            });
        } finally {
            setIsImporting(false);
        }
    };

    const handleTakeOffline = async () => {
        if (!share || !project) return;
        setOfflineConfirmOpen(false);
        setIsTakingOffline(true);
        try {
            await revokeDNA(share.type, project.id, shareId);
            toast({
                title: 'DNA Drop offline',
                description: 'The public link no longer works.',
            });
            // Prefer the page they came from (profile, vault, etc.). Fall back to the
            // project edit page only when this tab has no prior history (e.g. opened link cold).
            if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
            } else {
                router.push(editHref ?? '/');
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Could not take this DNA Drop offline.';
            toast({ variant: 'destructive', title: 'Offline failed', description: message });
        } finally {
            setIsTakingOffline(false);
        }
    };

    const handleUnpressRelease = async () => {
        if (!share || !project) return;
        setOfflineConfirmOpen(false);
        setIsTakingOffline(true);
        try {
            const albumId = isAlbum
              ? project.id
              : vaultTrack?.album.id || (project as DnaDropTrackPayload).albumId;
            if (!albumId) throw new Error('Open this release from your Vault to manage it.');
            await manageRelease({
              kind: isAlbum ? 'album' : 'track',
              action: 'unpublish',
              albumId,
              ...(isAlbum ? {} : { trackId: project.id }),
            });
            toast({
                title: isAlbum ? 'Album release taken offline' : 'Song release taken offline',
                description: 'New discovery and checkout are off. Existing buyers keep access.',
            });
            router.push(vaultHref());
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Could not take this release offline.';
            toast({ variant: 'destructive', title: 'Take offline failed', description: message });
        } finally {
            setIsTakingOffline(false);
        }
    };

    if (loading) {
        return <StudioLoader size="lg" fullscreen message="Accessing Studio Vault..." />;
    }

    if (!share || !project) {
        return (
            <div className="h-screen flex items-center justify-center p-4">
                <Card className="max-w-md text-center border-2">
                    <CardHeader>
                        <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                        <CardTitle className="font-headline text-3xl">VAULT CLOSED</CardTitle>
                        <CardDescription>This project share is no longer live or the link is invalid.</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button className="w-full" onClick={() => router.push('/login')}>
                            Go to Bar 4 Bar
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const importLabel = !user
        ? hasFirstDropAudio
          ? 'Import lyrics & DNA'
          : 'Sign in to Import'
        : isOwnShare && alreadyInVault
          ? ownerEditLabel
          : 'Import Setup';

    const guestImportHint =
      'Copies lyrics, structure, and Creative DNA into your vault — not the song. Use Pay what you want below to buy the stream.';

    const OwnerEditIcon = isAlbum ? Disc3 : Pencil;

    return (
        <div className="min-h-screen relative selection:bg-primary/30 overflow-x-hidden font-code">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                <div className="h-full w-full bg-[repeating-linear-gradient(theme(colors.border),theme(colors.border)_1px,transparent_1px,transparent_24px)]" />
            </div>

            <header className="sticky top-0 z-[100] min-h-14 border-b bg-background/80 backdrop-blur-md px-3 sm:px-6 py-2 relative flex items-center justify-between gap-2">
                <div className="relative z-10 flex shrink-0 items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLeavePage}
                        className="h-8 sm:h-9 shrink-0 px-2 font-bold text-muted-foreground hover:text-foreground"
                        aria-label="Go back"
                        title="Go back"
                    >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-[10px] uppercase tracking-widest">Back</span>
                    </Button>
                </div>
                <Link
                    href={homeHref}
                    className="absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 sm:gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={user ? 'Go to vault' : 'Go to Bar 4 Bar'}
                >
                    <div className="shrink-0 overflow-hidden rounded-lg h-8 w-8 sm:h-9 sm:w-9 border border-primary/20 bg-black">
                        <Image src="/Logo.png" alt="Bar 4 Bar" width={36} height={36} className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 hidden sm:block">
                        <h1 className="truncate font-headline text-sm sm:text-lg font-bold leading-none tracking-tight text-foreground">
                            BAR 4 BAR
                        </h1>
                        <p className="text-[7px] sm:text-[8px] text-muted-foreground uppercase tracking-[0.18em] mt-0.5 truncate">
                            {hasFirstDropAudio
                              ? isAlbum
                                ? 'Album · preview every track · buy once'
                                : 'Song · 30s preview · buy to stream'
                              : 'DNA Drop Snapshot'}
                        </p>
                    </div>
                </Link>
                <div className="relative z-10 flex shrink-0 items-center gap-1.5 sm:gap-3 ml-auto">
                    <div className="hidden md:flex items-center gap-4 mr-2 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">{share.views.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Import className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">{share.imports.toLocaleString()}</span>
                        </div>
                    </div>
                    {isOwnShare && (
                        <Button
                            onClick={() => setOfflineConfirmOpen(true)}
                            size="sm"
                            variant="outline"
                            className="h-8 sm:h-9 px-2 sm:px-3 font-bold border-red-500/30 text-red-500 hover:bg-red-500/10"
                            disabled={isTakingOffline}
                            aria-label={isReleaseShare ? 'Take release offline' : 'Take DNA offline'}
                            title={isReleaseShare ? 'Take release offline' : 'Take DNA offline'}
                        >
                            {isTakingOffline ? <StudioLoader size="sm" /> : <EyeOff className="h-3.5 w-3.5 sm:mr-1.5" />}
                            <span className="hidden sm:inline">Take offline</span>
                        </Button>
                    )}
                    {!user && hasFirstDropAudio ? (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleImportClick}
                              size="sm"
                              className="h-8 sm:h-9 px-2.5 sm:px-4 font-bold shadow-lg max-w-[11rem] sm:max-w-none"
                              disabled={isImporting}
                            >
                              {isImporting ? (
                                <StudioLoader size="sm" />
                              ) : (
                                <LogIn className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                              )}
                              <span className="truncate text-[10px] sm:text-sm">
                                <span className="sm:hidden">Lyrics &amp; DNA</span>
                                <span className="hidden sm:inline">{importLabel}</span>
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[16rem] text-[11px] leading-relaxed">
                            {guestImportHint}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                    <Button
                        onClick={handleImportClick}
                        size="sm"
                        className="h-8 sm:h-9 px-2.5 sm:px-4 font-bold shadow-lg max-w-[11rem] sm:max-w-none"
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <StudioLoader size="sm" />
                        ) : !user ? (
                            <LogIn className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        ) : isOwnShare && alreadyInVault ? (
                            <OwnerEditIcon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        ) : (
                            <Import className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        )}
                        <span className="truncate text-[10px] sm:text-sm">
                            {isOwnShare && alreadyInVault ? (
                                <>
                                    <span className="sm:hidden">{isAlbum ? 'Album' : 'Edit'}</span>
                                    <span className="hidden sm:inline">{importLabel}</span>
                                </>
                            ) : (
                                importLabel
                            )}
                        </span>
                    </Button>
                    )}
                </div>
            </header>

            {!user && (
                <div className="container max-w-7xl mx-auto px-4 pt-4 relative z-10">
                    <Card className={hasFirstDropAudio ? 'border-fuchsia-500/40 bg-fuchsia-500/10' : 'border-primary/25 bg-primary/5'}>
                        <CardContent className="p-4 text-[11px] font-code text-muted-foreground leading-relaxed">
                            {hasFirstDropAudio ? (
                              <>
                                Hit play for a 30-second preview. Buy once to stream the full {isAlbum ? 'album' : 'song'} in Bar4Bar — not Spotify.
                                {' '}
                                <button
                                  type="button"
                                  className="text-fuchsia-300 underline underline-offset-2 font-bold"
                                  onClick={() => router.push(buildDropBuyLoginPath(shareId, {}, isAlbum ? 'share' : 'song'))}
                                >
                                  Sign up to unlock
                                </button>
                                {`. Import lyrics & DNA is the button above — it does not purchase the ${isAlbum ? 'album' : 'song'}.`}
                              </>
                            ) : isAlbum ? (
                              <>
                            Import Setup copies this album snapshot — album DNA plus every track’s lyrics & structure — into your Bar 4 Bar vault. Open a live song card for that track’s public DNA Drop page.
                            {' '}
                            <button type="button" className="text-primary underline underline-offset-2 font-bold" onClick={() => router.push(`${buildLoginPath(`/share/${shareId}`)}&intent=dna-import`)}>
                                Sign in or create a free account
                            </button>
                            {' '}to import. Studio Pro is required to import DNA Drops from other artists.
                              </>
                            ) : (
                              <>
                            Import Setup copies this snapshot — lyrics, structure, Creative DNA, intents, vibe, guardrails, special instructions, and Style DNA when shared — into your Bar 4 Bar vault.
                            {' '}
                            <button type="button" className="text-primary underline underline-offset-2 font-bold" onClick={() => router.push(`${buildLoginPath(`/share/${shareId}`)}&intent=dna-import`)}>
                                Sign in or create a free account
                            </button>
                            {' '}to import. Studio Pro is required to import DNA Drops from other artists.
                              </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <main className="container max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                <div className="lg:col-span-4 space-y-6">
                    <Suspense fallback={null}>
                      {isAlbum ? (
                        <AlbumReleasePlaylist
                          album={project as DnaDropAlbumPayload}
                          shareId={shareId}
                          ownerId={share.ownerId}
                          ownerName={share.ownerName}
                          houseRelease={share.houseRelease === true}
                        />
                      ) : (
                        <DropListenPanel
                          shareId={shareId}
                          source="share"
                          title={project.title || 'Untitled'}
                          artistName={share.ownerName}
                          ownerId={share.ownerId}
                          price={normalizeDropPrice((project as DnaDropTrackPayload).dropPrice)}
                          hasAudio={hasFirstDropAudio}
                          houseRelease={share.houseRelease === true}
                          checkoutDestination="song"
                        />
                      )}
                    </Suspense>
                    <DropSocialPanel
                      shareId={shareId}
                      title={project.title || 'Untitled'}
                      ownerId={share.ownerId}
                      playCount={share.playCount}
                      previewCount={share.previewCount}
                      purchaseCount={share.purchaseCount}
                      firstBuyerName={share.firstBuyerName}
                      hasAudio={hasFirstDropAudio}
                      ownerName={share.ownerName}
                    />
                    <Card className="border-2 overflow-hidden bg-card/80">
                        <div className="aspect-square relative w-full border-b bg-neutral-950">
                            <ShareCoverImage
                                src={coverArtSrc}
                                alt={project.title || 'Project Snapshot'}
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 pointer-events-none">
                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-white uppercase tracking-tighter leading-none break-words">{project.title}</h2>
                                <p className="text-[10px] text-primary font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
                                    <Sparkles className="h-3 w-3 shrink-0" /> by {share.ownerName}
                                </p>
                            </div>
                        </div>
                        <CardContent className="p-4 sm:p-6 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                                    <Globe className="h-3 w-3" /> {isAlbum ? 'Album DNA' : 'Track Theme'}
                                </h4>
                                <p className="text-sm italic text-muted-foreground leading-relaxed">
                                    &ldquo;{isAlbum ? (project as DnaDropAlbumPayload)?.theme : (project as DnaDropTrackPayload)?.vibe?.feeling?.join(', ')}&rdquo;
                                </p>
                            </div>
                            {direction && (
                                <div className="space-y-4 border-t pt-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-600 flex items-center gap-2">
                                        <Compass className="h-3 w-3" /> Architecture (The 5 Questions)
                                    </h4>
                                    <div className="space-y-3">
                                        {Object.entries(direction).map(([key, value]) => {
                                            if (!value || typeof value !== 'string' || key === 'updatedAt') return null;
                                            return (
                                                <div key={key} className="space-y-0.5">
                                                    <p className="text-[8px] font-bold uppercase text-muted-foreground/60">{key.replace(/_/g, ' ')}</p>
                                                    <p className="text-[11px] font-bold text-foreground leading-snug">{value}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {!isAlbum && trackProject?.vibe?.enabled !== false && (trackProject?.vibe?.genre || trackProject?.vibe?.instrumentation) && (
                                <div className="space-y-2 border-t pt-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Vibe</h4>
                                    <p className="text-[11px] text-muted-foreground">
                                        {[trackProject.vibe.genre, trackProject.vibe.tempoBPM ? `${trackProject.vibe.tempoBPM} BPM` : null].filter(Boolean).join(' · ')}
                                    </p>
                                    {trackProject.vibe.instrumentation && (
                                        <p className="text-[11px] italic text-muted-foreground">&ldquo;{trackProject.vibe.instrumentation}&rdquo;</p>
                                    )}
                                </div>
                            )}
                            {dropMedia.length > 0 && (
                                <div className="space-y-3 border-t pt-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Link2 className="h-3 w-3" /> Links &amp; embeds
                                    </h4>
                                    <div className="space-y-3">
                                        {dropMedia.map((url) =>
                                            parseEmbedUrl(url) ? (
                                                <EmbedPlayer key={url} url={url} />
                                            ) : (
                                                <a
                                                    key={url}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer nofollow"
                                                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-primary hover:border-primary/40"
                                                >
                                                    <span className="min-w-0 flex-1 truncate">{url}</span>
                                                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                                </a>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {isOwnShare && alreadyInVault && editHref && (
                        <Card className="border-emerald-500/35 bg-emerald-500/5">
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                                        Your DNA Drop
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {isAlbum
                                          ? 'Jump back into this album in your vault to edit tracks, cover, and DNA.'
                                          : 'Open the writable lyric sheet for this track in your vault.'}
                                    </p>
                                </div>
                                <Button
                                    asChild
                                    size="sm"
                                    className="h-9 shrink-0 gap-1.5 font-bold uppercase tracking-wider"
                                >
                                    <Link href={editHref}>
                                        <OwnerEditIcon className="h-3.5 w-3.5" />
                                        {ownerEditLabel}
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-sky-500/30 bg-sky-500/5">
                        <CardHeader className="p-4">
                            <CardTitle className="text-xs font-headline uppercase text-sky-500 flex items-center gap-2">
                                <Target className="h-4 w-4" /> Selected Motifs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex flex-wrap gap-1.5">
                                {displayIntents.length > 0 ? displayIntents.map((intent: string) => (
                                    <Badge key={intent} variant="outline" className="text-[8px] uppercase border-sky-500/30 text-sky-600 bg-sky-500/5 py-1 px-2">
                                        {intent}
                                    </Badge>
                                )) : (
                                    <p className="text-[10px] text-muted-foreground italic">No motifs in this snapshot.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {!isAlbum && trackProject?.sharedStyle?.analysis && (
                        <Card className="border-fuchsia-500/30 bg-fuchsia-500/5">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-headline uppercase text-fuchsia-400">Style DNA</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-[11px] italic text-muted-foreground leading-relaxed">
                                &ldquo;{trackProject.sharedStyle.analysis}&rdquo;
                            </CardContent>
                        </Card>
                    )}

                    {!isAlbum && trackProject?.specialInstructions?.trim() && (
                        <Card className="border-blue-500/30 bg-blue-500/5">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-headline uppercase text-blue-400">Special Instructions</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground leading-relaxed">
                                {trackProject.specialInstructions}
                            </CardContent>
                        </Card>
                    )}

                    {!isAlbum && trackProject?.guardrails?.enabled && (
                        <Card className="border-rose-500/30 bg-rose-500/5 overflow-hidden">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-headline uppercase text-rose-400">Guardrails</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-2 text-[10px] text-muted-foreground min-w-0">
                                {Array.isArray(trackProject.guardrails.forbiddenWords) &&
                                    trackProject.guardrails.forbiddenWords.length > 0 && (
                                    <p className="break-words [overflow-wrap:anywhere]">
                                        <span className="font-bold uppercase text-rose-500/80">Forbidden:</span>{' '}
                                        {trackProject.guardrails.forbiddenWords.join(', ')}
                                    </p>
                                )}
                                {Array.isArray(trackProject.guardrails.mustIncludeWords) &&
                                    trackProject.guardrails.mustIncludeWords.length > 0 && (
                                    <p className="break-words [overflow-wrap:anywhere]">
                                        <span className="font-bold uppercase text-emerald-500/80">Must include:</span>{' '}
                                        {trackProject.guardrails.mustIncludeWords.join(', ')}
                                    </p>
                                )}
                                {trackProject.guardrails.negativePrompt?.trim() && (
                                    <p className="break-words [overflow-wrap:anywhere]">
                                        <span className="font-bold uppercase text-rose-500/80">Avoid:</span>{' '}
                                        {trackProject.guardrails.negativePrompt.trim()}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-8 space-y-8">
                    {isAlbum ? (
                        <DnaDropAlbumHub
                            album={project as DnaDropAlbumPayload}
                            shareId={shareId}
                            ownerId={share.ownerId}
                            ownerName={share.ownerName}
                            houseRelease={share.houseRelease === true}
                        />
                    ) : (
                    <Card className="border-2 shadow-2xl relative overflow-hidden bg-notebook min-h-[60vh] md:min-h-[80vh] [--lyrics-gutter:2.75rem] md:[--lyrics-gutter:100px] [--lyrics-lh:20px] md:[--lyrics-lh:32px]">
                        <style>{`
                            .bg-notebook {
                                background-image:
                                    linear-gradient(90deg, transparent var(--lyrics-gutter), #ff000022 var(--lyrics-gutter), #ff000022 calc(var(--lyrics-gutter) + 1px), transparent calc(var(--lyrics-gutter) + 1px)),
                                    repeating-linear-gradient(transparent, transparent calc(var(--lyrics-lh) - 1px), #ffffff05 calc(var(--lyrics-lh) - 1px), #ffffff05 var(--lyrics-lh));
                                background-size: 100% var(--lyrics-lh);
                                background-attachment: local;
                            }
                        `}</style>
                        <CardHeader className="bg-card border-b relative z-10 px-4 py-4 sm:px-8 sm:py-6 md:p-12 md:py-8">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-primary/20 text-primary">
                                    Live Snapshot
                                </Badge>
                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase font-bold">
                                    <Clock className="h-3 w-3" /> Updated {formattedShareDate}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 relative z-10">
                                <div className="px-3 py-6 sm:px-6 sm:py-8 md:p-12 space-y-8 md:space-y-12">
                                    {(project as DnaDropTrackPayload)?.sections?.map((sec: Track['sections'][number]) => (
                                        <div key={sec.id} className="space-y-0">
                                            <h4 className="text-base sm:text-xl md:text-2xl font-headline font-bold text-sky-400 uppercase mb-2 md:mb-4 pl-[calc(var(--lyrics-gutter)+0.5rem)]">{sec.type}</h4>
                                            {sec.bars.map((bar) => (
                                                <div
                                                    key={bar.idx}
                                                    className="relative flex items-start min-h-[var(--lyrics-lh)] pl-[calc(var(--lyrics-gutter)+0.5rem)] pr-2"
                                                >
                                                    <span className="absolute left-0 w-[var(--lyrics-gutter)] pr-1.5 text-right font-mono text-[10px] md:text-sm text-muted-foreground/40 leading-[var(--lyrics-lh)] font-bold tabular-nums">
                                                        {String(bar.idx).padStart(2, '0')}
                                                    </span>
                                                    <p className="text-[14px] md:text-xl lg:text-2xl font-code font-bold leading-[var(--lyrics-lh)] tracking-tight text-foreground/90 break-words whitespace-pre-wrap min-w-0 w-full">
                                                        {bar.text ? (
                                                          <HighlightedText text={bar.text} rhymeGroups={rhymeGroups} />
                                                        ) : (
                                                          '...'
                                                        )}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                        </CardContent>
                    </Card>
                    )}
                </div>
            </main>

            <footer className="py-12 border-t mt-12 bg-muted/5 flex flex-col items-center gap-6 relative z-10">
                <div className="overflow-hidden rounded-xl border border-primary/20 bg-black h-10 w-10">
                    <Image src="/Logo.png" alt="B4B" width={40} height={40} className="h-full w-full object-contain" />
                </div>
                <p className="text-[11px] text-muted-foreground font-code text-center uppercase tracking-[0.4em]">
                    Built and shared via Bar 4 Bar Studio
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(user ? '/' : '/login')}
                    className="h-10 px-8 font-bold uppercase tracking-widest text-[10px] rounded-full border-primary/20 text-primary"
                >
                    {user ? 'Go to my vault' : 'Initialize your own studio'}
                </Button>
            </footer>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="bg-card border-2">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-headline text-2xl uppercase">Import DNA setup?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-code leading-relaxed space-y-2">
                            <span className="block">
                                This merges <strong className="text-foreground">{project.title}</strong> into your vault — lyrics, sections, Creative DNA, checked intents, vibe, guardrails, special instructions, and Style DNA (when included).
                            </span>
                            {isOwnShare ? (
                                <span className="block text-amber-200/90">
                                    This is your own DNA Drop. Import updates the copy already in your vault (same project ID).
                                </span>
                            ) : (
                                <span className="block">You can edit everything after import. Existing projects with the same ID will be merged.</span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleConfirmImport()} className="font-bold" disabled={isImporting}>
                            {isImporting ? 'Importing…' : 'Import into vault'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={offlineConfirmOpen} onOpenChange={setOfflineConfirmOpen}>
                <AlertDialogContent className="bg-card border-2">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-headline text-2xl uppercase">
                          {isReleaseShare ? `Take this ${isAlbum ? 'album' : 'song'} release offline?` : 'Take this DNA Drop offline?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-code leading-relaxed">
                            {isReleaseShare ? 'New discovery and checkout will stop; existing buyers keep access.' : 'The public lyric link will stop working immediately.'}
                            You&apos;ll go back to where you came from — publish again anytime from the project.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void (isReleaseShare ? handleUnpressRelease() : handleTakeOffline())}
                            className="font-bold bg-red-500 hover:bg-red-600 text-white"
                            disabled={isTakingOffline}
                        >
                            {isTakingOffline ? 'Taking offline…' : (isReleaseShare ? 'Take release offline' : 'Take offline')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
