'use client';

import { useCallback, useContext, useMemo } from 'react';

/**
 * @fileOverview Studio Master Manual — spatial guide for Scene, Vault, workstation.
 * Start Here covers navigation, Activity, Artist Home, sky, and tours.
 * Detail lives in Precision Tools + FAQ.
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
  Bell,
  Archive,
  CloudSun,
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
import { useConfigSurfaceFlags, type ConfigSurfaceFlags } from '@/hooks/use-config-surface-flags';
import { dropArtistShareLabel, firstDropsCashoutLine, firstDropsFeeCashoutLine, firstDropsPitch, getFirstDropsCashoutFaqAnswer, getFirstDropsFeeFaqAnswer, getFirstDropsSellFaqAnswer, getFirstDropsWhatFaqAnswer } from '@/lib/drop-commerce';
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

const CORE_FAQS = [
    {
      q: "What do I see when I open the app logged out?",
      a: "A live Pressing / Artist Home playground — type your name and a bar, watch the page skin update, then Claim to save or Try writing free for the Architect-seeded sheet. Friends and Guestbook preview Neomaiya Sol; tap her name to open her real Artist Home. Sign in anytime from the header."
    },
    {
      q: "Where are The Vault and Activity?",
      a: "Vault (albums & tracks) is at /vault — sky archive icon in the top nav, or top of the Scene dock. Activity (emerald bell) is for your work: unfinished verse, streak at midnight, someone echoing your bar, plus friends and DNA imports — not a feed dump. Optional push under Settings → Notifications.",
    },
    {
      q: "What is Artist Home and Edit Public Page?",
      a: "Artist Home is completely free — no Pro required to claim or go live. Shareable page at /profile/your-slug (skin, modules, The Board, embeds, socials, wall, friends, guestbook, live DNA Drops). New accounts often get Neomaiya Sol as a first friend with a guestbook welcome. On the Scene dock, Artist Home | Edit page is one split control — view live, or customize. Also reachable from Your Booth, Vault dock, or Studio Progress → Sharing. Private by default; never shows private lyrics unless you publish a DNA Drop."
    },
    {
      q: "What is The Block?",
      a: "The Block is your friends feed on The Scene — wall posts, requests, and Discover when your circle is quiet. Search artists to invite, or copy your referral link. Your circle (/friends) lists friends and blocked artists."
    },
    {
      q: "Why does the Scene sky change?",
      a: "The skyline uses your local clock for day, dawn, dusk, and night. If you allow location once (cached on-device ~6 hours), live weather from Open-Meteo can add clouds, rain, snow, fog, wind, or storms. Deny location and you still get clock-only day/night with no weather particles. Coords are never stored on our servers."
    },
    {
      q: "What is the difference between Residency and Raw Ink?",
      a: "Residency Ink comes with your membership and resets monthly — it does not rollover. Raw Ink is purchased, never expires, and is permanent fuel. The studio drains Residency first."
    },
    {
      q: "Where is the DNA Vault?",
      a: "Save on DNA & REMIX → Analysis Step → Save DNA Profile (Pro). Load from Calibration Hub → VAULT, or the DNA Suite folder icon in the right panel. Full profiles or cherry-pick individual strains."
    },
    {
      q: "How do I save a DNA profile from extraction?",
      a: "Generation Workstation → DNA & REMIX → paste or Sync Current Lyrics → extract. On Analysis Step, Save DNA Profile archives everything. ⚡ on a strain injects just that field into this remix. DNA Suite also lets you type or edit the five Creative Direction questions after load/extract. On an album page, Pro can Extract Album DNA to fill World Building / Emotional Core / Message Truth from all tracks, then Save / Load those profiles."
    },
    {
      q: "What is the difference between ⚡ inject and loading a DNA Profile?",
      a: "⚡ appends one field (Creative DNA, Intents, Structure guide, or Style DNA). Save DNA Profile or vault ↻ stores/loads the whole extraction. Expanded vault entries also offer per-strain ⚡."
    },
    {
      q: "Where do analysis strains go in the Calibration Hub?",
      a: "Themes → Setting/World · Emotion → Emotion/Core · Shift → Trigger Moment · Arc & What Makes It Work → Message/Truth · POV, Tense & Voice → Tone/Palette · Motifs → Intents · Structure → Structure guide · Style → Style DNA."
    },
    {
      q: "Do remix path percentages affect Special Instructions?",
      a: "No. Influence % only blends selected remix paths. Special Instructions are a direct brief at synthesis — not weighted by percentage."
    },
    {
      q: "Why are Calibration Hub sections collapsed?",
      a: "Structure opens expanded with Default so you can tune bar counts. Other sections stay minimized until you ⚡ inject, load a vault preset, pick remix paths, or add Special Instructions."
    },
    {
      q: "What is the Rhyme Pulse?",
      a: `Round button in the Center Panel top bar — one deep phonetic scan of your sheet for ${AI_COSTS.findRhymes} Ink. Updates rhyme highlighting.`
    },
    {
      q: "How do I save Ink on a full song?",
      a: "Run Studio Draft from the Calibration Hub — a typical default structure is about 104 Ink (2 Ink per bar). Next/Previous Line is great for tweaks; using it on every bar costs more than one draft pass."
    },
    {
      q: "Is this like Suno or Udio?",
      a: "No — those render audio. Bar 4 Bar is your rhyme book and DNA workstation. Ink powers lyric intelligence, not song audio."
    },
    {
      q: "How do I save a Vibe?",
      a: "Right Panel → Track Vibe → folder icon opens the Vibe Vault. Save instrumentation and BPM for reuse across the project."
    },
    {
      q: "What is the 3-Way System?",
      a: "Three ways to generate: 1) In-line hover on the sheet, 2) Bar Workstation footer, 3) AI Co-Writer in the right panel."
    },
    {
      q: "Where is Studio Progress?",
      a: "Vault left gutter on desktop; banner under the header on mobile. Full board — weekly goals, milestones, leaderboard, achievements — at /studio-progress or from the profile menu."
    },
    {
      q: "How do achievements and share cards work?",
      a: "Badges unlock as you hit milestones. Studio Progress → Studio trophies for the grid. Sharing & visibility → Share achievement card downloads a foil milestone card."
    },
    {
      q: "How does Refer a Friend work?",
      a: "Ink Store → Refer a Friend copies your link. New signup through it: 150 permanent Ink each. Up to 4 referrer bonuses (600 Ink total)."
    },
    {
      q: "What is a rhyme bar vs a sheet line?",
      a: "Each sheet row is one line. Progress tracks rhyme bars — two non-empty lines = one couplet. AI tools still work line-by-line."
    },
    {
      q: "Written bars vs generated lines — what counts for trophies?",
      a: "Hand-typed lines (and AI lines you edit) count toward write goals, streaks, and writing trophies. Generate Next, drafts, and Smart Structure paste are tracked as generated — lighter XP and AI milestones. Editing an AI line converts it to written credit on the next save."
    },
    {
      q: "What shows on the leaderboard and public profile?",
      a: "Weekly board: display name, rank, XP, bars (7 days), streak, tracks completed — never lyrics. Opt in via Studio Progress → Sharing. Artist Home is off by default; when live it can show modules, socials, rooms, drops, friends, guestbook, and wall — still never private lyrics unless you DNA Drop."
    },
    {
      q: "What is DNA Drop?",
      a: "Studio Pro — publish a shareable snapshot from the left panel. Recipients import lyrics, structure, Creative DNA, vibe, and strains. Live drops list on your Artist Home. Update snapshot after edits; Take offline to revoke. When First Drops is on, the same dialog can attach audio and a price — cash out those sales on Earnings."
    },
    {
      q: "What happens during Creative Syncing vs DNA Extraction?",
      a: "Extraction (Seed → Analysis) maps strains without drafting bars. Creative Syncing runs during drafts/remix synthesis and weaves Hub rules into new lyrics."
    },
    {
      q: "How do weekly and monthly challenges differ?",
      a: "Weekly resets Monday; monthly follows the calendar. Both use rhyme bars (lines ÷ 2). Counters on /studio-progress and the Vault sidebar."
    },
    {
      q: "What is included in a DNA Drop?",
      a: "Lyrics & sections, Creative DNA, checked intents, vibe, guardrails, special instructions, and Style DNA when toggled on. Album drops add album DNA presets and motifs. Optional links & embeds (YouTube, Spotify, etc.) attach from the DNA Drop dialog and play on the public page. When First Drops is on, that same dialog also holds audio and a price — cash out those sales on Earnings.",
    },
    {
      q: "Is my DNA Drop live-synced when I edit?",
      a: "No — it's the last published snapshot. After changes, open DNA Drop → Update snapshot (same URL). Until then, shared links keep the previous version."
    },
    {
      q: "How do I unshare or take a DNA Drop offline?",
      a: "DNA Drop (track left panel or album page) → Take offline. The public link stops immediately. Publish again later with Confirm DNA Drop."
    }
];

const FIRST_DROPS_FAQS = [
  {
    q: "What is a First Drop?",
    a: getFirstDropsWhatFaqAnswer(),
  },
  {
    q: "How do I sell a First Drop?",
    a: getFirstDropsSellFaqAnswer(),
  },
  {
    q: "What does Bar 4 Bar keep on a First Drop sale?",
    a: getFirstDropsFeeFaqAnswer(),
  },
  {
    q: "How do I cash out after a fan buys my song?",
    a: getFirstDropsCashoutFaqAnswer(),
  },
];

const LOCK_FAQS = [
  {
    q: "What is Finish this bar?",
    a: "Optional social casts (Admin → Config → Finish this bar) at /lock/… — anyone can reply with a Fit score. Guest try at /try is a separate Architect-seeded sheet. Logged-out home is the Pressing playground, not a LOCK page. Replies on social casts can be deleted by the writer or cast owner.",
  },
  {
    q: "Why sign in after dropping a bar?",
    a: "Writing is free and instant. Without an account your reply shows as Anonymous. Sign in to put your display name on it, get Activity when someone answers you, and use Clear-for-release if you get Artist Pick. After that you can keep writing in Studio with your bars preloaded.",
  },
];

function sceneHomeFaq(flags: ConfigSurfaceFlags) {
  const pins: string[] = [];
  if (flags.houseBar) pins.push('House bar of the day');
  if (flags.weeklyChallenge) pins.push('a weekly public challenge');
  const pinBit = pins.length ? `, plus ${pins.join(' and ')}` : '';
  return {
    q: "What is The Scene (my home page)?",
    a: `Signing in lands you on The Scene — friends' wall posts, Discover, Your Booth${pinBit}. Vault and Activity are in the top nav. The skyline follows your local day/night and optional live weather.`,
  };
}

function livePinsFaq(flags: ConfigSurfaceFlags) {
  if (flags.houseBar && flags.weeklyChallenge) {
    return {
      q: "What are House bar of the day and the weekly challenge?",
      a: "Studio Ops pins them from Admin → Config (toggle + rewrite, no redeploy). House bar is one shared unfinished line for everyone to answer. The weekly challenge is a Scene-wide bar-count cypher (Monday reset) with your progress on the pin.",
    };
  }
  if (flags.houseBar) {
    return {
      q: "What is House bar of the day?",
      a: "One shared unfinished line pinned on The Scene for everyone to answer. Studio Ops can rewrite it anytime from Admin → Config.",
    };
  }
  return {
    q: "What is the weekly public challenge?",
    a: "A Scene-wide bar-count cypher (Monday reset) pinned on The Scene, with your progress on the pin. Studio Ops can rewrite or turn it off from Admin → Config.",
  };
}

function buildStudioFaqs(flags: ConfigSurfaceFlags) {
  const faqs = [sceneHomeFaq(flags)];
  if (flags.houseBar || flags.weeklyChallenge) faqs.push(livePinsFaq(flags));
  if (flags.lock) faqs.push(...LOCK_FAQS);
  faqs.push(...CORE_FAQS);
  if (flags.firstDrops) faqs.push(...FIRST_DROPS_FAQS);
  return faqs;
}

export function HowToUseDialog({ open, onOpenChange }: HowToUseDialogProps) {
  const { albums } = useContext(DataContext);
  const { toast } = useToast();
  const flags = useConfigSurfaceFlags();
  const faqs = useMemo(() => buildStudioFaqs(flags), [flags]);

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
            <DialogDescription className="font-tagline uppercase tracking-[0.3em] text-[10px] text-muted-foreground">Bar4Bar · Studio guide</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="start-here" className="flex-grow flex flex-col min-h-0">
          <div className="px-4 sm:px-8 border-b bg-muted/10 shrink-0">
            <TabsList className="bg-transparent h-11 sm:h-12 gap-4 sm:gap-8 overflow-x-auto justify-start w-full max-w-full flex-nowrap scrollbar-none">
              <TabsTrigger value="start-here" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">Start Here</TabsTrigger>
              {flags.firstDrops ? (
                <TabsTrigger value="first-drops" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px]">First Drops</TabsTrigger>
              ) : null}
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
                <ChapterCard icon={<Radio className="text-emerald-400" />} title="The Scene" colorClass="border-l-emerald-500 text-emerald-400">
                  <p className="text-sm text-foreground/90">
                    Your home after sign-in: wall posts, Discover, Your Booth, and a live skyline that follows
                    local day/night (and weather if you allow location once).
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                      <p className="font-bold text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                        <Archive className="h-3 w-3" /> Get around
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Top nav</strong> — Vault (sky) and Activity (emerald bell with unread badge).</li>
                        <li><strong>Dock</strong> — Vault{flags.firstDrops ? ', Library' : ''}, Keep writing | Start track, Artist Home | Edit page{flags.lock ? ', Finish this bar' : ''}, leaderboard, circle, Ink.</li>
                        <li><strong>Post</strong> — composer at the top; friends see it on their Scene. Hit <strong>Voice</strong> for a 60-second note — listeners tap Read / Listen to switch transcript and playback.</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                      <p className="font-bold text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                        <CloudSun className="h-3 w-3" /> Atmosphere
                      </p>
                      <p className="text-xs leading-relaxed">
                        Dawn → day → dusk → night from sunrise/sunset when weather loads, else your clock.
                        Location denied? Sky still flips; no rain/snow particles. Coords stay on-device only.
                      </p>
                    </div>
                  </div>
                </ChapterCard>

                {flags.lock ? (
                <ChapterCard icon={<Lock className="text-amber-300" />} title="Finish this bar" colorClass="border-l-amber-500 text-amber-300">
                  <p className="text-sm text-foreground/90">
                    Optional casts (Admin → Config → Finish this bar): drop one bar with no account → Fit score + share card.
                    Keep writing in Studio anytime. Sign in only to put your name on the reply.
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-xs">
                    <li><strong>After you drop</strong> — Keep writing in Studio, share your reply, or see all replies.</li>
                    <li><strong>Reply to this bar</strong> — answer someone else&apos;s line, not only the unfinished seed.</li>
                    <li><strong>Casting artists</strong> — Press Desk → Finish this bar; Manage → Pick, Clear for release, Close.</li>
                  </ul>
                </ChapterCard>
                ) : null}

                <ChapterCard icon={<MousePointer2 className="text-primary" />} title="Write in 60 seconds" colorClass="border-l-primary text-primary">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li><strong>Open a sheet</strong> — Vault, or Keep writing / Start track on the Scene dock.</li>
                    <li><strong>Paste or type</strong> — Smart Structure in the top bar, or write on the sheet.</li>
                    <li><strong>Generate one bar</strong> — select a line → Bar Workstation → Generate Next (~{AI_COSTS.generateNextLine} Ink).</li>
                  </ol>
                  <p className="text-xs border-l-2 border-primary/30 pl-3 italic">
                    Free: full DNA &amp; REMIX + system presets. Pro: your own vault strains + cloud sync. Edits auto-save; Export Track (left) for PDF.
                  </p>
                </ChapterCard>

                <div className="grid gap-4 md:grid-cols-2">
                  <ChapterCard icon={<Globe className="text-fuchsia-400" />} title="Artist Home" colorClass="border-l-fuchsia-500 text-fuchsia-400">
                    <p className="text-sm">
                      Completely free. Public page at <code className="text-primary">/profile/your-slug</code> — skin, modules, The Board,
                      embeds, wall, friends, guestbook, live DNA Drops. Off until you flip Public on. New pages often meet Neomaiya Sol first.
                      Pro is for studio tools, not this page.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scene dock: <strong>Artist Home | Edit page</strong> (one control). Also Booth, Vault dock, or Studio Progress → Sharing.
                    </p>
                  </ChapterCard>
                  <ChapterCard icon={<Bell className="text-emerald-400" />} title="Activity" colorClass="border-l-emerald-500 text-emerald-400">
                    <p className="text-sm">
                      Top-nav bell opens unread received activity — mark one or all read, or{' '}
                      <strong>View all</strong> for the full inbox at{' '}
                      <code className="text-primary">/activity</code>.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Full page tabs: Inbox · Requests · Sent. <strong>Open</strong> jumps to the post (and opens the reply if it was a comment). Notification prefs under Settings when push is enabled.
                    </p>
                  </ChapterCard>
                </div>

                <ChapterCard icon={<Trophy className="text-amber-400" />} title="Progress &amp; community" colorClass="border-l-amber-500 text-amber-400">
                  <ul className="list-disc list-inside space-y-1.5 text-sm">
                    <li><strong>Studio Progress</strong> — Vault sidebar / header menu; full board at <code className="text-primary">/studio-progress</code>.</li>
                    <li><strong>The Block</strong> — friends feed on The Scene; Your circle at <code className="text-primary">/friends</code>.</li>
                    <li><strong>Share card</strong> — Sharing &amp; visibility → foil milestone export. <strong>Refer a Friend</strong> — Ink Store, 150 Ink each (up to 4).</li>
                  </ul>
                </ChapterCard>

                <div className="grid gap-4 md:grid-cols-3">
                  <ChapterCard icon={<Radio className="text-emerald-400" />} title="Scene tour" colorClass="border-l-emerald-500 text-emerald-400">
                    <p className="text-sm">Walk The Scene again — wall, Booth, feed, Discover, and the dock.</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="font-bold uppercase text-[10px] tracking-widest gap-2 border-emerald-500/40 hover:bg-emerald-500/10"
                      onClick={handleReplaySceneTour}
                    >
                      <RefreshCw className="h-4 w-4" /> Replay Scene tour
                    </Button>
                  </ChapterCard>
                  <ChapterCard icon={<Compass className="text-green-500" />} title="Workstation tour" colorClass="border-l-green-500">
                    <p className="text-sm">Spotlight walkthrough of the lyrics page — paste, sheet, bar AI, DNA, DNA Drop (Pro), Ink.</p>
                    <Button type="button" className="font-bold uppercase text-[10px] tracking-widest gap-2" onClick={handleReplayWorkstationTour}>
                      <RefreshCw className="h-4 w-4" /> Replay tour
                    </Button>
                  </ChapterCard>
                  <ChapterCard icon={<CassetteTape className="text-sky-400" />} title="Vault tour" colorClass="border-l-sky-500 text-sky-400">
                    <p className="text-sm">Albums, create, loose tracks, progress, search, Ink — first visit auto-runs; replay anytime.</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="font-bold uppercase text-[10px] tracking-widest gap-2 border-sky-500/40 hover:bg-sky-500/10"
                      onClick={handleReplayVaultTour}
                    >
                      <RefreshCw className="h-4 w-4" /> Replay tour
                    </Button>
                  </ChapterCard>
                </div>

                <p className="text-[11px] text-muted-foreground font-code border border-border/40 rounded-lg px-3 py-2 bg-muted/10">
                  <Lightbulb className="inline h-3.5 w-3.5 mr-1.5 text-yellow-500 align-text-bottom" />
                  After your first tour, the lyrics page shows one Studio Insight or Did You Know tip per visit (45+ in the pool). Pause or dismiss anytime.
                </p>
              </TabsContent>

              {flags.firstDrops ? (
                <TabsContent value="first-drops" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <ChapterCard icon={<Music className="text-fuchsia-400" />} title="First Drops" colorClass="border-l-fuchsia-500 text-fuchsia-400">
                    <p className="text-sm text-foreground/90">{firstDropsPitch()}</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li><strong>Write the song</strong> in The Vault — lyrics, DNA, vibe as usual.</li>
                      <li><strong>DNA Drop</strong> on the track (or album) — confirm the lyric snapshot.</li>
                      <li><strong>First Drop · audio &amp; price</strong> — upload the file, pick DNA only / free stream / set price / pay-what-you-want (floor $1.00).</li>
                      <li><strong>Update snapshot</strong> so the public /share page has the audio. Fans preview 30 seconds, then buy or unlock to stream in-app.</li>
                      <li><strong>Fans find it</strong> on your Artist Home (First Drops strip at the top of the Drop Shelf) and as tagged First Drop cards on The Scene — they do not guess which DNA Drop has the song.</li>
                      <li><strong>Cash out</strong> — open Earnings, connect Stripe payouts, then Stripe sends your {dropArtistShareLabel()} share to your bank.</li>
                    </ol>
                    <ul className="list-disc list-inside space-y-1.5 text-xs">
                      <li><strong>Manage live ones</strong> from The Scene, Vault, or Edit Public Page → Live drops. DNA-only tracks have Add First Drop; live songs show under First Drops.</li>
                      <li><strong>Library</strong> on The Scene lists drops you unlocked. Stream stays in Bar 4 Bar.</li>
                      <li><strong>Heat</strong> — spins and unlocks count on the drop. An unlock bumps it back up on The Scene. First cop is credited on the page. Love, reply, share, or post it to your wall.</li>
                      <li><strong>Fee &amp; cash out</strong> — {firstDropsFeeCashoutLine()} Sales before you connect stay held until you finish setup. Ink is not used for music purchases.</li>
                      <li><strong>Admin</strong> can turn First Drops off from Config without taking DNA Drops down.</li>
                    </ul>
                  </ChapterCard>
                </TabsContent>
              ) : null}
              
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
                    <p>Studio Pro — open from the footer Bar Workstation. Speak your bars; tap <strong>Add to Editor</strong> to drop transcribed lines directly into the active section ({AI_COSTS.freestyleTranscription} Ink after a short pickup, not per clip).</p>
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
                    {flags.firstDrops ? (
                      <p className="text-xs text-muted-foreground">When First Drops is on, the same dialog has <strong>audio &amp; price</strong>. {firstDropsCashoutLine()}</p>
                    ) : null}
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
                                <p>• <strong>Takes:</strong> Above Draft Chest — record up to 3 vocal memos per track (5 minutes each) and play them back anytime.</p>
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
                        {faqs.map((faq, idx) => (
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
