'use client';

import React, { useEffect, useState, useContext, useMemo, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/client/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { DataContext } from '@/context/data-context';
import type { ProjectShare, Album, Track } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Globe,
    Compass,
    Target,
    Import,
    Eye,
    LogIn,
    EyeOff,
    ExternalLink,
    Link2,
    ChevronLeft,
    Pencil,
    Disc3,
    Dna,
} from 'lucide-react';
import { StudioLoader } from '@/components/studio-loader';
import { DnaDropAtmosphere } from '@/components/dna-drop-atmosphere';
import { DnaDropLyricSheet } from '@/components/dna-drop-lyric-sheet';
import { ShareCoverImage } from '@/components/share-cover-image';
import { format } from 'date-fns';
import {
  sharedTrackIntents,
  resolveSharedDirection,
  resolveDnaDropCoverArt,
  findTrackInVault,
  normalizeDnaDropMedia,
  trackLyricBarCount,
  type DnaDropTrackPayload,
  type DnaDropAlbumPayload,
} from '@/lib/dna-drop';
import { orderAlbumTracks } from '@/lib/album-track-order';
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
import { cn } from '@/lib/utils';
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
import { buildDropBuyLoginPath } from '@/lib/checkout-intent';
import {
  DNA_DROP_SNAPSHOT_TRACK_PARAM,
  DNA_DROP_UPGRADE_PATH,
  buildDnaDropLoginPath,
  dnaDropSharePath,
  resolveDnaDropImportPath,
} from '@/lib/dna-drop-access';
import { pressedSongHref, resolveAlbumHubShareId } from '@/lib/pressed-song';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { manageRelease } from '@/lib/release-management-client';
import { releaseShareIdFromShareDocument, shareDocumentVisibility } from '@/lib/release-management';
import { canManageReleaseShare } from '@/lib/house-artist-link';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { isProOrTrial } from '@/lib/subscription';
import { useOptionalDropPlayer } from '@/context/drop-player-context';

function SharedProjectPageInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const shareId = params.shareId as string;
    const router = useRouter();
    const { toast } = useToast();
    const { user, authReady, loading: authBooting } = useAuth();
    const { mergeData, isCloudSyncActive, getAlbumById, albums, revokeDNA } = useContext(DataContext);
    const dropPlayer = useOptionalDropPlayer();
    const viewerIsPro = isProOrTrial(user);

    const [share, setShare] = useState<ProjectShare | null>(null);
    const [loading, setLoading] = useState(true);
    const [dnaAccessRedirecting, setDnaAccessRedirecting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isTakingOffline, setIsTakingOffline] = useState(false);
    const [offlineConfirmOpen, setOfflineConfirmOpen] = useState(false);
    const [hubVisibility, setHubVisibility] = useState<{ dnaLive: boolean; releaseLive: boolean } | null>(null);

    useEffect(() => {
        const fetchShare = async () => {
            // Guests settle with authReady=false; waiting on authReady hangs the share page forever.
            if (authBooting) return;
            if (user && !authReady) return;
            setLoading(true);
            setDnaAccessRedirecting(false);
            let keepLoading = false;
            try {
                const normalizedShareId = shareId.trim().toUpperCase();
                let data: ProjectShare | null = null;
                let albumHubShareId: string | undefined;
                let visibility: { dnaLive: boolean; releaseLive: boolean } | null = null;

                const publicRes = await fetch(
                    `/api/shares/${encodeURIComponent(normalizedShareId)}`,
                    { cache: 'no-store' }
                );
                if (publicRes.ok) {
                    const payload = (await publicRes.json()) as {
                        share: ProjectShare;
                        visibility?: { dnaLive?: boolean; releaseLive?: boolean };
                        albumHubShareId?: string;
                    };
                    data = payload.share;
                    albumHubShareId = payload.albumHubShareId?.trim();
                    visibility = {
                        dnaLive: Boolean(payload.visibility?.dnaLive),
                        releaseLive: Boolean(payload.visibility?.releaseLive),
                    };
                } else if (user) {
                    try {
                        const docRef = doc(db, 'shares', normalizedShareId);
                        const snap = await getDoc(docRef);
                        if (snap.exists()) {
                            data = { id: snap.id, ...(snap.data() as Omit<ProjectShare, 'id'>) };
                        }
                    } catch {
                        /* fall through */
                    }
                }

                if (!data) {
                    setShare(null);
                    keepLoading = true;
                    router.replace('/discover');
                    return;
                }

                const isOwner = Boolean(user?.id && canManageReleaseShare(data, user.id));

                if (!visibility) {
                    const fromShare = shareDocumentVisibility(data as unknown as Record<string, unknown>);
                    try {
                        const visibilityResponse = await fetch(
                            `/api/dna/manage?shareId=${encodeURIComponent(normalizedShareId)}`,
                            { cache: 'no-store' }
                        );
                        if (visibilityResponse.ok) {
                            const parsed = (await visibilityResponse.json()) as {
                                dnaLive?: boolean;
                                releaseLive?: boolean;
                            };
                            visibility = {
                                dnaLive: Boolean(parsed.dnaLive),
                                releaseLive: Boolean(parsed.releaseLive),
                            };
                        } else {
                            visibility = {
                                dnaLive: Boolean(fromShare.dnaLive),
                                releaseLive: Boolean(fromShare.releaseLive),
                            };
                        }
                    } catch {
                        visibility = {
                            dnaLive: Boolean(fromShare.dnaLive),
                            releaseLive: Boolean(fromShare.releaseLive),
                        };
                    }
                }

                const snapshotTrackIdEarly = (searchParams.get(DNA_DROP_SNAPSHOT_TRACK_PARAM) || '').trim();
                const housePublic = Boolean((data as ProjectShare).houseRelease);
                const musicPublic = Boolean(visibility.releaseLive || housePublic);
                const dnaPublic = Boolean(visibility.dnaLive);
                const isPublic = Boolean(dnaPublic || musicPublic || isOwner || housePublic);
                const viewerCanUseDna = isOwner || viewerIsPro;

                const resolvedAlbumHubId =
                    albumHubShareId ||
                    releaseShareIdFromShareDocument(data as unknown as Record<string, unknown>);

                if (
                    data.type === 'album' &&
                    !snapshotTrackIdEarly &&
                    musicPublic &&
                    !isOwner &&
                    resolvedAlbumHubId &&
                    resolvedAlbumHubId.toUpperCase() !== normalizedShareId
                ) {
                    keepLoading = true;
                    router.replace(`/share/${encodeURIComponent(resolvedAlbumHubId)}`);
                    return;
                }

                if (data.type === 'track' && musicPublic && !dnaPublic) {
                    keepLoading = true;
                    router.replace(`/song/${encodeURIComponent(shareId)}`);
                    return;
                }

                if (!isPublic && !isOwner) {
                    setShare(null);
                    keepLoading = true;
                    router.replace('/discover');
                    return;
                }

                const isLyricDnaOnlyTrack =
                    data.type === 'track' && dnaPublic && !musicPublic && !snapshotTrackIdEarly;
                const isAlbumDnaStrand =
                    data.type === 'album' && Boolean(snapshotTrackIdEarly) && dnaPublic;
                if ((isLyricDnaOnlyTrack || isAlbumDnaStrand) && !viewerCanUseDna) {
                    const dest = user ? DNA_DROP_UPGRADE_PATH : buildDnaDropLoginPath(shareId, 'view');
                    setDnaAccessRedirecting(true);
                    keepLoading = true;
                    router.replace(dest);
                    return;
                }

                setHubVisibility(visibility);
                setShare(data);
                const docRef = doc(db, 'shares', normalizedShareId);
                updateDoc(docRef, { views: increment(1) }).catch(() => undefined);
            } catch {
                setShare(null);
                keepLoading = true;
                router.replace('/discover');
            } finally {
                if (!keepLoading) setLoading(false);
            }
        };
        void fetchShare();
    }, [shareId, authBooting, authReady, user, viewerIsPro, router, searchParams]);

    const formattedShareDate = useMemo(() => {
        if (!share?.updatedAt && !share?.createdAt) return 'Recent';
        const date = new Date(share.updatedAt || share.createdAt);
        return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM d, yyyy');
    }, [share?.updatedAt, share?.createdAt]);

    const project = share?.data as DnaDropAlbumPayload | DnaDropTrackPayload | undefined;
    const isAlbum = share?.type === 'album';
    const albumPayload = isAlbum ? (project as DnaDropAlbumPayload | undefined) : undefined;
    const snapshotTrackId = (searchParams.get(DNA_DROP_SNAPSHOT_TRACK_PARAM) || '').trim();
    const snapshotTrack = useMemo((): DnaDropTrackPayload | undefined => {
        if (!albumPayload || !snapshotTrackId) return undefined;
        const ordered = orderAlbumTracks(albumPayload.tracks ?? [], albumPayload);
        return ordered.find((track) => track.id === snapshotTrackId)
          ?? albumPayload.tracks?.find((track) => track.id === snapshotTrackId);
    }, [albumPayload, snapshotTrackId]);
    const viewingAlbumHub = Boolean(isAlbum && !snapshotTrack);
    const albumLyricDnaStrandCount = useMemo(() => {
        if (!albumPayload) return 0;
        return orderAlbumTracks(albumPayload.tracks ?? [], albumPayload).filter(
            (track) => trackLyricBarCount(track) > 0
        ).length;
    }, [albumPayload]);
    const albumHubShareId = useMemo(() => {
        if (!isAlbum) return shareId;
        const payload = project as DnaDropAlbumPayload | undefined;
        const releaseShareId =
            releaseShareIdFromShareDocument({
                ...(share ? (share as unknown as Record<string, unknown>) : {}),
                data: payload,
            }) || payload?.releaseShareId;
        return (
            resolveAlbumHubShareId({
                releaseShareId,
                releaseLive: hubVisibility?.releaseLive,
                dnaShareId: shareId,
                dnaLive: hubVisibility?.dnaLive,
                fallbackShareId: shareId,
            }) || shareId
        );
    }, [isAlbum, share, shareId, project, hubVisibility]);
    const trackProject: DnaDropTrackPayload | undefined =
      snapshotTrack || (!isAlbum ? (project as DnaDropTrackPayload | undefined) : undefined);
    const direction = (snapshotTrack || project) ? resolveSharedDirection(snapshotTrack || project!) : undefined;
    const displayIntents = useMemo(() => {
        if (trackProject) return sharedTrackIntents(trackProject);
        if (!project) return [] as string[];
        if (isAlbum) return (project as DnaDropAlbumPayload).thingsToSay ?? [];
        return sharedTrackIntents(project as DnaDropTrackPayload);
    }, [project, isAlbum, trackProject]);
    const dropMedia = useMemo(
      () => normalizeDnaDropMedia((snapshotTrack || project)?.dnaDropMedia),
      [project, snapshotTrack]
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
    const canManageShare = Boolean(user && share && canManageReleaseShare(share, user.id));
    const canViewDnaLyrics = isOwnShare || viewerIsPro;
    const isReleaseShare = Boolean(
      project && hasFirstDropAudio && (
        project.releaseShareId === shareId
        || share?.releaseStatus === 'live'
        || (!project.releaseShareId && share?.releaseStatus !== 'unlisted')
      )
    );

    const vaultTrack = useMemo(() => {
        if (!trackProject) return null;
        return findTrackInVault(albums, trackProject.id);
    }, [trackProject, albums]);

    useEffect(() => {
        if (!share || !trackProject || !dropPlayer) return;
        const trackHasAudio = Boolean(normalizeDropAudio(trackProject.dropAudio));
        if (!trackHasAudio && dropPlayer.current?.shareId === shareId) {
            dropPlayer.stop();
        }
    }, [share, trackProject, shareId, dropPlayer]);

    /** Track art first; else album cover from snapshot context (or vault for older drops). */
    const coverArtSrc = useMemo(() => {
        if (snapshotTrack && albumPayload) {
            return resolveDnaDropCoverArt(snapshotTrack, albumPayload.coverArtUrl);
        }
        if (!project) return undefined;
        if (viewingAlbumHub) return (project as DnaDropAlbumPayload).coverArtUrl;
        const vaultAlbum = vaultTrack?.album;
        const vaultAlbumCover =
          vaultAlbum && !isLooseTrackAlbum(vaultAlbum) ? vaultAlbum.coverArtUrl : undefined;
        return resolveDnaDropCoverArt(project as DnaDropTrackPayload, vaultAlbumCover);
    }, [project, viewingAlbumHub, snapshotTrack, albumPayload, vaultTrack]);

    /** Rhyme Pulse–style end-word highlighting for the shared lyrics sheet (track drops only). */
    const rhymeGroups = useMemo(() => {
        if (!trackProject) return [];
        const lines: string[] = [];
        for (const sec of trackProject.sections || []) {
            for (const bar of sec.bars || []) {
                if (bar.text?.trim()) lines.push(bar.text);
            }
        }
        return buildClientRhymeGroups(lines);
    }, [trackProject]);

    const alreadyInVault = useMemo(() => {
        if (!project || !isOwnShare) return false;
        if (snapshotTrack) return Boolean(vaultTrack);
        if (isAlbum) return Boolean(getAlbumById(project.id));
        return Boolean(vaultTrack);
    }, [project, isOwnShare, isAlbum, getAlbumById, vaultTrack, snapshotTrack]);

    const editHref = useMemo(() => {
        if (!project) return null;
        if (snapshotTrack) {
            return `/albums/${albumPayload?.id ?? vaultTrack?.album.id ?? 'unassigned'}/tracks/${snapshotTrack.id}`;
        }
        if (isAlbum) return `/albums/${project.id}`;
        return `/albums/${vaultTrack?.album.id ?? 'unassigned'}/tracks/${project.id}`;
    }, [project, isAlbum, vaultTrack, snapshotTrack, albumPayload]);

    const ownerEditLabel = snapshotTrack || !isAlbum ? 'Edit track sheet' : 'Open album';

    const openInVault = useCallback(() => {
        if (!editHref) return;
        router.push(editHref);
    }, [editHref, router]);

    const homeHref = user ? vaultHref() : '/';

    const handleLeavePage = useCallback(() => {
        if (snapshotTrack) {
            router.push(dnaDropSharePath(shareId));
            return;
        }
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
            return;
        }
        router.push(homeHref);
    }, [router, homeHref, snapshotTrack, shareId]);

    const handleImportClick = () => {
        if (authBooting) return;

        if (!user || !viewerIsPro) {
            router.push(resolveDnaDropImportPath(shareId, {
              signedIn: Boolean(user),
              isPro: viewerIsPro,
            }));
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
        if (!viewerIsPro) {
            router.push(DNA_DROP_UPGRADE_PATH);
            return;
        }

        setConfirmOpen(false);
        setIsImporting(true);
        try {
            const data = snapshotTrack || share.data;
            if (!snapshotTrack && share.type === 'album') await mergeData([data as Album], []);
            else await mergeData([], [data as Track]);

            await recordShareImport(shareId);

            toast({
                title: 'DNA Imported',
                description: `"${(snapshotTrack || project).title}" was merged into your vault. You can edit it anytime.`,
            });

            if (snapshotTrack) router.push(editHref ?? `/albums/unassigned/tracks/${snapshotTrack.id}`);
            else if (isAlbum) router.push(`/albums/${(data as Album).id}`);
            else router.push(`/albums/unassigned/tracks/${(data as Track).id}`);
        } catch (e) {
            console.error('Import failed', e);
            toast({
                variant: 'destructive',
                title: 'Import failed',
                description: 'Could not merge this Lyrics DNA Drop. Try again in a moment.',
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
                title: 'Lyrics DNA Drop offline',
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
            const message = e instanceof Error ? e.message : 'Could not take this Lyrics DNA Drop offline.';
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
            await manageRelease({
              kind: isAlbum ? 'album' : 'track',
              action: 'unpublish',
              shareId,
              ...(albumId ? { albumId, ...(isAlbum ? {} : { trackId: project.id }) } : {}),
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

    if (loading || dnaAccessRedirecting || authBooting || (user && !authReady)) {
        return (
          <StudioLoader
            size="lg"
            fullscreen
            message={dnaAccessRedirecting ? 'Opening Studio Pro…' : 'Opening this drop…'}
          />
        );
    }

    if (!share || !project) {
        return (
          <div className="flex min-h-screen items-center justify-center px-6">
            <Card className="max-w-md border-primary/25 bg-primary/5">
                <CardContent className="space-y-4 p-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        Lyrics DNA Drop
                    </p>
                    <p className="text-sm text-muted-foreground font-code leading-relaxed">
                        Sign in, then choose Studio Pro to open lyrics, Creative DNA, and save strands to your vault.
                    </p>
                    <Button
                        className="font-bold uppercase tracking-widest text-[10px]"
                        onClick={() =>
                            router.replace(user ? DNA_DROP_UPGRADE_PATH : buildDnaDropLoginPath(shareId, 'view'))
                        }
                    >
                        {user ? 'Choose a plan' : 'Sign in'}
                    </Button>
                </CardContent>
            </Card>
          </div>
        );
    }

    const importLabel = !user
        ? hasFirstDropAudio
          ? 'Import lyrics & DNA'
          : 'Sign in to view DNA'
        : !viewerIsPro
          ? 'Upgrade to view DNA'
        : isOwnShare && alreadyInVault
          ? ownerEditLabel
          : 'Import Setup';

    const guestImportHint =
      'Copies lyrics, structure, and Creative DNA into your vault — not the song. Use Pay what you want below to buy the stream.';

    const importSetupTooltip = !user
      ? guestImportHint
      : !viewerIsPro
        ? 'Studio Pro unlocks opening and importing Lyrics DNA Drops into your vault.'
        : isOwnShare && alreadyInVault
          ? isAlbum
            ? 'This album is already in your vault — open it to edit sheets and DNA.'
            : 'This track is already in your vault — open the sheet to keep writing.'
          : 'Import Setup copies lyrics, structure, Creative DNA, vibe, and strains into your vault. Released audio stays separate — use Listen / buy to stream or purchase.';

    const OwnerEditIcon = snapshotTrack || !isAlbum ? Pencil : Disc3;

    return (
        <div className="min-h-screen relative selection:bg-primary/30 overflow-x-hidden font-code">
            <DnaDropAtmosphere />

            <header className="sticky top-0 z-[100] min-h-14 border-b border-cyan-400/20 bg-background/70 backdrop-blur-md px-3 sm:px-6 py-2 relative flex items-center justify-between gap-2">
                <div className="relative z-10 flex shrink-0 items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLeavePage}
                        className="h-8 sm:h-9 shrink-0 px-2 font-bold text-muted-foreground hover:text-foreground"
                        aria-label={snapshotTrack ? 'Back to snapshot sequence' : 'Go back'}
                        title={snapshotTrack ? 'Back to snapshot sequence' : 'Go back'}
                    >
                        <ChevronLeft className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline text-[10px] uppercase tracking-widest">
                          {snapshotTrack ? 'Sequence' : 'Back'}
                        </span>
                    </Button>
                </div>
                <Link
                    href={homeHref}
                    className="absolute left-1/2 top-1/2 z-[5] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 sm:gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={user ? 'Go to vault' : 'Go to AKAsheet'}
                >
                    <div className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
                        <Image src="/Logo.png" alt="AKAsheet" width={36} height={36} className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 hidden sm:block">
                        <h1 className="truncate font-headline text-sm sm:text-lg font-bold leading-none tracking-tight text-foreground">
                            AKAsheet
                        </h1>
                        <p className="text-[7px] sm:text-[8px] text-muted-foreground uppercase tracking-[0.18em] mt-0.5 truncate">
                            {snapshotTrack
                              ? `Lyric DNA strand · ${albumPayload?.title || 'album'}`
                              : viewingAlbumHub
                                ? hasFirstDropAudio
                                  ? 'Album release hub'
                                  : 'Album · Lyrics DNA Drop'
                                : hasFirstDropAudio
                                  ? 'Song · 30s preview · buy to stream'
                                  : 'Lyrics DNA Drop'}
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
                    {canManageShare && isReleaseShare ? (
                        <Button
                            onClick={() => openFirstDropLathe({
                              shareId,
                              mode: isAlbum ? 'album' : 'song',
                            })}
                            size="sm"
                            variant="outline"
                            className="h-8 sm:h-9 px-2 sm:px-3 font-bold"
                        >
                            <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Update</span>
                        </Button>
                    ) : null}
                    {canManageShare && (
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
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[18rem] text-[11px] leading-relaxed">
                            {importSetupTooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                </div>
            </header>

            {(!user || !canViewDnaLyrics) && hasFirstDropAudio && (
                <div className="container max-w-7xl mx-auto px-4 pt-4 relative z-10">
                    <Card className={hasFirstDropAudio ? 'border-fuchsia-500/40 bg-fuchsia-500/10' : 'border-primary/25 bg-primary/5'}>
                        <CardContent className="p-4 text-[11px] font-code text-muted-foreground leading-relaxed">
                            {hasFirstDropAudio ? (
                              <>
                                Hit play for a 30-second preview. Buy once to stream the full {isAlbum ? 'album' : 'song'} in AKAsheet — not Spotify.
                                {' '}
                                {!user ? (
                                  <button
                                    type="button"
                                    className="text-fuchsia-300 underline underline-offset-2 font-bold"
                                    onClick={() => router.push(buildDropBuyLoginPath(shareId, {}, isAlbum ? 'share' : 'song'))}
                                  >
                                    Sign up to unlock
                                  </button>
                                ) : (
                                  <span>Listen / buy stays Free.</span>
                                )}
                                {` Lyrics DNA Drops — extract, view, and import — are Studio Pro only. `}
                                <button
                                  type="button"
                                  className="text-primary underline underline-offset-2 font-bold"
                                  onClick={() => router.push(resolveDnaDropImportPath(shareId, {
                                    signedIn: Boolean(user),
                                    isPro: viewerIsPro,
                                  }))}
                                >
                                  {user ? 'Upgrade to view & import lyrics' : 'Sign in to check your tier or create an account'}
                                </button>
                                .
                              </>
                            ) : (
                              <>
                                Lyrics DNA Drops — extract, view, and import — are Studio Pro only. Sign in to check your tier or upgrade, or create an account.
                                {' '}
                                <button
                                  type="button"
                                  className="text-primary underline underline-offset-2 font-bold"
                                  onClick={() => router.push(resolveDnaDropImportPath(shareId, {
                                    signedIn: Boolean(user),
                                    isPro: viewerIsPro,
                                  }))}
                                >
                                  {user ? 'Open Studio Tier' : 'Sign in or create an account'}
                                </button>
                                .
                              </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <main className="container max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {viewingAlbumHub && hubVisibility ? (
                  <div className="lg:col-span-12 -mt-2 mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/25 bg-black/35 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em]">
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1',
                        hubVisibility.releaseLive
                          ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                          : 'border-white/15 text-muted-foreground'
                      )}
                    >
                      Music release {hubVisibility.releaseLive ? 'live' : 'not shared'}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1',
                        hubVisibility.dnaLive || albumLyricDnaStrandCount > 0
                          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
                          : canViewDnaLyrics
                            ? 'border-white/15 text-muted-foreground'
                            : 'border-amber-400/35 bg-amber-500/10 text-amber-100'
                      )}
                    >
                      Lyrics DNA:{' '}
                      {albumLyricDnaStrandCount > 0
                        ? `${albumLyricDnaStrandCount} track${albumLyricDnaStrandCount === 1 ? '' : 's'} live`
                        : hubVisibility.dnaLive
                          ? 'live'
                          : canViewDnaLyrics
                            ? 'not shared'
                            : 'Pro only'}
                    </span>
                  </div>
                ) : null}
                <div className="lg:col-span-4 space-y-6">
                    {snapshotTrack && isAlbum && albumPayload ? (
                      <nav
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-400/25 bg-black/35 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                        aria-label="Album strand navigation"
                      >
                        <Link href={dnaDropSharePath(shareId)} className="text-cyan-300 hover:text-cyan-100">
                          Album · {albumPayload.title || 'Sequence'}
                        </Link>
                        <span className="text-muted-foreground">/</span>
                        <span className="truncate text-foreground">{trackProject?.title || 'Strand'}</span>
                        {normalizeDropAudio(trackProject?.dropAudio) ? (
                          <Link
                            href={pressedSongHref(shareId, { trackId: trackProject!.id })}
                            className="ml-auto text-fuchsia-300 hover:text-fuchsia-100"
                          >
                            Open song page →
                          </Link>
                        ) : null}
                      </nav>
                    ) : null}
                    <Suspense fallback={null}>
                      {viewingAlbumHub && (hasFirstDropAudio || hubVisibility?.releaseLive) ? (
                        <AlbumReleasePlaylist
                          album={project as DnaDropAlbumPayload}
                          shareId={albumHubShareId}
                          ownerId={share.ownerId}
                          ownerName={share.ownerName}
                          houseRelease={share.houseRelease === true}
                        />
                      ) : trackProject && normalizeDropAudio(trackProject.dropAudio) ? (
                        <DropListenPanel
                          shareId={shareId}
                          source="share"
                          title={trackProject.title || 'Untitled'}
                          artistName={share.ownerName}
                          ownerId={share.ownerId}
                          price={normalizeDropPrice(trackProject.dropPrice)}
                          hasAudio
                          houseRelease={share.houseRelease === true}
                          checkoutDestination="song"
                          trackId={snapshotTrack ? trackProject.id : undefined}
                          detailsHref={
                            snapshotTrack
                              ? pressedSongHref(shareId, { trackId: trackProject.id })
                              : undefined
                          }
                        />
                      ) : null}
                    </Suspense>
                    {hasFirstDropAudio || snapshotTrack ? (
                    <DropSocialPanel
                      shareId={shareId}
                      title={(snapshotTrack || project).title || 'Untitled'}
                      ownerId={share.ownerId}
                      playCount={share.playCount}
                      previewCount={share.previewCount}
                      purchaseCount={share.purchaseCount}
                      firstBuyerName={share.firstBuyerName}
                      hasAudio={
                        viewingAlbumHub
                          ? hasFirstDropAudio
                          : Boolean(
                              snapshotTrack
                                ? normalizeDropAudio(snapshotTrack.dropAudio)
                                : normalizeDropAudio((project as DnaDropTrackPayload).dropAudio)
                            )
                      }
                      isAlbum={viewingAlbumHub}
                      trackId={snapshotTrack?.id}
                      ownerName={share.ownerName}
                      albumTitle={snapshotTrack ? albumPayload?.title : trackProject?.sharedAlbumContext?.title || albumPayload?.title}
                      albumShareId={viewingAlbumHub ? shareId : (trackProject?.sharedAlbumContext?.shareId || (snapshotTrack ? shareId : undefined))}
                    />
                    ) : null}
                    <Card className="border-2 border-cyan-400/20 overflow-hidden bg-card/50 backdrop-blur-md">
                        <div className={cn(
                          'relative w-full border-b border-cyan-400/15 bg-neutral-950',
                          viewingAlbumHub ? 'aspect-[4/5] max-h-[28rem]' : 'aspect-square'
                        )}>
                            <ShareCoverImage
                                src={coverArtSrc}
                                alt={(snapshotTrack || project).title || 'Project Snapshot'}
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-cyan-950/20 pointer-events-none" />
                            <div className="absolute top-3 left-3">
                              <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-cyan-400/40 bg-black/50 text-cyan-200">
                                {viewingAlbumHub ? 'Lyric sequence' : 'Song strand'}
                              </Badge>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 pointer-events-none">
                                <h2 className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-white uppercase tracking-tighter leading-none break-words">
                                  {(snapshotTrack || project).title}
                                </h2>
                                <p className="text-[10px] text-cyan-200 font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
                                    <Dna className="h-3 w-3 shrink-0" /> by {share.ownerName}
                                </p>
                            </div>
                        </div>
                        <CardContent className="p-4 sm:p-6 space-y-6">
                            {canViewDnaLyrics && viewingAlbumHub ? (
                                (project as DnaDropAlbumPayload)?.theme ? (
                                    <p className="text-sm italic text-muted-foreground leading-relaxed">
                                        &ldquo;{(project as DnaDropAlbumPayload).theme}&rdquo;
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground font-code leading-relaxed">
                                        Open a strand on the right to read that song’s Lyrics DNA Drop.
                                    </p>
                                )
                            ) : canViewDnaLyrics && trackProject ? (
                            <>
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                                    <Globe className="h-3 w-3" /> Track Theme
                                </h4>
                                <p className="text-sm italic text-muted-foreground leading-relaxed">
                                    &ldquo;{trackProject.vibe?.feeling?.join(', ')}&rdquo;
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
                            {trackProject?.vibe?.enabled !== false && (trackProject?.vibe?.genre || trackProject?.vibe?.instrumentation) && (
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
                            </>
                            ) : (
                                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                        Lyrics DNA Drop · Studio Pro
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Lyrics, Creative DNA, and import are Pro only. Listen / buy on this page stays Free.
                                    </p>
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
                                        Your Lyrics DNA Drop
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {isAlbum && !snapshotTrack
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

                    {canViewDnaLyrics && Boolean(trackProject) && (
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
                    )}

                    {canViewDnaLyrics && trackProject?.sharedStyle?.analysis && (
                        <Card className="border-fuchsia-500/30 bg-fuchsia-500/5">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-headline uppercase text-fuchsia-400">Style DNA</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-[11px] italic text-muted-foreground leading-relaxed">
                                &ldquo;{trackProject.sharedStyle.analysis}&rdquo;
                            </CardContent>
                        </Card>
                    )}

                    {canViewDnaLyrics && trackProject?.specialInstructions?.trim() && (
                        <Card className="border-blue-500/30 bg-blue-500/5">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-headline uppercase text-blue-400">Special Instructions</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground leading-relaxed">
                                {trackProject.specialInstructions}
                            </CardContent>
                        </Card>
                    )}

                    {canViewDnaLyrics && trackProject?.guardrails?.enabled && (
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
                    {viewingAlbumHub ? (
                        <DnaDropAlbumHub
                            album={project as DnaDropAlbumPayload}
                            shareId={shareId}
                            hubShareId={albumHubShareId}
                            ownerId={share.ownerId}
                            ownerName={share.ownerName}
                            houseRelease={share.houseRelease === true}
                            canViewDna={canViewDnaLyrics}
                            signedIn={Boolean(user)}
                        />
                    ) : canViewDnaLyrics && trackProject ? (
                    <DnaDropLyricSheet
                        title={trackProject.title || 'Untitled'}
                        sections={trackProject.sections}
                        rhymeGroups={rhymeGroups}
                        updatedLabel={`Updated ${formattedShareDate}`}
                        albumShareId={snapshotTrack ? shareId : trackProject.sharedAlbumContext?.shareId}
                        albumTitle={snapshotTrack ? albumPayload?.title : trackProject.sharedAlbumContext?.title}
                    />
                    ) : (
                    <Card className="border-2 border-cyan-400/25 bg-cyan-500/5 min-h-[40vh] flex items-center justify-center">
                        <CardContent className="p-8 max-w-md text-center space-y-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                                Lyrics DNA Drops · Studio Pro
                            </p>
                            <p className="text-sm text-muted-foreground font-code leading-relaxed">
                                Extract, view, and import Lyrics DNA Drops are Pro only. Sign in to check your tier or upgrade.
                            </p>
                            <Button
                              className="font-bold uppercase tracking-widest text-[10px]"
                              onClick={() => router.push(resolveDnaDropImportPath(shareId, {
                                signedIn: Boolean(user),
                                isPro: viewerIsPro,
                              }))}
                            >
                              {user ? 'Upgrade to view lyrics' : 'Sign in to check tier'}
                            </Button>
                        </CardContent>
                    </Card>
                    )}
                </div>
            </main>

            <footer className="py-12 border-t mt-12 bg-muted/5 flex flex-col items-center gap-6 relative z-10">
                <div className="h-10 w-10">
                    <Image src="/Logo.png" alt="AKAsheet" width={40} height={40} className="h-full w-full object-contain" />
                </div>
                <p className="text-[11px] text-muted-foreground font-code text-center uppercase tracking-[0.4em]">
                    Built and shared via AKAsheet
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
                                    This is your own Lyrics DNA Drop. Import updates the copy already in your vault (same project ID).
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
                          {isReleaseShare ? `Take this ${isAlbum ? 'album' : 'song'} release offline?` : 'Take this Lyrics DNA Drop offline?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-code leading-relaxed">
                            {isReleaseShare ? 'New discovery and checkout will stop; existing buyers keep access.' : 'The Lyrics DNA Drop snapshot will go offline immediately. Your Vault copy stays private. Signed-in Studio Pro members will no longer open this lyric page.'}
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

export default function SharedProjectPage() {
    return (
        <Suspense fallback={<StudioLoader size="lg" fullscreen message="Opening this drop…" />}>
            <SharedProjectPageInner />
        </Suspense>
    );
}
