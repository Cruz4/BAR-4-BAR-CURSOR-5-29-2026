'use client';

import React, { useState, useEffect, useContext, useTransition, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { DataContext } from '@/context/data-context';
import { useAuth } from '@/hooks/use-auth';
import { useUsage } from '@/context/usage-context';
import { useUIState } from '@/hooks/use-ui-state';
import { useToast } from '@/hooks/use-toast';
import { 
    WizardState, 
    WizardAnalysis, 
    WizardDirection, 
    WizardGeneratedVariant,
    Track
} from '@/lib/types';
import { 
    suggestRelayDirections, 
    generateRelayDraft 
} from '@/ai/flows/writers-relay';
import { withAiAuth } from '@/lib/ai-client';
import { useInkCosts } from '@/hooks/use-ink-costs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { 
    Sparkles, 
    BrainCircuit, 
    Target, 
    Wand2, 
    ArrowRight, 
    CheckCircle2, 
    FileText, 
    AlertTriangle, 
    ChevronLeft, 
    ChevronRight, 
    RefreshCw,
    ShieldCheck,
    Save,
    FileDown,
    Activity,
    Zap,
    X,
    MessageSquareQuote,
    NotebookPen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { rebalanceRemixWeights, formatRemixDirectionsWithWeights } from '@/lib/dna-strands';
import {
  canUserAddTrack,
  countUserTracks,
  FreeTrackLimitError,
  FREE_TRACK_LIMIT_TOAST,
} from '@/lib/subscription';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { trackUpgradeClick } from '@/lib/conversion-analytics';
import { Slider } from '@/components/ui/slider';
import { StudioLoader } from '@/components/studio-loader';

// --- Wizard Components ---

function RelayWizardContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const { addTrack, getAlbumById, albums } = useContext(DataContext);
    const { deductInk, refundInk, addUsageLog } = useUsage();
    const { getCost, buttonLabel, tooltip, getEffectiveCost } = useInkCosts();
    const relayDraftBase = 20 * getCost('generateRelayDraft');
    const relayDraftCharged = getEffectiveCost('generateRelayDraft', relayDraftBase);
    const { setGenerating } = useUIState();

    const albumId = params.albumId as string;
    const album = getAlbumById(albumId);
    const initialTitle = searchParams.get('title') || 'Untitled Relay';

    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [wizardState, setWizardState] = useState<WizardState>({
        lyrics: '',
        analysis: null,
        directions: null,
        selectedDirections: [],
        generatedVariant: null,
        excludedWords: '',
    });
    const [permissionChecked, setPermissionChecked] = useState(false);

    const toggleRemixDirection = (dir: WizardDirection) => {
        setWizardState((prev) => {
            const active = prev.selectedDirections.some((d) => d.name === dir.name);
            const next = active
                ? prev.selectedDirections.filter((d) => d.name !== dir.name)
                : [...prev.selectedDirections, { ...dir, weight: 50 }];
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

    // Step 1: Analyze
    const handleAnalyze = async () => {
        const cost = getEffectiveCost('analyzeRelayAssets');
        if (!deductInk(cost, 'analyzeRelayAssets')) return;

        setIsProcessing(true);
        setGenerating(true, 'Analyzing DNA Patterns...');
        try {
            const result = await suggestRelayDirections(await withAiAuth({ 
                lyrics: wizardState.lyrics,
                userName: user?.displayName
            }));
            setWizardState(prev => ({ 
                ...prev, 
                analysis: result.analysis, 
                directions: result.directions 
            }));
            addUsageLog({ flowName: 'analyzeRelayAssets', inkCost: getEffectiveCost('analyzeRelayAssets'), status: 'success' });
            setStep(2);
        } catch (e) {
            refundInk(cost);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: (e as Error).message });
        } finally {
            setIsProcessing(false);
            setGenerating(false);
        }
    };

    // Step 3: Generate
    const handleGenerate = async () => {
        if (wizardState.selectedDirections.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Required', description: 'Please choose at least one creative direction.' });
            return;
        }

        const cost = relayDraftBase;
        if (!deductInk(cost, 'generateRelayDraft')) return;

        setIsProcessing(true);
        setGenerating(true, 'Synthesizing Original Content...');
        try {
            const directionStr = formatRemixDirectionsWithWeights(
                wizardState.selectedDirections
            );
            const result = await generateRelayDraft(await withAiAuth({
                analysis: JSON.stringify(wizardState.analysis),
                direction: directionStr,
                distanceFromSource: 'balanced',
                delivery: 'dynamic',
                cleanliness: 'standard',
                forbiddenWords: wizardState.excludedWords
                    .split(',')
                    .map((w) => w.trim())
                    .filter(Boolean),
                userName: user?.displayName
            }));
            setWizardState(prev => ({ ...prev, generatedVariant: result }));
            addUsageLog({ flowName: 'generateRelayDraft', inkCost: relayDraftCharged, status: 'success' });
            setStep(4);
        } catch (e) {
            refundInk(cost);
            toast({ variant: 'destructive', title: 'Generation Failed', description: (e as Error).message });
        } finally {
            setIsProcessing(false);
            setGenerating(false);
        }
    };

    const handleSave = () => {
        if (!wizardState.generatedVariant) return;
        
        const g = wizardState.generatedVariant;
        const sections = [
            { name: 'Verse 1', text: g.verse1 },
            { name: 'Hook', text: g.hook },
            { name: 'Verse 2', text: g.verse2 },
            { name: 'Bridge', text: g.bridge },
            { name: 'Outro', text: g.outro }
        ].filter(s => s.text).map((s, i) => ({
            id: `relay-${Date.now()}-${i}`,
            type: s.name.toLowerCase().includes('verse') ? 'verse' : s.name.toLowerCase() as any,
            bars: s.text!.split('\n').filter(l => l.trim()).map((l, j) => ({
                idx: j + 1,
                text: l.trim(),
                accepted: true,
                rhymeKey: '?',
                syllables: l.split(' ').length
            }))
        }));

        const newTrack: Omit<Track, 'id'> = {
            albumId,
            ownerId: user!.id,
            title: g.title || initialTitle,
            vibe: { genre: 'Lofi-Hop', tempoBPM: 90, feeling: ['new draft'] },
            intentRefs: [],
            sections,
            status: 'in_progress',
            createdAt: new Date().toISOString(),
            direction: { enabled: true, inheritFromAlbum: albumId !== 'unassigned' }
        };

        if (!canUserAddTrack(albums, user)) {
            const trackCount = countUserTracks(albums);
            trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, {
              limitType: 'track',
              count: trackCount,
            });
            trackUpgradeClick('slot_limit', { limitType: 'track', count: trackCount });
            toast(FREE_TRACK_LIMIT_TOAST);
            return;
        }
        try {
            const created = addTrack(albumId, newTrack);
            toast({ title: 'Workstation Saved', description: `"${newTrack.title}" added to your vault.` });
            router.push(`/albums/${albumId}/tracks/${created.id}`);
        } catch (e) {
            if (e instanceof FreeTrackLimitError) {
                const trackCount = countUserTracks(albums);
                trackStudioEvent(ANALYTICS_EVENTS.FREE_LIMIT_HIT, {
                  limitType: 'track',
                  count: trackCount,
                });
                trackUpgradeClick('slot_limit', { limitType: 'track', count: trackCount });
                toast(FREE_TRACK_LIMIT_TOAST);
                return;
            }
            throw e;
        }
    };

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4 font-code">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronLeft className="h-5 w-5" /></Button>
                    <div>
                        <h1 className="text-3xl font-headline font-bold text-primary uppercase">Relay Workstation</h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Multi-Step Neural Synthesis</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={cn(
                            "w-8 h-1.5 rounded-full transition-all duration-500",
                            step >= s ? "bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-muted"
                        )} />
                    ))}
                </div>
            </div>

            {/* STEP 1: INPUT */}
            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="bg-card border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-headline text-xl"><NotebookPen className="h-5 w-5" /> Load Lyrical Assets</CardTitle>
                            <CardDescription className="text-xs uppercase tracking-tight">Paste your raw ideas, lyrics, or motifs to begin analysis.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Textarea 
                                placeholder="Paste your lyrics or notes here..." 
                                className="min-h-[400px] text-sm bg-background/50 font-bold"
                                value={wizardState.lyrics}
                                onChange={(e) => setWizardState(prev => ({ ...prev, lyrics: e.target.value }))}
                            />
                            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <Checkbox id="clearance" checked={permissionChecked} onCheckedChange={(c) => setPermissionChecked(!!c)} />
                                <Label htmlFor="clearance" className="text-[10px] font-bold uppercase tracking-wider cursor-pointer">I have clearance to use these lyrical assets in this studio session.</Label>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                size="lg" 
                                className="w-full h-14 text-lg font-bold shadow-lg gap-3" 
                                disabled={!wizardState.lyrics.trim() || !permissionChecked || isProcessing}
                                onClick={handleAnalyze}
                                title={tooltip('analyzeRelayAssets')}
                            >
                                {isProcessing ? <StudioLoader size="sm" /> : <BrainCircuit className="h-5 w-5" />}
                                {buttonLabel('analyzeRelayAssets')}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* STEP 2: ANALYSIS */}
            {step === 2 && wizardState.analysis && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                            <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-primary">DNA Profile</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase"><span>Valence</span><span>{wizardState.analysis.emotionalTone.valence}%</span></div>
                                        <Progress value={wizardState.analysis.emotionalTone.valence} className="h-1.5" />
                                        <p className="text-[9px] text-muted-foreground italic uppercase">Positivity vs Negativity</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold uppercase"><span>Intensity</span><span>{wizardState.analysis.emotionalTone.intensity}%</span></div>
                                        <Progress value={wizardState.analysis.emotionalTone.intensity} className="h-1.5" />
                                        <p className="text-[9px] text-muted-foreground italic uppercase">Emotional Weight</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div><Label className="text-[9px] font-bold uppercase text-muted-foreground">Primary Emotion</Label><p className="text-sm font-bold text-primary uppercase">{wizardState.analysis.emotionalTone.primaryEmotion}</p></div>
                                    <div><Label className="text-[9px] font-bold uppercase text-muted-foreground">Secondary</Label><p className="text-sm font-bold text-primary uppercase">{wizardState.analysis.emotionalTone.secondaryEmotion}</p></div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50">
                            <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Motifs</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {wizardState.analysis.motifs.map(m => <Badge key={m} variant="outline" className="text-[9px] border-primary/30 uppercase">{m}</Badge>)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-muted/10 border-border/50">
                            <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Voice & Perspective</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label className="text-[9px] font-bold uppercase text-muted-foreground">Style</Label><p className="text-xs leading-relaxed">{wizardState.analysis.voiceStyle}</p></div>
                                <div><Label className="text-[9px] font-bold uppercase text-muted-foreground">POV</Label><p className="text-xs leading-relaxed">{wizardState.analysis.pov} ({wizardState.analysis.tense})</p></div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/10 border-border/50">
                            <CardHeader><CardTitle className="text-sm uppercase tracking-widest">The "Magic"</CardTitle></CardHeader>
                            <CardContent>
                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Why It Works</Label>
                                <p className="text-xs leading-relaxed italic">"{wizardState.analysis.whatMakesItWork}"</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Button size="lg" className="w-full h-14 font-bold shadow-lg" onClick={() => setStep(3)}>
                        Proceed to Creative Directions <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* STEP 3: DIRECTIONS */}
            {step === 3 && wizardState.directions && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-headline font-bold text-primary uppercase">Choose Your Path</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em]">Select 1 or more creative forks for the synthesis.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {wizardState.directions.map((dir, idx) => {
                            const isSelected = wizardState.selectedDirections.some(d => d.name === dir.name);
                            return (
                                <Card 
                                    key={idx} 
                                    className={cn(
                                        "cursor-pointer transition-all duration-300 hover:scale-[1.02] border-2",
                                        isSelected ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]" : "border-border/50 bg-card hover:bg-muted/30"
                                    )}
                                    onClick={() => toggleRemixDirection(dir)}
                                >
                                    <CardHeader className="pb-2 flex-row items-center justify-between">
                                        <CardTitle className="text-xs font-bold uppercase tracking-widest truncate pr-4">{dir.name}</CardTitle>
                                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-[10px] leading-relaxed text-muted-foreground">{dir.description}</p>
                                        {isSelected && (
                                            <div onClick={(e) => e.stopPropagation()} className="space-y-1.5 pt-2 border-t border-primary/10">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] font-bold uppercase text-primary">Influence</span>
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
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="flex gap-4">
                        <Button variant="ghost" size="lg" className="px-8 font-bold" onClick={() => setStep(2)}>Back</Button>
                        <Button 
                            size="lg" 
                            className="flex-grow h-14 text-lg font-bold shadow-xl gap-3" 
                            disabled={wizardState.selectedDirections.length === 0 || isProcessing}
                            onClick={handleGenerate}
                            title={tooltip('generateRelayDraft', relayDraftBase)}
                        >
                            {isProcessing ? <StudioLoader size="sm" /> : <Zap className="h-5 w-5" />}
                            Synthesize Remix Draft ({relayDraftCharged} Ink)
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 4: OUTPUT */}
            {step === 4 && wizardState.generatedVariant && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-2 shadow-2xl overflow-hidden bg-notebook">
                            <style>{`
                                .bg-notebook {
                                    background-image: 
                                        linear-gradient(90deg, transparent 49px, #ff000033 49px, #ff000033 51px, transparent 51px),
                                        repeating-linear-gradient(transparent, transparent 31px, #ffffff08 31px, #ffffff08 32px);
                                }
                            `}</style>
                            <CardHeader className="bg-card border-b">
                                <Input 
                                    className="text-3xl font-headline font-bold bg-transparent border-0 p-0 h-auto focus-visible:ring-0 uppercase text-primary" 
                                    defaultValue={wizardState.generatedVariant.title} 
                                    onBlur={(e) => setWizardState(prev => ({ ...prev, generatedVariant: { ...prev.generatedVariant!, title: e.target.value } }))}
                                />
                                <CardDescription className="text-[10px] font-code uppercase tracking-widest text-muted-foreground">Generated from {wizardState.selectedDirections.length} directions</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[600px] p-12 pt-8">
                                    <div className="space-y-12">
                                        {[
                                            { label: 'VERSE 1', text: wizardState.generatedVariant.verse1 },
                                            { label: 'HOOK', text: wizardState.generatedVariant.hook },
                                            { label: 'VERSE 2', text: wizardState.generatedVariant.verse2 },
                                            { label: 'BRIDGE', text: wizardState.generatedVariant.bridge },
                                            { label: 'OUTRO', text: wizardState.generatedVariant.outro }
                                        ].filter(s => s.text).map((s, idx) => (
                                            <div key={idx} className="space-y-4">
                                                <h4 className="text-lg font-bold text-sky-400 uppercase border-b-2 border-sky-500/20 pb-1 w-fit">{s.label}</h4>
                                                <div className="pl-4 space-y-1">
                                                    {s.text!.split('\n').map((line, lIdx) => (
                                                        <p key={lIdx} className="text-lg font-bold font-code leading-[32px] tracking-tight">{line}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-rose-500/30 bg-rose-500/5">
                            <CardHeader><CardTitle className="text-sm font-headline text-rose-500 uppercase flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Neural Refinement</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Words to Exclude</Label>
                                    <Input 
                                        placeholder="love, fire, baby..." 
                                        className="bg-background/40 font-code text-xs"
                                        value={wizardState.excludedWords}
                                        onChange={(e) => setWizardState(prev => ({ ...prev, excludedWords: e.target.value }))}
                                    />
                                    <p className="text-[9px] text-muted-foreground leading-relaxed uppercase">The AI will surgically avoid these terms in the next variant.</p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-rose-500/20 hover:bg-rose-500/10 font-bold text-xs"
                                    onClick={handleGenerate}
                                    disabled={isProcessing}
                                    title={tooltip('generateRelayDraft', relayDraftBase)}
                                >
                                    {isProcessing ? <StudioLoader size="sm" /> : <Zap className="h-3 w-3 mr-2" />}
                                    Regenerate Draft ({relayDraftCharged} Ink)
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="space-y-3">
                            <Button size="lg" className="w-full h-14 font-bold shadow-xl bg-primary text-white gap-2" onClick={handleSave}>
                                <Save className="h-5 w-5" /> Save to Studio Vault
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setStep(3)}>
                                Change Directions
                            </Button>
                        </div>
                        
                        <div className="p-4 bg-muted/20 border border-dashed rounded-lg">
                            <p className="text-[9px] text-muted-foreground font-bold uppercase mb-2">Active Context Summary:</p>
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[7px] uppercase h-3.5">Remix Mode</Badge>
                                {album?.direction?.enabled && <Badge variant="secondary" className="text-[7px] uppercase h-3.5">Album DNA</Badge>}
                                {wizardState.selectedDirections.map(d => <Badge key={d.name} variant="outline" className="text-[7px] uppercase h-3.5">{d.name}</Badge>)}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RelayPage() {
    return (
        <Suspense fallback={<StudioLoader size="lg" fullscreen />}>
            <RelayWizardContent />
        </Suspense>
    );
}
