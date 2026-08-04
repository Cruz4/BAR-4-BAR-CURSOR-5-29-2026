'use client';

import { useCallback, useContext, useMemo } from 'react';

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
  STUDIO_DRAFT_INK_PER_SONG,
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
  Star,
  Trophy,
  Lightbulb,
  FolderOpen,
  FlaskConical,
  ScanLine,
  Link2,
  GitBranch,
  Settings,
  ListRestart,
  Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AI_COSTS } from '@/lib/costs';
import {
  dispatchReplayGuidedTour,
  dispatchReplayVaultTour,
  dispatchReplaySceneTour,
  resolveWorkstationTourPath,
} from '@/lib/studio-onboarding';
import { DataContext } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
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
      a: "Save extractions on DNA & REMIX → Analysis Step with Save DNA Profile (Pro). Load saved profiles from DNA & REMIX → Calibration Hub → DNA Strains → VAULT, or the DNA Suite folder icon in the right panel. Both paths load full profiles or let you cherry-pick individual strains."
    },
    {
      q: "How do I save a DNA profile from extraction?",
      a: "Generation Workstation → DNA & REMIX → paste lyrics, a poem, or ideas (or toggle Sync Current Lyrics) → run extraction. On Analysis Step, Save DNA Profile archives the entire extraction. Use ⚡ on strain cards to inject parts into this remix only. DNA Suite is where you can also type your own five questions or edit fields after you load or extract."
    },
    {
      q: "What is the difference between ⚡ inject and loading a DNA Profile?",
      a: "On Analysis Step or in the Hub INSIGHTS tab, ⚡ on a strain appends that one field (Creative DNA, Intents, Structure guide, or Style DNA). Save DNA Profile or the vault ↻ button stores or loads the entire extraction at once. Expanded vault entries also offer partial ⚡ loads per strain."
    },
    {
      q: "Where do analysis strains go in the Calibration Hub?",
      a: "Themes → Setting/World · Emotion → Emotion/Core · Shift → Trigger Moment · Arc & What Makes It Work → Message/Truth · POV, Tense & Voice → Tone/Palette · Motifs → Intents · Structure → Structure guide · Style → Style DNA. Color-coded cards match their hub section."
    },
    {
      q: "Do remix path percentages affect Special Instructions?",
      a: "No. Remix Influence % sliders only blend selected remix paths relative to each other. Special Instructions are treated as a direct creative brief at synthesis—not weighted or blended by percentage."
    },
    {
      q: "Why are Calibration Hub sections collapsed?",
      a: "Structure opens expanded with the Default preset loaded so you can tune bar counts right away. Other sections stay minimized until you ⚡ inject a strain, load a vault preset, select remix paths, or add Special Instructions."
    },
    {
      q: "What is the Rhyme Pulse?",
      a: `The Rhyme Pulse is the round button in the Center Panel top bar. Clicking it initiates a deep phonetic scan of your current sheet for ${AI_COSTS.findRhymes} Ink. It is a one-time scan that updates your highlighting.`
    },
    {
      q: "How do I save Ink on a full song?",
      a: "Open the Calibration Hub and run Studio Draft on your sections — a typical default structure is about 104 Ink (2 Ink per bar). Next/Previous Line is perfect for tweaks, but using it on every bar costs more over a full track."
    },
    {
      q: "Is this like Suno or Udio?",
      a: "No — those tools render full songs. Bar 4 Bar is your rhyme book and DNA workstation: structure, remix strains, rhyme pulse, and vault saves. Ink powers lyric intelligence, not audio generation."
    },
    {
      q: "How do I save a Vibe?",
      a: "In the Right Panel under 'Track Vibe', click the folder icon to open the Vibe Vault. You can save your current instrumentation and BPM here for reuse across the project."
    },
    {
      q: "What is the 3-Way System?",
      a: "It's our precision generation framework. You can trigger suggestions via: 1. In-Line Hover Buttons (on the sheet), 2. The Bar Workstation (footer), and 3. The AI Co-Writer (right panel)."
    },
    {
      q: "Where is Studio Progress?",
      a: "On The Vault (desktop), use the Studio Progress panel in the left gutter. On mobile it appears as a banner under the header. For the full board — weekly goals, milestones, leaderboard compare, and achievements — open Studio Progress from the profile menu or visit /studio-progress."
    },
    {
      q: "How do achievements and share cards work?",
      a: "Badges unlock automatically as you hit studio milestones (writing, generating, streaks, and more). Open Studio Progress to see your trophy grid with tooltips. Tap Share achievement card (under Sharing & visibility) to download a foil milestone card you can post anywhere."
    },
    {
      q: "How does Refer a Friend work?",
      a: "Ink Store → Refer a Friend copies your personal link. When a new artist signs up through it, you each receive 150 permanent Ink automatically. Referrers can earn up to 4 bonuses (600 Ink total). Referred signups are tracked on the platform and logged with Stripe checkout metadata when they upgrade."
    },
    {
      q: "What is a rhyme bar vs a sheet line?",
      a: "Each row on the lyrics sheet is one line. Studio Progress displays rhyme bars — two non-empty lines equal one rhyme bar (a couplet). AI tools still work line-by-line."
    },
    {
      q: "Written bars vs generated lines — what counts for trophies?",
      a: "Hand-typed lines (and lines you edit after AI suggests them) count toward “write X bars” goals, streaks, and writing achievements. Lines from Generate Next, full drafts, or Smart Structure paste are tracked separately as generated — they earn lighter XP and feed AI-specific milestones (e.g. Next Bar Graduate). Editing an AI line converts it to written credit on the next save."
    },
    {
      q: "What is The Scene (my home page)?",
      a: "The Scene is where you land when you sign in — friends' wall posts, a Discover stream (recently live Artist Homes, public drops, live DNA Drops, leaderboard risers), your Booth, and shortcuts to everything. The Vault (your albums and writing workstation) is one click away at /vault, top of the right dock."
    },
    {
      q: "What is Artist Home and Edit Public Page?",
      a: "Artist Home is a core part of Bar 4 Bar — your shareable public page at /profile/your-slug. Living skin, modules, Album Rooms, embeds, social links, wall, friends, and live DNA Drops. Edit Public Page (Your Booth on the Scene, the Vault dock, or Studio Progress → Sharing) is where you customize it. Private by default; never shows private lyrics unless you publish a DNA Drop."
    },
    {
      q: "What is The Block?",
      a: "The Block is your friends feed — and it now lives on the Scene home, front and center when you sign in. Wall posts from people you friend, incoming requests, and a Discover stream when your circle is quiet. Search artist names to send invites, or copy your referral link for people not on Bar 4 Bar yet. Your circle (/friends) lists friends and blocked artists."
    },
    {
      q: "What shows on the leaderboard and public profile?",
      a: "The weekly leaderboard shows your display name, rank, XP, bars written (7 days), streak, and tracks completed — never lyrics or vault content. New artists start private: turn on Show on leaderboard in Studio Progress → Sharing & visibility (or the Artist Home dock on The Vault). Artist Home is also off by default; when live it can show your modules, social links, Album Rooms, live DNA Drops, friends, and wall — still never private lyrics unless you publish a DNA Drop."
    },
    {
      q: "What is DNA Drop?",
      a: "Studio Pro artists publish a shareable link from the left panel (DNA Drop). Recipients sign in and import lyrics, structure, Creative DNA, vibe, and related strains into their vault. Square album cover art keeps drop previews sharp. Live drops also list automatically on your Artist Home."
    },
    {
      q: "What happens during Creative Syncing vs DNA Extraction?",
      a: "DNA Extraction (Seed → Analysis Step) maps strains from pasted or synced text without drafting new bars — Save DNA Profile archives the full result; ⚡ injects individual parts. Creative Syncing runs during full drafts and remix synthesis — it weaves active Hub rules into new lyrics."
    },
    {
      q: "How do weekly and monthly challenges differ?",
      a: "Weekly goals reset every Monday; monthly challenges follow the calendar month. Both track rhyme bars (lines ÷ 2). Open /studio-progress or the Vault sidebar for live counters, rank XP, and leaderboard compare."
    },
    {
      q: "What is included in a DNA Drop?",
      a: "A DNA Drop is a public snapshot of your saved project — lyrics & sections, Creative DNA, checked intents, vibe, guardrails, special instructions, and Style DNA when that toggle is on. Album drops also include album DNA presets and album-level motifs."
    },
    {
      q: "Is my DNA Drop live-synced when I edit?",
      a: "No. The link shows the last published snapshot. After you change anything you want shared, open DNA Drop again and press Update snapshot — the URL stays the same but visitors see the new version. Until then, old shared links keep showing the previous snapshot."
    },
    {
      q: "How do I unshare or take a DNA Drop offline?",
      a: "Open DNA Drop from the left panel (track) or album page, then press Take offline. The public link stops working immediately. You can publish again later with Confirm DNA Drop."
    }
];

export function HowToUseDialog({ open, onOpenChange }: HowToUseDialogProps) {
  const { albums } = useContext(DataContext);
  const { toast } = useToast();

  const workstationTourPath = useMemo(
    () => resolveWorkstationTourPath(albums),
    [albums]
  );

  const handleReplayWorkstationTour = useCallback(() => {
    onOpenChange(false);
    if (!workstationTourPath) {
      toast({
        title: 'No tracks yet',
        description: 'Create or open a project in the Vault first.',
      });
      dispatchReplayVaultTour();
      return;
    }
    dispatchReplayGuidedTour(workstationTourPath);
  }, [onOpenChange, toast, workstationTourPath]);

  const handleReplayVaultTour = useCallback(() => {
    onOpenChange(false);
    dispatchReplayVaultTour();
  }, [onOpenChange]);

  const handleReplaySceneTour = useCallback(() => {
    onOpenChange(false);
    dispatchReplaySceneTour();
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] sm:w-full h-[min(90dvh,100vh)] max-h-[90dvh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 sm:p-8 pb-4 border-b bg-background/80 backdrop-blur-md shrink-0">
            <DialogTitle className="font-headline text-2xl sm:text-4xl flex items-center gap-3 font-bold">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary shrink-0" /> Studio Master Manual
            </DialogTitle>
            <DialogDescription className="font-tagline uppercase tracking-[0.3em] text-[10px] text-muted-foreground">Bar4Bar_v3</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tiering" className="flex-grow flex flex-col min-h-0">
          <div className="px-4 sm:px-8 border-b bg-muted/10 shrink-0">
            <TabsList className="bg-transparent h-11 sm:h-12 gap-4 sm:gap-8 overflow-x-auto justify-start w-full max-w-full flex-nowrap scrollbar-none">
              <TabsTrigger value="start-here" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Start Here</TabsTrigger>
              <TabsTrigger value="tiering" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Studio Tiers</TabsTrigger>
              <TabsTrigger value="loop" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">The ∞ Loop</TabsTrigger>
              <TabsTrigger value="power-tools" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Precision Tools</TabsTrigger>
              <TabsTrigger value="panels" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Workstation Map</TabsTrigger>
              <TabsTrigger value="faq" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Studio FAQ</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow p-4 sm:p-8 min-h-0">
            <div className="max-w-4xl mx-auto space-y-12 pb-12">

              <TabsContent value="start-here" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard icon={<Radio className="text-emerald-400" />} title="The Scene — Your Home" colorClass="border-l-emerald-500 text-emerald-400">
                  <p className="text-sm">
                    Signing in lands you on <strong>The Scene</strong> — your home page. Friends&apos; wall
                    drops, a Discover stream of who&apos;s live across the site, your Booth (Artist Home at a
                    glance), and quick lanes into everything else.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>Post to your wall</strong> — the composer at the top; friends see it on their Scene.</li>
                    <li><strong>Discover</strong> — recently live Artist Homes, public drops, live DNA Drops, and this week&apos;s leaderboard risers, so the block is never empty.</li>
                    <li><strong>Your Booth</strong> — flip your Artist Home live and open Edit Public Page without leaving home.</li>
                    <li><strong>The Vault</strong> — top of the right dock (or the account menu): albums, tracks, and the writing workstation now live at <code className="text-primary">/vault</code>.</li>
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-bold uppercase text-[10px] tracking-widest gap-2 border-emerald-500/40 hover:bg-emerald-500/10"
                    onClick={handleReplaySceneTour}
                  >
                    <RefreshCw className="h-4 w-4" /> Replay Scene Tour
                  </Button>
                </ChapterCard>
                <ChapterCard icon={<MousePointer2 className="text-primary" />} title="60-Second Start" colorClass="border-l-primary text-primary">
                  <p className="text-foreground/90">Bar 4 Bar is a <strong>bar-by-bar rhyme book</strong>, not a one-click song generator. Your first win in under a minute:</p>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li><strong>Paste or write</strong> — top bar → Smart Structure, or type directly on the sheet.</li>
                    <li><strong>Generate one bar</strong> — click a line, then Bar Workstation → Generate Next (~{AI_COSTS.generateNextLine} Ink).</li>
                    <li><strong>Save</strong> — edits auto-save; use Export Track (left panel) for PDF anytime.</li>
                  </ol>
                  <p className="text-xs border-l-2 border-primary/30 pl-3 italic">Free tier: full DNA &amp; REMIX workflow + system vault presets. Pro saves <em>your</em> custom strains and unlocks cloud sync.</p>
                </ChapterCard>
                <ChapterCard icon={<Compass className="text-green-500" />} title="Guided Workstation Tour" colorClass="border-l-green-500">
                  <p>Walk through the lyrics page with spotlight highlights — paste, sheet, bar AI, DNA, DNA Drop (Pro), and Ink. Skippable anytime.</p>
                  <p className="text-xs text-muted-foreground">Runs automatically the first time you open a track. Replay opens your last worked-on project and starts the tour.</p>
                  <Button
                    type="button"
                    className="font-bold uppercase text-[10px] tracking-widest gap-2"
                    onClick={handleReplayWorkstationTour}
                  >
                    <RefreshCw className="h-4 w-4" /> Replay Workstation Tour
                  </Button>
                </ChapterCard>
                <ChapterCard icon={<CassetteTape className="text-sky-400" />} title="Guided Vault Tour" colorClass="border-l-sky-500 text-sky-400">
                  <p>Walk through the Vault with spotlight highlights — header, create project, collection, loose tracks, studio progress, search, and Ink.</p>
                  <p className="text-xs text-muted-foreground">Runs automatically on your first visit to The Vault. Replay takes you to the Vault and starts the tour.</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-bold uppercase text-[10px] tracking-widest gap-2 border-sky-500/40 hover:bg-sky-500/10"
                    onClick={handleReplayVaultTour}
                  >
                    <RefreshCw className="h-4 w-4" /> Replay Vault Tour
                  </Button>
                </ChapterCard>
                <ChapterCard icon={<Lightbulb className="text-yellow-500" />} title="Studio Insights & Did You Knows" colorClass="border-l-yellow-500 text-yellow-500">
                  <p className="text-sm">After your first guided tour, the lyrics page surfaces one random tip per visit — either a <strong>Studio Insight</strong> or a <strong>Did You Know?</strong> card covering DNA Drop, rhyme-bar math, strain inject, ranks, vault import, and more.</p>
                  <p className="text-xs text-muted-foreground">45+ tips rotate in the pool. Pause or dismiss anytime; they never repeat twice on the same page visit.</p>
                </ChapterCard>
                <ChapterCard icon={<Globe className="text-fuchsia-400" />} title="Artist Home & The Block" colorClass="border-l-fuchsia-500 text-fuchsia-400">
                  <p className="text-sm">
                    Artist Home is a <strong>core part of Bar 4 Bar</strong> — your shareable public page at{' '}
                    <code className="text-primary">/profile/your-slug</code>. Living skin, Album Rooms, embeds, social
                    links, wall posts, and live DNA Drops. Private until you turn Public profile on (Your Booth on
                    the Scene, the Vault dock, or Studio Progress → Sharing).
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>
                      <strong>Edit Public Page</strong> — customize modules and links from the Scene dock, Your
                      Booth, or <code className="text-primary">/profile/customize</code>.
                    </li>
                    <li>
                      <strong>The Block</strong> — your friends feed lives on the Scene home now: wall posts,
                      requests, and find artists by name, right where you land.
                    </li>
                    <li>
                      <strong>Your circle</strong> — friends + blocked lists at{' '}
                      <code className="text-primary">/friends</code>.
                    </li>
                  </ul>
                </ChapterCard>
                <ChapterCard icon={<Trophy className="text-amber-400" />} title="Progress, Badges & Share Cards" colorClass="border-l-amber-500 text-amber-400">
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>Studio Progress</strong> — Vault sidebar or header menu → weekly goals, rank XP, personal milestones.</li>
                    <li><strong>Full board</strong> — <code className="text-primary">/studio-progress</code> for monthly/lifetime challenges and leaderboard compare.</li>
                    <li><strong>Achievements</strong> — Studio Progress → Studio trophies (hover badges for unlock details).</li>
                    <li><strong>Share card</strong> — Studio Progress → Sharing &amp; visibility → Share achievement card for a foil export of your latest milestone.</li>
                    <li><strong>Refer a Friend</strong> — Ink Store → copy link; 150 permanent Ink each, up to 4 referrals.</li>
                  </ul>
                </ChapterCard>
              </TabsContent>
              
              <TabsContent value="tiering" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard icon={<ShieldCheck />} title="Visitor vs Studio Pro" colorClass="border-l-primary text-primary">
                    <p>Bar 4 Bar is a professional workstation. Your membership level determines project scale, vault access, and monthly Ink residency.</p>
                    <p className="text-xs bg-muted/30 border border-border/40 rounded-lg p-3"><strong>Free artists:</strong> try the full DNA &amp; REMIX and Generation Workstation flows with system presets. <strong>Pro:</strong> archive your own DNA, Vibe, and Style strains; unlimited albums; cloud sync.</p>
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
                            <p className="text-[10px] text-accent/90 leading-snug pb-2">Bulk Ink packs (Artist Bundle & Studio Vault) unlock with Studio Pro — Visitor artists start with the Studio Pack.</p>
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
                                <p className="text-xs">Open <strong>DNA &amp; REMIX</strong> in the Generation Workstation. Paste lyrics, a poem, or ideas — or toggle <strong>Sync Current Lyrics</strong> — then run extraction to reach Analysis Step.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="font-bold text-primary text-2xl">02</div>
                            <div>
                                <p className="font-bold text-foreground text-sm uppercase">ARCHIVE STRAINS</p>
                                <p className="text-xs">On <strong>Analysis Step</strong>, tap <strong>Save DNA Profile</strong> to archive the full extraction (themes, motifs, arc, structure guide, Style DNA, and mapped Creative DNA). Use <strong>⚡</strong> on individual strain cards when you only want parts in this remix session.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="font-bold text-primary text-2xl">03</div>
                            <div>
                                <p className="font-bold text-foreground text-sm uppercase">CALIBRATE & SYNC</p>
                                <p className="text-xs">Open the <strong>Calibration Hub</strong> to mix DNA, Style DNA, Intents, Structure, and remix paths. Use ⚡ on analysis cards to inject strains, or load saved profiles from the <strong>DNA Vault</strong> (Right Panel or Hub VAULT tab) before synthesis.</p>
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
                    <p>Hover over any lyrical line on the notepad to reveal surgical triggers. Add a line directly below, above, or delete the line with one click.</p>
                </ChapterCard>

                <ChapterCard icon={<Zap className="text-primary" />} title="Way 2: Bar Workstation (Footer)" colorClass="border-l-primary">
                    <p>Select a line to activate the master workstation. Generate <strong>Next</strong> or <strong>Previous</strong> suggestions anchored to your active focus ({AI_COSTS.generateNextLine} Ink each).</p>
                    <p className="text-xs">Set <strong>End With</strong> to force the next suggestion to land on your punchline. Watch the rule badges light up to see which DNA, Vibes, and Intents are guiding the AI.</p>
                </ChapterCard>

                <ChapterCard icon={<Sparkles className="text-primary" />} title="Way 3: Co-Writer (Right Panel)" colorClass="border-l-primary">
                    <p>Access the global co-writer panel for high-level suggestions and <strong>Artist Style Training</strong> while you navigate the sheet.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Sheet &amp; Structure</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Center panel — the rhyme book itself.</p>
                </div>

                <ChapterCard icon={<ClipboardPaste className="text-primary" />} title="Smart Structure" colorClass="border-l-primary">
                    <p>Click <strong>+ Paste Your Lyrics</strong> in the center top bar. Label sections with <code className="text-primary">[Verse]</code>, <code className="text-primary">[Hook]</code>, etc. on their own lines for automatic splits ({AI_COSTS.analyzeStructure} Ink).</p>
                </ChapterCard>

                <ChapterCard icon={<Zap className="text-amber-500" />} title="Rhyme Pulse" colorClass="border-l-amber-500 text-amber-500">
                    <p>The round button in the center top bar runs a one-time deep phonetic scan of your current sheet ({AI_COSTS.findRhymes} Ink). Results update rhyme highlighting across every line.</p>
                </ChapterCard>

                <ChapterCard icon={<ListRestart className="text-muted-foreground" />} title="Sheet Editing &amp; Undo" colorClass="border-l-muted-foreground">
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Enter</strong> — split a line at the cursor; the workstation handles indexing and hanging indents.</li>
                        <li><strong>Backspace</strong> at the start of a bar — merge with the line above.</li>
                        <li><strong>Undo</strong> — center top bar reverts sheet and section changes (up to 20 history steps).</li>
                    </ul>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Right Panel Controls</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">DNA, vibe, motifs, style, and restrictions.</p>
                </div>

                <ChapterCard icon={<Dna className="text-green-500" />} title="DNA Suite (Right Panel)" colorClass="border-l-green-500">
                    <p>The five Creative Direction questions (Setting, Emotion, Trigger, Message, Tone) — type your own DNA here or refine fields after you load or extract a profile.</p>
                    <p className="text-xs">Primary save path: <strong>DNA &amp; REMIX → Analysis Step → Save DNA Profile</strong>. DNA Suite + the <strong>folder icon</strong> is where you browse vault saves, load full profiles (↻), or edit mapped fields by hand. Hub VAULT tab works the same during a remix.</p>
                </ChapterCard>

                <ChapterCard icon={<Target className="text-sky-500" />} title="Precision Intents (Right Panel)" colorClass="border-l-sky-500">
                    <p>Motif management for punchlines and recurring phrases. Hover any intent and click the <strong>Precision Lock arrow</strong> to force the AI to end its next suggestion on that exact phrase.</p>
                </ChapterCard>

                <ChapterCard icon={<Shield className="text-rose-500" />} title="Guardrails (Right Panel)" colorClass="border-l-rose-500">
                    <p>Surgical restrictions. The AI avoids <strong>Forbidden Words</strong> and integrates <strong>Must-Include Words</strong> during every generation pass.</p>
                </ChapterCard>

                <ChapterCard icon={<Palette className="text-amber-500" />} title="Track Vibe &amp; Vibe Vault" colorClass="border-l-amber-500 text-amber-500">
                    <p>Set genre, BPM, feeling tags, and instrumentation in <strong>Track Vibe</strong>. Copy the instrumentation string into Suno, Udio, or similar tools.</p>
                    <p className="text-xs">Save presets with the <strong>folder icon</strong> under Track Vibe — reuse the same sonic palette across every song in the project.</p>
                </ChapterCard>

                <ChapterCard icon={<Fingerprint className="text-fuchsia-500" />} title="Style DNA &amp; Training" colorClass="border-l-fuchsia-500 text-fuchsia-500">
                    <p><strong>Train AI on Style</strong> ({AI_COSTS.improveMyStyle} Ink) teaches the workstation your vocabulary and flow. Style DNA feeds every generation when the toggle is on.</p>
                    <p className="text-xs">Save style strains to the Style Vault (folder icon) for reuse across tracks.</p>
                </ChapterCard>

                <ChapterCard icon={<Wand2 className="text-indigo-500" />} title="Creative Effects" colorClass="border-l-indigo-500 text-indigo-400">
                    <p>Neural sharpening tools in the Right Panel — Simile, Metaphor, and Sound-Alike on every tier; Twist, Image Chain, POV, and more on Studio Pro ({AI_COSTS.runCreativeEffect} Ink each).</p>
                    <p className="text-xs">Results land in the Scratch Pad for review before you paste into the sheet.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">DNA &amp; Remix Engine</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Generation Workstation → DNA &amp; REMIX.</p>
                </div>

                <ChapterCard icon={<ScanLine className="text-sky-400" />} title="Seed DNA &amp; REMIX" colorClass="border-l-sky-500 text-sky-400">
                    <p>Step 1 of DNA &amp; REMIX. Paste lyrics, a poem, rough ideas, or inspiration — or turn on <strong>Sync Current Lyrics</strong> to pull from your sheet. Run extraction to open Analysis Step.</p>
                    <p className="text-xs">This pass maps analytical strains <em>without</em> drafting new bars. You can re-matrix remix paths later without re-pasting source text once extraction is saved.</p>
                </ChapterCard>

                <ChapterCard icon={<Sparkles className="text-emerald-400" />} title="Analysis Step — Save &amp; Inject" colorClass="border-l-emerald-500 text-emerald-400">
                    <p>Step 2 decodes your source into color-coded strain cards (Themes, Motifs, Emotion, Structure, Style, and more).</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>Save DNA Profile</strong> (Pro) — archives the <em>entire</em> extraction to your vault for any track.</li>
                        <li><strong>⚡ on a strain</strong> — injects just that part into the Calibration Hub for this remix (Creative DNA fields, Intents, Structure guide, or Style DNA).</li>
                        <li><strong>Define Paths</strong> — optional remix forks with influence sliders before Calibration Hub.</li>
                    </ul>
                    <p className="text-xs">Edit or type DNA manually anytime in DNA Suite after you load or extract — the vault and Suite stay in sync with the same profile shape.</p>
                </ChapterCard>

                <ChapterCard icon={<ScanLine className="text-sky-400" />} title="DNA Extraction (Overview)" colorClass="border-l-sky-500/60 text-sky-400/90">
                    <p>The full flow: <strong>Seed</strong> (paste or sync) → <strong>Analysis Step</strong> (save full profile or ⚡ parts) → <strong>Remix Paths</strong> (optional) → <strong>Calibration Hub</strong> → synthesis.</p>
                </ChapterCard>

                <ChapterCard icon={<Settings className="text-primary" />} title="Calibration Hub" colorClass="border-l-primary">
                    <p>The workstation brain (Step 10). Mix DNA strains, Style DNA, Intents, Structure presets, remix paths, and Special Instructions before synthesis.</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>INSIGHTS</strong> — latest extraction strains with ⚡ inject buttons (one field at a time).</li>
                        <li><strong>VAULT</strong> — load full saved profiles (↻) or cherry-pick individual strains from expanded entries.</li>
                        <li><strong>Structure</strong> — opens expanded with the Default preset so you can tune bar counts immediately.</li>
                    </ul>
                </ChapterCard>

                <ChapterCard icon={<FilePenLine className="text-blue-400" />} title="Special Instructions" colorClass="border-l-blue-500 text-blue-400">
                    <p>A direct creative brief in the Calibration Hub — tone, POV, constraints, or scene direction. Treated as a hard rule at synthesis, <em>not</em> blended by remix path percentages.</p>
                </ChapterCard>

                <ChapterCard icon={<GitBranch className="text-violet-400" />} title="Remix Paths" colorClass="border-l-violet-500 text-violet-400">
                    <p>Select multiple creative paths in DNA &amp; REMIX. Influence % sliders blend selected forks relative to each other during synthesis — explore narrative branches without rewriting the whole track.</p>
                </ChapterCard>

                <ChapterCard icon={<FlaskConical className="text-cyan-400" />} title="Creative Syncing" colorClass="border-l-cyan-500 text-cyan-400">
                    <p>During Studio Draft and remix synthesis, the Creative Syncing overlay weaves active DNA, Intents, Style, Vibe, guardrails, and Special Instructions into one neural pass.</p>
                </ChapterCard>

                <ChapterCard icon={<FolderOpen className="text-green-500" />} title="DNA Vault &amp; DNA Mixer" colorClass="border-l-green-500">
                    <p><strong>Save:</strong> DNA &amp; REMIX → Analysis Step → <strong>Save DNA Profile</strong> (Pro). <strong>Load:</strong> Calibration Hub VAULT tab or DNA Suite folder icon — full profile (↻) or partial ⚡ per strain.</p>
                    <p className="text-xs"><strong>DNA Mixer</strong> (Album page) — selectively pick individual creative strains from your vault history without loading an entire profile.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Generation &amp; Capture</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Left panel workstation, drafts, and voice capture.</p>
                </div>

                <ChapterCard icon={<BrainCircuit className="text-primary" />} title="Generation Workstation &amp; Studio Draft" colorClass="border-l-primary">
                    <p>Open <strong>Generation Workstation</strong> from the left panel. Run <strong>Studio Draft</strong> in the Calibration Hub to generate full sections — a typical default structure is about {STUDIO_DRAFT_INK_PER_SONG} Ink ({AI_COSTS.generateDraftPerBar} Ink per bar).</p>
                    <p className="text-xs">Use Next/Previous Line for surgical tweaks; running it on every bar costs more over a full track than a single draft pass.</p>
                </ChapterCard>

                <ChapterCard icon={<Mic className="text-primary" />} title="Freestyle Pad" colorClass="border-l-primary">
                    <p>Studio Pro — open from the footer Bar Workstation. Speak your bars; tap <strong>Add to Editor</strong> to drop transcribed lines directly into the active section ({AI_COSTS.freestyleTranscription} Ink per chunk).</p>
                </ChapterCard>

                <ChapterCard icon={<Volume2 className="text-amber-500" />} title="Vibe Suggester" colorClass="border-l-amber-500 text-amber-500">
                    <p>Left panel → <strong>Analyze Vibe</strong> reads your lyrics and auto-fills genre, BPM, and instrumentation in Track Vibe ({AI_COSTS.suggestVibe} Ink). Copy the result into external music AIs.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Export &amp; Share</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Pro workflows for performance and collaboration.</p>
                </div>

                <ChapterCard icon={<MonitorPlay className="text-sky-400" />} title="Performance Mode" colorClass="border-l-sky-500 text-sky-400">
                    <p>Studio Pro — left panel Track Status card. Distraction-free teleprompter with rhyme focus for live runs or rehearsal.</p>
                </ChapterCard>

                <ChapterCard icon={<Link2 className="text-primary" />} title="DNA Drop" colorClass="border-l-primary">
                    <p>Studio Pro — publish a shareable link from the left panel. Collaborators sign in and import lyrics, structure, Creative DNA, vibe, and related strains. Update snapshot after edits; <strong>Take offline</strong> to revoke the link.</p>
                </ChapterCard>

                <ChapterCard icon={<NotebookText className="text-muted-foreground" />} title="Export Track &amp; Vault Backup" colorClass="border-l-muted-foreground">
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Export Track</strong> — left panel PDF export anytime.</li>
                        <li><strong>Vault Export</strong> — Vault dashboard downloads a <code className="text-primary">.json</code> backup; re-import to restore albums, DNA presets, and strains.</li>
                    </ul>
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
                                <p>• <strong>DNA Suite:</strong> Five Creative Direction questions — type your own or edit after load/extract. <strong>Folder icon</strong> opens the vault. Primary extraction save: DNA &amp; REMIX → Analysis Step.</p>
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
