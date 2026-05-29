'use client';

/**
 * @fileOverview MASTER LOCKDOWN (5/14/2026) - Spatial Studio Manual.
 * 
 * - Mapping: Panel-based directions.
 * - Logic: ∞ Loop methodologies and Precision Tool deep-dives.
 * - UPDATE (5/24): Purged 48-Hour Trial references. Enabled Cloud Sync for all.
 */

import {
  PRO_YEARLY_PRICE,
  PRO_YEARLY_BILLED,
  VISITOR_FEATURES,
  PRO_UNLOCKS,
  PRO_YEARLY_EXCLUSIVES,
  getVisitorHeadlinePerks,
  getProMonthlyHeadlinePerks,
  getProYearlyHeadlinePerks,
} from '@/lib/studio-tiers';
import { TierPriceSummary } from '@/components/tier-price-summary';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BrainCircuit, 
  Mic, 
  Music, 
  Sparkles, 
  ShieldCheck, 
  ClipboardPaste, 
  BookOpen, 
  Target, 
  Zap, 
  CassetteTape, 
  Droplets,
  Volume2,
  Lock,
  Globe,
  Compass,
  History,
  Share2,
  ArrowRight,
  Palette,
  Shield,
  Wand2,
  NotebookText,
  Import,
  HelpCircle,
  MonitorPlay,
  FilePenLine,
  RefreshCw,
  Dna,
  LayoutTemplate,
  Fingerprint,
  Clapperboard,
  Waves,
  GitMerge,
  MousePointer2,
  Clock,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AI_COSTS } from '@/lib/costs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface HowToUseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChapterCard = ({ icon, title, children, colorClass }: { icon: React.ReactNode, title: string, children: React.ReactNode, colorClass?: string }) => (
    <Card className={cn("bg-card/50 border-border/50 shadow-sm overflow-hidden border-l-4", colorClass)}>
        <CardHeader className="pb-4 bg-muted/20 border-b border-border/10">
            <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl border", colorClass?.replace('border-l-4', 'bg-opacity-10'))}>{icon}</div>
                <CardTitle className={cn("font-headline text-2xl font-bold", colorClass?.replace('border-l-4', 'text'))}>{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="font-code text-sm text-muted-foreground pt-6 space-y-4 leading-relaxed">{children}</CardContent>
    </Card>
);

const FAQS = [
    {
      q: "What is the difference between Residency and Raw Ink?",
      a: "Residency Ink is provided by your membership and resets monthly—it does not rollover. Raw Ink is purchased separately, never expires, and is 'permanent fuel' for your workstation. The studio automatically uses expiring Residency Ink first."
    },
    {
      q: "Where is the DNA Vault?",
      a: "The DNA Vault is located in the Right Panel under the 'DNA Suite' section. Look for the folder icon. Here you can load saved profiles into any track on your album."
    },
    {
      q: "What is the Rhyme Pulse?",
      a: `The Rhyme Pulse is the round button in the Center Panel top bar. Clicking it initiates a deep phonetic scan of your current sheet for ${AI_COSTS.findRhymes} Ink. It is a one-time scan that updates your highlighting.`
    },
    {
      q: "How do I save a Vibe?",
      a: "In the Right Panel under 'Track Vibe', click the folder icon to open the Vibe Vault. You can save your current instrumentation and BPM here for reuse across the project."
    },
    {
      q: "What is the 3-Way System?",
      a: "It's our precision generation framework. You can trigger suggestions via: 1. In-Line Hover Buttons (on the sheet), 2. The Bar Workstation (footer), and 3. The AI Co-Writer (right panel)."
    }
];

export function HowToUseDialog({ open, onOpenChange }: HowToUseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-8 pb-4 border-b bg-background/80 backdrop-blur-md">
            <DialogTitle className="font-headline text-4xl flex items-center gap-3 font-bold">
                <BookOpen className="w-10 h-10 text-primary" /> Studio Master Manual
            </DialogTitle>
            <DialogDescription className="font-tagline uppercase tracking-[0.3em] text-[10px] text-muted-foreground">Bar4Bar_v3</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tiering" className="flex-grow flex flex-col min-h-0">
          <div className="px-8 border-b bg-muted/10">
            <TabsList className="bg-transparent h-12 gap-8 overflow-x-auto justify-start">
              <TabsTrigger value="tiering" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Studio Tiers</TabsTrigger>
              <TabsTrigger value="loop" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">The ∞ Loop</TabsTrigger>
              <TabsTrigger value="power-tools" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Precision Tools</TabsTrigger>
              <TabsTrigger value="panels" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Workstation Map</TabsTrigger>
              <TabsTrigger value="faq" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Studio FAQ</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow p-8">
            <div className="max-w-4xl mx-auto space-y-12 pb-12">
              
              <TabsContent value="tiering" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard icon={<ShieldCheck />} title="Visitor vs Studio Pro" colorClass="border-l-primary text-primary">
                    <p>Bar 4 Bar is a professional workstation. Your membership level determines project scale, vault access, and monthly Ink residency.</p>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2 border-l-4 border-muted pl-4 bg-muted/5 p-3 rounded-r-lg">
                            <p className="font-bold text-foreground text-xs uppercase flex items-center gap-2"><Globe className="h-3 w-3" /> Visitor (Free) — Limits</p>
                            <TierPriceSummary lines={getVisitorHeadlinePerks()} variant="visitor" className="mb-2" />
                            <ul className="text-[11px] space-y-1 text-muted-foreground">
                                {VISITOR_FEATURES.map((f) => (
                                  <li key={f}>• {f}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-3 border-l-4 border-orange-500 pl-4 bg-orange-500/5 p-3 rounded-r-lg">
                            <p className="font-bold text-orange-600 text-xs uppercase flex items-center gap-2"><Star className="h-3 w-3" /> Studio Pro — Monthly & Yearly</p>
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Pro Monthly</p>
                                <TierPriceSummary lines={getProMonthlyHeadlinePerks()} variant="pro" />
                              </div>
                              <div className="pt-2 border-t border-accent/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Pro Yearly — {PRO_YEARLY_PRICE}/mo · {PRO_YEARLY_BILLED}/year</p>
                                <TierPriceSummary lines={getProYearlyHeadlinePerks()} variant="yearly" />
                              </div>
                            </div>
                            <p className="text-[10px] text-orange-700/80 dark:text-orange-200/80">Full feature list below — DNA & REMIX and Generation Workstation are on every tier.</p>
                            <ul className="text-[11px] space-y-1.5 text-orange-800 dark:text-orange-200">
                                {PRO_UNLOCKS.map((f) => (
                                  <li key={f} className="flex gap-2"><span className="text-orange-500 font-bold shrink-0">★</span><span>{f}</span></li>
                                ))}
                            </ul>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-accent pt-2 border-t border-accent/20">Yearly Pro Exclusives</p>
                            <ul className="text-[11px] space-y-1.5 text-accent font-semibold">
                                {PRO_YEARLY_EXCLUSIVES.map((f) => (
                                  <li key={f} className="flex gap-2"><span className="shrink-0">◆</span><span>{f}</span></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </ChapterCard>

                <ChapterCard icon={<Droplets className="text-primary" />} title="The Ink Economy" colorClass="border-l-primary">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <h4 className="font-bold text-xs uppercase text-foreground">Residency Ink</h4>
                            </div>
                            <p className="text-xs">Your monthly allocation provided by your membership. This pool <strong>resets every month</strong> and does not rollover. The workstation drains this first.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-orange-500" />
                                <h4 className="font-bold text-xs uppercase text-foreground">Raw Ink</h4>
                            </div>
                            <p className="text-xs">Purchased via the Ink Store. This fuel is <strong>permanent</strong> and never expires. It is only consumed after your monthly residency pool reaches zero.</p>
                        </div>
                    </div>
                </ChapterCard>
              </TabsContent>

              <TabsContent value="loop" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard icon={<BrainCircuit className="text-primary" />} title="The ∞ Loop Methodology" colorClass="border-l-primary text-primary">
                    <p>The core of Bar 4 Bar is a continuous cycle of creative refinement. You are never 'finished'—you are always evolving.</p>
                    <div className="space-y-6">
                        <div className="flex gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="font-bold text-primary text-2xl">01</div>
                            <div>
                                <p className="font-bold text-foreground text-sm uppercase">EXTRACT DNA</p>
                                <p className="text-xs">Use <strong>DNA & REMIX</strong> (Workstation) to pull analytical strains from current lyrics or rough notes.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="font-bold text-primary text-2xl">02</div>
                            <div>
                                <p className="font-bold text-foreground text-sm uppercase">ARCHIVE STRAINS</p>
                                <p className="text-xs">Save your extraction as a <strong>DNA Profile</strong>. It archives the motifs, arc, and tone with high-fidelity metadata.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="font-bold text-primary text-2xl">03</div>
                            <div>
                                <p className="font-bold text-foreground text-sm uppercase">CALIBRATE & SYNC</p>
                                <p className="text-xs">Access your <strong>DNA Vault</strong> (Right Panel) to inject these strains into any track. Use the <strong>Calibration Hub</strong> to mix and match before synthesis.</p>
                            </div>
                        </div>
                    </div>
                </ChapterCard>
              </TabsContent>

              <TabsContent value="power-tools" className="mt-0 space-y-12 animate-in fade-in slide-in-from-bottom-4 pb-20">
                <div className="space-y-4">
                    <h2 className="text-3xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">3-Way Neural System</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Surgical generation accessible via three unique interaction points.</p>
                </div>

                <ChapterCard icon={<MousePointer2 className="text-primary" />} title="Way 1: In-Line Hover Triggers" colorClass="border-l-primary">
                    <p>Hover over any lyrical bar on the notepad to reveal surgical triggers. Add a line directly below, above, or delete the bar with one click.</p>
                </ChapterCard>

                <ChapterCard icon={<Zap className="text-primary" />} title="Way 2: Bar Workstation (Footer)" colorClass="border-l-primary">
                    <p>Select a bar to activate the master workstation. Use the primary triggers to generate **Next** or **Previous** suggestions anchored to your active focus ({AI_COSTS.generateNextLine} Ink).</p>
                </ChapterCard>

                <ChapterCard icon={<Sparkles className="text-primary" />} title="Way 3: Co-Writer (Right Panel)" colorClass="border-l-primary">
                    <p>Access the global co-writer panel for high-level suggestions and **Artist Style Training** while you navigate the sheet.</p>
                </ChapterCard>

                <div className="pt-8 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Precision Control Tools</h2>
                </div>

                <ChapterCard icon={<Dna className="text-green-500" />} title="DNA Suite (Right Panel)" colorClass="border-l-green-500">
                    <p>The core identity of your track. The AI uses these 5 questions to maintain thematic alignment during generation. If activated, every suggested bar will reflect your Setting, Emotion, and Message Truth.</p>
                </ChapterCard>

                <ChapterCard icon={<Target className="text-sky-500" />} title="Precision Intents (Right Panel)" colorClass="border-l-sky-500">
                    <p>Motif management. Use the **Precision Lock (Arrow)** to force the AI to land exactly on that phrase for its next suggestion. This ensures your key punchlines land perfectly on the motif.</p>
                </ChapterCard>

                <ChapterCard icon={<Shield className="text-rose-500" />} title="Guardrails (Right Panel)" colorClass="border-l-rose-500">
                    <p>Surgical restrictions. The AI checks this section to avoid **Forbidden Words** and surgically integrate **Must-Include Words**.</p>
                </ChapterCard>
              </TabsContent>

              <TabsContent value="panels" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard icon={<MonitorPlay className="text-amber-600" />} title="Workstation Map" colorClass="border-l-amber-500 text-amber-700">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="left">
                            <AccordionTrigger className="font-bold text-xs uppercase">Left Panel: Track Status</AccordionTrigger>
                            <AccordionContent className="text-xs space-y-2">
                                <p>• <strong>Status:</strong> Manage titles and enter Performance Mode.</p>
                                <p>• <strong>Structure:</strong> Reorder sections (Verse, Hook) and sort your lyrics.</p>
                                <p>• <strong>Vibe Suggester:</strong> Generate suno/udio instrumentation prompts.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="center">
                            <AccordionTrigger className="font-bold text-xs uppercase">Center Panel: The Sheet</AccordionTrigger>
                            <AccordionContent className="text-xs space-y-2">
                                <p>• <strong>Rhyme Pulse (Round Button):</strong> Initiates a deep manual scan ({AI_COSTS.findRhymes} Ink).</p>
                                <p>• <strong>3-Way System:</strong> Hover for in-line triggers or use the footer workstation.</p>
                                <p>• <strong>Smart Structure:</strong> Paste raw text to auto-deconstruct blocks.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="right">
                            <AccordionTrigger className="font-bold text-xs uppercase">Right Panel: Co-Writer</AccordionTrigger>
                            <AccordionContent className="text-xs space-y-2">
                                <p>• <strong>DNA Suite:</strong> Access the 5 Questions and the <strong>DNA Vault Folder</strong>.</p>
                                <p>• <strong>Intents:</strong> Motif management with the <strong>Precision Lock Arrow</strong>.</p>
                                <p>• <strong>AI Co-Writer:</strong> Neural sharpening tools and Artist Style training.</p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </ChapterCard>
              </TabsContent>

              <TabsContent value="faq" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-6">
                    <h3 className="font-headline text-3xl font-bold flex items-center gap-3">
                        <HelpCircle className="w-8 h-8 text-primary" /> Studio FAQ
                    </h3>
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {FAQS.map((faq, idx) => (
                            <AccordionItem key={idx} value={`faq-${idx}`} className="border rounded-xl bg-card/50 px-6 overflow-hidden">
                                <AccordionTrigger className="hover:no-underline font-headline text-lg text-left py-4 hover:text-primary transition-colors">
                                    {faq.q}
                                </AccordionTrigger>
                                <AccordionContent className="font-code text-sm text-muted-foreground leading-relaxed pb-6 border-t pt-4">
                                    {faq.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
