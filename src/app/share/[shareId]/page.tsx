'use client';

import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
} from 'lucide-react';
import { StudioLoader } from '@/components/studio-loader';
import { ShareCoverImage } from '@/components/share-cover-image';
import { format } from 'date-fns';
import {
  sharedTrackIntents,
  resolveSharedDirection,
  type DnaDropTrackPayload,
  type DnaDropAlbumPayload,
} from '@/lib/dna-drop';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { recordShareImport } from '@/lib/share-import-client';
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

export default function SharedProjectPage() {
    const params = useParams();
    const shareId = params.shareId as string;
    const router = useRouter();
    const { toast } = useToast();
    const { user, authReady } = useAuth();
    const { mergeData, isCloudSyncActive, getAlbumById, getTrackById } = useContext(DataContext);

    const [share, setShare] = useState<ProjectShare | null>(null);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchShare = async () => {
            const docRef = doc(db, 'shares', shareId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data() as ProjectShare;
                setShare(data);
                updateDoc(docRef, { views: increment(1) }).catch(() => undefined);
            }
            setLoading(false);
        };
        void fetchShare();
    }, [shareId]);

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
    const isOwnShare = Boolean(user && share && user.id === share.ownerId);

    const alreadyInVault = useMemo(() => {
        if (!project || !isOwnShare) return false;
        if (isAlbum) return Boolean(getAlbumById(project.id));
        return Boolean(getTrackById('unassigned', project.id).track);
    }, [project, isOwnShare, isAlbum, getAlbumById, getTrackById]);

    const openInVault = useCallback(() => {
        if (!project) return;
        if (isAlbum) router.push(`/albums/${project.id}`);
        else router.push(`/albums/unassigned/tracks/${project.id}`);
    }, [project, isAlbum, router]);

    const handleImportClick = () => {
        if (!authReady) return;

        if (!user) {
            router.push(`/login?next=${encodeURIComponent(`/share/${shareId}`)}&intent=dna-import`);
            return;
        }

        if (!isCloudSyncActive) {
            router.push(`/pricing?next=${encodeURIComponent(`/share/${shareId}`)}`);
            return;
        }

        if (isOwnShare && alreadyInVault) {
            toast({
                title: 'Already in your vault',
                description: 'This DNA Drop is yours — opening the project in your studio.',
            });
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

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center">
                <StudioLoader size="lg" />
                <p className="mt-4 text-xs font-code uppercase animate-pulse">Accessing Studio Vault...</p>
            </div>
        );
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
        ? 'Sign in to Import'
        : isOwnShare && alreadyInVault
          ? 'Open in My Vault'
          : 'Import Setup';

    return (
        <div className="min-h-screen relative selection:bg-primary/30 overflow-x-hidden font-code">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                <div className="h-full w-full bg-[repeating-linear-gradient(theme(colors.border),theme(colors.border)_1px,transparent_1px,transparent_24px)]" />
            </div>

            <header className="sticky top-0 z-[100] h-16 border-b bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-black rounded-lg w-10 h-10 p-1.5 border border-primary/20">
                        <img src="/Logo.png" alt="Bar 4 Bar" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-headline font-bold text-foreground">BAR 4 BAR</h1>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] -mt-1">DNA Drop Snapshot</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-4 mr-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">{share.views.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Import className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold">{share.imports.toLocaleString()}</span>
                        </div>
                    </div>
                    <Button onClick={handleImportClick} size="sm" className="h-9 px-4 font-bold shadow-lg" disabled={isImporting}>
                        {isImporting ? (
                            <StudioLoader size="sm" />
                        ) : !user ? (
                            <LogIn className="h-4 w-4 mr-2" />
                        ) : (
                            <Import className="h-4 w-4 mr-2" />
                        )}
                        {importLabel}
                    </Button>
                </div>
            </header>

            {!user && (
                <div className="container max-w-7xl mx-auto px-4 pt-4 relative z-10">
                    <Card className="border-primary/25 bg-primary/5">
                        <CardContent className="p-4 text-[11px] font-code text-muted-foreground leading-relaxed">
                            Import Setup copies this snapshot — lyrics, structure, Creative DNA, intents, vibe, guardrails, special instructions, and Style DNA when shared — into your Bar 4 Bar vault.
                            {' '}
                            <button type="button" className="text-primary underline underline-offset-2 font-bold" onClick={() => router.push(`/login?next=${encodeURIComponent(`/share/${shareId}`)}&intent=dna-import`)}>
                                Sign in or create a free account
                            </button>
                            {' '}to import. Studio Pro is required to import DNA Drops from other artists.
                        </CardContent>
                    </Card>
                </div>
            )}

            <main className="container max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-2 overflow-hidden bg-card/80">
                        <div className="aspect-square relative w-full border-b bg-neutral-950">
                            <ShareCoverImage
                                src={project.coverArtUrl}
                                alt={project.title || 'Project Snapshot'}
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                            <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
                                <h2 className="text-4xl font-headline font-bold text-white uppercase tracking-tighter leading-none">{project.title}</h2>
                                <p className="text-[10px] text-primary font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
                                    <Sparkles className="h-3 w-3" /> by {share.ownerName}
                                </p>
                            </div>
                        </div>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                                    <Globe className="h-3 w-3" /> {isAlbum ? 'Album Concept' : 'Track Theme'}
                                </h4>
                                <p className="text-sm italic text-muted-foreground leading-relaxed">
                                    &ldquo;{isAlbum ? project.theme : project.vibe?.feeling?.join(', ')}&rdquo;
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
                        </CardContent>
                    </Card>

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
                        <Card className="border-rose-500/30 bg-rose-500/5">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-headline uppercase text-rose-400">Guardrails</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-2 text-[10px] text-muted-foreground">
                                {trackProject.guardrails.forbiddenWords && (
                                    <p><span className="font-bold uppercase text-rose-500/80">Forbidden:</span> {trackProject.guardrails.forbiddenWords}</p>
                                )}
                                {trackProject.guardrails.mustIncludeWords && (
                                    <p><span className="font-bold uppercase text-emerald-500/80">Must include:</span> {trackProject.guardrails.mustIncludeWords.join(', ')}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <Card className="border-2 shadow-2xl relative overflow-hidden bg-notebook min-h-[80vh]">
                        <style>{`
                            .bg-notebook {
                                background-image:
                                    linear-gradient(90deg, transparent 100px, #ff000022 100px, #ff000022 101px, transparent 101px),
                                    repeating-linear-gradient(transparent, transparent 31px, #ffffff05 31px, #ffffff05 32px);
                                background-attachment: fixed;
                            }
                        `}</style>
                        <CardHeader className="bg-card border-b relative z-10 p-12 py-8">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-primary/20 text-primary">
                                    Live Snapshot
                                </Badge>
                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase font-bold">
                                    <Clock className="h-3 w-3" /> Updated {formattedShareDate}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 relative z-10">
                            {isAlbum ? (
                                <div className="p-12 space-y-12">
                                    {project.tracks?.map((track: Track, idx: number) => (
                                        <div key={track.id} className="space-y-6">
                                            <h4 className="text-3xl font-headline font-bold text-primary uppercase ml-[120px]">
                                                {idx + 1}. {track.title}
                                            </h4>
                                            <div className="space-y-8">
                                                {track.sections.map((sec) => (
                                                    <div key={sec.id} className="space-y-0">
                                                        <h5 className="text-sm font-bold text-sky-400 uppercase mb-2 ml-[120px]">[{sec.type}]</h5>
                                                        {sec.bars.map((bar) => (
                                                            <div key={bar.idx} className="flex items-start min-h-[32px] pl-[120px] relative">
                                                                <span className="absolute left-[50px] font-mono text-muted-foreground/10 text-lg leading-[32px] font-bold">
                                                                    {String(bar.idx).padStart(2, '0')}
                                                                </span>
                                                                <p className="text-xl md:text-2xl font-code font-bold leading-[32px] tracking-tight text-foreground/90">
                                                                    {bar.text || '...'}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 space-y-12">
                                    {project.sections.map((sec: Track['sections'][number]) => (
                                        <div key={sec.id} className="space-y-0">
                                            <h4 className="text-2xl font-headline font-bold text-sky-400 uppercase mb-4 ml-[120px]">{sec.type}</h4>
                                            {sec.bars.map((bar) => (
                                                <div key={bar.idx} className="flex items-start min-h-[32px] pl-[120px] relative">
                                                    <span className="absolute left-[50px] font-mono text-muted-foreground/10 text-lg leading-[32px] font-bold">
                                                        {String(bar.idx).padStart(2, '0')}
                                                    </span>
                                                    <p className="text-xl md:text-2xl font-code font-bold leading-[32px] tracking-tight text-foreground/90">
                                                        {bar.text || '...'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <footer className="py-12 border-t mt-12 bg-muted/5 flex flex-col items-center gap-6 relative z-10">
                <div className="bg-black p-3 rounded-xl border">
                    <img src="/Logo.png" alt="B4B" className="h-8 w-8" />
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
        </div>
    );
}
