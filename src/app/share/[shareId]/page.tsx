'use client';

import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/client/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { DataContext } from '@/context/data-context';
import type { ProjectShare, Album, Track } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Globe, 
    Music, 
    Compass, 
    Target, 
    Palette, 
    Sparkles, 
    ArrowRight, 
    MonitorPlay, 
    Import, 
    CheckCircle2,
    Eye,
    Zap,
    ChevronLeft,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HighlightedText } from '@/components/highlighted-text';
import { StudioLoader } from '@/components/studio-loader';
import { format } from 'date-fns';
import Image from 'next/image';

export default function SharedProjectPage() {
    const params = useParams();
    const shareId = params.shareId as string;
    const router = useRouter();
    const { mergeData, isCloudSyncActive } = useContext(DataContext);
    
    const [share, setShare] = useState<ProjectShare | null>(null);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        const fetchShare = async () => {
            const docRef = doc(db, 'shares', shareId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data() as ProjectShare;
                setShare(data);
                // Background update for view count
                updateDoc(docRef, { views: increment(1) });
            }
            setLoading(false);
        };
        fetchShare();
    }, [shareId]);

    const handleImport = async () => {
        if (!share) return;
        if (!isCloudSyncActive) {
            router.push('/pricing');
            return;
        }

        setIsImporting(true);
        try {
            const data = share.data;
            if (share.type === 'album') await mergeData([data as Album], []);
            else await mergeData([], [data as Track]);
            
            await updateDoc(doc(db, 'shares', shareId), { imports: increment(1) });
            router.push('/');
        } catch (e) {
            console.error("Import failed", e);
        } finally {
            setIsImporting(false);
        }
    };

    const formattedShareDate = useMemo(() => {
        if (!share?.createdAt) return 'Recent';
        const date = new Date(share.createdAt);
        return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM d, yyyy');
    }, [share?.createdAt]);

    if (loading) return <div className="h-screen flex flex-col items-center justify-center"><StudioLoader size="lg" /><p className="mt-4 text-xs font-code uppercase animate-pulse">Accessing Studio Vault...</p></div>;

    if (!share) return (
        <div className="h-screen flex items-center justify-center p-4">
            <Card className="max-w-md text-center border-2">
                <CardHeader>
                    <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="font-headline text-3xl">VAULT CLOSED</CardTitle>
                    <CardDescription>This project share is no longer live or the link is invalid.</CardDescription>
                </CardHeader>
                <CardFooter><Button className="w-full" onClick={() => router.push('/')}>Return to Dashboard</Button></CardFooter>
            </Card>
        </div>
    );

    const project = share.data;
    const isAlbum = share.type === 'album';

    return (
        <div className="min-h-screen relative selection:bg-primary/30 overflow-x-hidden font-code">
            {/* Global Aesthetic Overlays */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
                <div className="h-full w-full bg-[repeating-linear-gradient(theme(colors.border),theme(colors.border)_1px,transparent_1px,transparent_24px)]"></div>
            </div>

            {/* Header: Platform Branding */}
            <header className="sticky top-0 z-[100] h-16 border-b bg-background/80 backdrop-blur-md px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-black rounded-lg w-10 h-10 p-1.5 border border-primary/20"><img src="/Logo.png" alt="Bar 4 Bar" className="w-full h-full object-contain" /></div>
                    <div>
                        <h1 className="text-xl font-headline font-bold text-foreground">BAR 4 BAR</h1>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] -mt-1">DNA Drop Snapshot</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-4 mr-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">{share.views.toLocaleString()}</span></div>
                        <div className="flex items-center gap-1.5"><Import className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">{share.imports.toLocaleString()}</span></div>
                    </div>
                    <Button onClick={handleImport} size="sm" className="h-9 px-4 font-bold shadow-lg" disabled={isImporting}>
                        {isImporting ? <StudioLoader size="sm" /> : <Import className="h-4 w-4 mr-2" />}
                        Import Setup
                    </Button>
                </div>
            </header>

            <main className="container max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                {/* Side: DNA & Architecture */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-2 overflow-hidden bg-card/80">
                        <div className="aspect-square relative w-full border-b">
                            <Image 
                                src={project.coverArtUrl || 'https://picsum.photos/seed/share/600/600'} 
                                alt={project.title || 'Project Snapshot'} 
                                fill 
                                className="object-cover" 
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                                <h2 className="text-4xl font-headline font-bold text-white uppercase tracking-tighter leading-none">{project.title}</h2>
                                <p className="text-[10px] text-primary font-bold uppercase mt-2 tracking-widest flex items-center gap-2">
                                    <Sparkles className="h-3 w-3" /> by {share.ownerName}
                                </p>
                            </div>
                        </div>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2"><Globe className="h-3 w-3" /> {isAlbum ? 'Album Concept' : 'Track Theme'}</h4>
                                <p className="text-sm italic text-muted-foreground leading-relaxed">"{isAlbum ? project.theme : project.vibe?.feeling.join(', ')}"</p>
                            </div>
                            {project.direction && (
                                <div className="space-y-4 border-t pt-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-600 flex items-center gap-2"><Compass className="h-3 w-3" /> Architecture (The 5 Questions)</h4>
                                    <div className="space-y-3">
                                        {Object.entries(project.direction).map(([key, value]) => {
                                            if (!value || typeof value !== 'string') return null;
                                            return (
                                                <div key={key} className="space-y-0.5">
                                                    <p className="text-[8px] font-bold uppercase text-muted-foreground/60">{key.replace('_', ' ')}</p>
                                                    <p className="text-[11px] font-bold text-foreground leading-snug">{value}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-sky-500/30 bg-sky-500/5">
                        <CardHeader className="p-4"><CardTitle className="text-xs font-headline uppercase text-sky-500 flex items-center gap-2"><Target className="h-4 w-4" /> Selected Motifs</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex flex-wrap gap-1.5">
                                {(isAlbum ? project.thingsToSay : project.intentRefs || []).map((intent: string) => (
                                    <Badge key={intent} variant="outline" className="text-[8px] uppercase border-sky-500/30 text-sky-600 bg-sky-500/5 py-1 px-2">{intent}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Center: The Lyrics Grid (Static Background Protocol) */}
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
                                <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-primary/20 text-primary">Live Transcription</Badge>
                                <div className="flex items-center gap-2 text-[9px] text-muted-foreground uppercase font-bold"><Clock className="h-3 w-3" /> {formattedShareDate}</div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 relative z-10">
                            {isAlbum ? (
                                <div className="p-12 space-y-12">
                                    {project.tracks?.map((track: Track, idx: number) => (
                                        <div key={track.id} className="space-y-6">
                                            <h4 className="text-3xl font-headline font-bold text-primary uppercase ml-[120px]">{idx + 1}. {track.title}</h4>
                                            <div className="space-y-8">
                                                {track.sections.map((sec) => (
                                                    <div key={sec.id} className="space-y-0">
                                                        <h5 className="text-sm font-bold text-sky-400 uppercase mb-2 ml-[120px]">[{sec.type}]</h5>
                                                        {sec.bars.map((bar) => (
                                                            <div key={bar.idx} className="flex items-start min-h-[32px] pl-[120px]">
                                                                <span className="absolute left-[50px] font-mono text-muted-foreground/10 text-lg leading-[32px] font-bold">{String(bar.idx).padStart(2, '0')}</span>
                                                                <p className="text-xl md:text-2xl font-code font-bold leading-[32px] tracking-tight text-foreground/90">{bar.text || '...'}</p>
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
                                    {project.sections.map((sec: any) => (
                                        <div key={sec.id} className="space-y-0">
                                            <h4 className="text-2xl font-headline font-bold text-sky-400 uppercase mb-4 ml-[120px]">{sec.type}</h4>
                                            {sec.bars.map((bar: any) => (
                                                <div key={bar.idx} className="flex items-start min-h-[32px] pl-[120px]">
                                                    <span className="absolute left-[50px] font-mono text-muted-foreground/10 text-lg leading-[32px] font-bold">{String(bar.idx).padStart(2, '0')}</span>
                                                    <p className="text-xl md:text-2xl font-code font-bold leading-[32px] tracking-tight text-foreground/90">{bar.text || '...'}</p>
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
                <div className="bg-black p-3 rounded-xl border"><img src="/Logo.png" alt="B4B" className="h-8 w-8" /></div>
                <p className="text-[11px] text-muted-foreground font-code text-center uppercase tracking-[0.4em]">Built and Share via Bar 4 Bar Studio</p>
                <Button variant="outline" size="sm" onClick={() => router.push('/')} className="h-10 px-8 font-bold uppercase tracking-widest text-[10px] rounded-full border-primary/20 text-primary">Initialize your own studio</Button>
            </footer>
        </div>
    );
}
