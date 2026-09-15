'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/**
 * @fileOverview Studio Master Manual — spatial guide for Scene, Vault, workstation.
 * Start Here: first-hour path vs skip-for-later. Same screens — only the ask changes.
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
  getReferralFaqAnswer,
  getMusicReleaseTierFaqAnswer,
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
  ArrowRight,
  Palette,
  Shield,
  Wand2,
  NotebookText,
  HelpCircle,
  MonitorPlay,
  FilePenLine,
  RefreshCw,
  Dna,
  Fingerprint,
  MousePointer2,
  Clock,
  Star,
  Trophy,
  Lightbulb,
  FolderOpen,
  FlaskConical,
  ScanLine,
  Link2,
  Users,
  GitBranch,
  Settings,
  ListRestart,
  Radio,
  Bell,
  Archive,
  CloudSun,
  Search,
  X,
  Banknote,
  BadgeDollarSign,
  CircleDollarSign,
  Map,
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
import {
  DROP_PAID_MIN_CENTS,
  DROP_PRICE_PRESETS_CENTS,
  centsToUsdLabel,
  dropArtistNetCents,
  dropPlatformFeeCents,
  dropPlatformFeePercent,
  firstDropsFeeCashoutLine,
  firstDropsPitch,
  getFirstDropsCashoutFaqAnswer,
  getFirstDropsFeeFaqAnswer,
  getFirstDropsRightsFaqAnswer,
  getFirstDropsSellFaqAnswer,
  getFirstDropsWhatFaqAnswer,
} from '@/lib/drop-commerce';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { ManualPathDeck } from '@/components/manual-path-deck';

type ManualTab = 'paths' | 'start-here' | 'scene' | 'first-drops' | 'tiering' | 'loop' | 'power-tools' | 'panels' | 'faq';

interface HowToUseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: ManualTab;
}

const ChapterCard = ({ id, icon, title, children, colorClass }: { id?: string, icon: React.ReactNode, title: string, children: React.ReactNode, colorClass?: string }) => (
    <Card id={id} className={cn("scroll-mt-6 bg-card/50 border-border/50 shadow-sm overflow-hidden border-l-4", colorClass)}>
        <CardHeader className="pb-4 bg-muted/20 border-b border-border/10">
            <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-xl border", colorClass?.replace('border-l-4', 'bg-opacity-10'))}>{icon}</div>
                <CardTitle className={cn("font-headline text-2xl font-bold", colorClass?.replace('border-l-4', 'text'))}>{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="font-code text-sm text-muted-foreground pt-6 space-y-4 leading-relaxed">{children}</CardContent>
    </Card>
);

type ManualSearchItem = {
  label: string;
  detail: string;
  tab: ManualTab;
  targetId: string;
  keywords?: string;
};

const PRECISION_TOOL_GLOSSARY: ManualSearchItem[] = [
  { label: 'In-line generation', detail: 'Generate a bar', tab: 'power-tools', targetId: 'manual-inline-generation', keywords: 'sheet hover next previous line' },
  { label: 'Bar Workstation', detail: 'Generate a bar', tab: 'power-tools', targetId: 'manual-bar-workstation', keywords: 'footer end with suggestions' },
  { label: 'Co-Writer', detail: 'Generate a bar', tab: 'power-tools', targetId: 'manual-co-writer', keywords: 'right panel rails' },
  { label: 'Smart Structure', detail: 'Sheet & Structure', tab: 'power-tools', targetId: 'manual-smart-structure', keywords: 'paste lyrics sections' },
  { label: 'Rhyme Pulse', detail: 'Sheet & Structure', tab: 'power-tools', targetId: 'manual-rhyme-pulse', keywords: 'phonetic scan rhyme' },
  { label: 'Editing & Undo', detail: 'Sheet & Structure', tab: 'power-tools', targetId: 'manual-sheet-editing', keywords: 'enter backspace history' },
  { label: 'DNA Suite', detail: 'Right Panel', tab: 'power-tools', targetId: 'manual-dna-suite', keywords: 'world emotion trigger message tone' },
  { label: 'Intents', detail: 'Right Panel', tab: 'power-tools', targetId: 'manual-intents', keywords: 'punchline precision lock' },
  { label: 'Guardrails', detail: 'Right Panel', tab: 'power-tools', targetId: 'manual-guardrails', keywords: 'forbidden must include words' },
  { label: 'Track Vibe', detail: 'Right Panel', tab: 'power-tools', targetId: 'manual-track-vibe', keywords: 'genre bpm instrumentation vault' },
  { label: 'Style DNA', detail: 'Right Panel', tab: 'power-tools', targetId: 'manual-style-dna', keywords: 'train vocabulary flow' },
  { label: 'Creative Effects', detail: 'Right Panel', tab: 'power-tools', targetId: 'manual-creative-effects', keywords: 'simile metaphor twist scratch pad' },
  { label: 'Seed DNA & REMIX', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-seed-remix', keywords: 'paste sync extract source' },
  { label: 'Analysis Step', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-analysis-step', keywords: 'save inject strain paths' },
  { label: 'DNA Extraction', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-dna-extraction', keywords: 'overview analysis synthesis' },
  { label: 'Calibration Hub', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-calibration-hub', keywords: 'insights vault structure synthesis' },
  { label: 'Special Instructions', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-special-instructions', keywords: 'brief constraints tone pov' },
  { label: 'Remix Paths', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-remix-paths', keywords: 'influence sliders forks' },
  { label: 'Creative Syncing', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-creative-syncing', keywords: 'synthesis overlay' },
  { label: 'DNA Vault & Mixer', detail: 'DNA & Remix', tab: 'power-tools', targetId: 'manual-dna-vault', keywords: 'save load profile strains' },
  { label: 'Studio Draft', detail: 'Generation & Capture', tab: 'power-tools', targetId: 'manual-studio-draft', keywords: 'full song sections generation workstation' },
  { label: 'Freestyle Pad', detail: 'Generation & Capture', tab: 'power-tools', targetId: 'manual-freestyle-pad', keywords: 'voice speak transcribe' },
  { label: 'Vibe Suggester', detail: 'Generation & Capture', tab: 'power-tools', targetId: 'manual-vibe-suggester', keywords: 'analyze genre bpm instrumentation' },
  { label: 'Performance Mode', detail: 'Export & Share', tab: 'power-tools', targetId: 'manual-performance-mode', keywords: 'teleprompter rehearsal' },
  { label: 'Lyrics DNA Drop', detail: 'Export & Share', tab: 'power-tools', targetId: 'manual-dna-drop', keywords: 'share lyric snapshot' },
  { label: 'Collab Sheet', detail: 'Export & Share', tab: 'power-tools', targetId: 'manual-collab-sheet', keywords: 'live editing invite chat' },
  { label: 'Export & Backup', detail: 'Export & Share', tab: 'power-tools', targetId: 'manual-export-backup', keywords: 'pdf json vault download' },
];

const FIRST_DROP_PRICE_EXAMPLES = DROP_PRICE_PRESETS_CENTS.map((amountCents) => ({
  amountCents,
  feeCents: dropPlatformFeeCents(amountCents),
  artistCents: dropArtistNetCents(amountCents),
  feePercent: dropPlatformFeePercent(amountCents),
}));

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
      q: "What is Press / Release tracking on album sheets?",
      a: "Optional personal stages on each sheet: Beat, Writing, Recorded, Mixed, Mastered, Artwork, Released. Change the stage on the album tracklist or in Track Status. Search and sort by name, date created, last edited, or % finished (ascending or descending). This is not Press live (audio) and not Lyrics DNA Drop. Turn it off in Settings → Press / Release tracking, or with the switch on that album. Public identity labels (Producer, Music Fan, and so on) do not change the stages — one list for every account.",
    },
    {
      q: "How do I add several blank sheets to an album?",
      a: "Open a created album → Add sheets. Name them in the list (or leave untitled) and they stay on that album. Press Enter in a name box to jump to the next sheet. Vault → Create New → Blank Loose Sheets does the same for loose vault tracks. You can also rename from the tracklist pencil without opening the sheet. Add Track still creates one sheet and opens it. Visitor accounts stay at 1 album / 2 editable sheets.",
    },
    {
      q: "What is Msgs?",
      a: "Private messages between friends. Amber message icon in the header, or account menu → Msgs. Send from a friend's public music home or Your circle. Stored on our servers so the inbox works—not end-to-end encrypted.",
    },
    {
      q: "What is my public music home and Edit Public Page?",
      a: "Your public music home is completely free—no Pro required to claim or go live. It uses the clean link /your_slug and supports Artist, Songwriter, Producer, Engineer, DJ, and Music Fan labels, Sound Identity, a featured owned/purchased track, skin, modules, The Board, embeds, socials, wall, friends, guestbook, and live Lyrics DNA Drops. On the Scene dock, Artist Home | Edit page is one split control—view live or customize. Private by default; never shows private lyrics unless you publish a Lyrics DNA Drop."
    },
    {
      q: "What is The Block?",
      a: "The Block is your friends feed on The Scene—wall posts, requests, and Discover when your circle is quiet. Search music people to invite, or copy your referral link. Your circle (/friends) lists friends and blocked accounts."
    },
    {
      q: "What is The Imprint on Your Booth?",
      a: "In Your Booth composer, tap Imprint to turn your post into a live quote card — fonts, color, highlights, and backdrop pressed from what you type. Free accounts get one look per bar; Studio Pro unlocks faders, shuffle, and five lockable style slots."
    },
    {
      q: "How do I post lines from the sheet to The Block?",
      a: "On a lyrics sheet, use the line number itself (01, 02, 04…) — not the words. Right-click it, or press and hold for about half a second. A dialog lets you pick the range and style, then post. A normal tap on the number still does nothing. Guests can open it; posting needs a signed-in account.",
    },
    {
      q: "Why does the Scene sky change?",
      a: "The skyline follows live weather near you — rain, snow, fog, storms — with day/dawn/dusk/night. At night the moon uses tonight’s real phase and brightness (hover it to see the name). If the moon has already set, it still sits in the sky with that same illumination. Meteor showers and rare eclipses appear when they are actually happening for your sky; shooting stars drift on clear nights. Buildings stay solid silhouettes (not see-through). No location popup. If the browser already allowed location we use that; otherwise a rough city from your IP. NYC only if we cannot tell where you are. Clock-only sky if weather itself is down."
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
      a: "Generation Workstation → DNA & REMIX → paste or Sync Current Lyrics → extract. On Analysis Step, Save DNA Profile archives everything. ⚡ on a strain injects just that field into this remix. DNA Suite also lets you type or edit the five questions (world, emotion, trigger, message, tone) after load/extract. On an album page, Pro can Extract Album DNA to fill World Building / Emotional Core / Message Truth from all tracks, then Save / Load those profiles."
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
      a: "No — those render audio. AKAsheet is your rhyme book and DNA workstation. Ink powers lyric intelligence, not song audio."
    },
    {
      q: "How do I save a Vibe?",
      a: "Right Panel → Track Vibe → folder icon opens the Vibe Vault. Save instrumentation and BPM for reuse across the project."
    },
    {
      q: "Where do I generate a bar?",
      a: "Two places to generate a bar: in-line hover on the sheet, and the Bar Workstation footer. The right panel is Co-Writer — DNA, Vibe, Intents, Guardrails, Style DNA. Those are rails the generators read, not a third generate button."
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
      q: "Do Loves earn Ink?",
      a: "Yes—every 20 verified Loves received across your posts, comments, and music releases earns 2 permanent Ink. You receive an unread Activity notification when the reward lands. Removing and re-adding the same Love does not count twice."
    },
    {
      q: "How does Refer a Friend work?",
      a: getReferralFaqAnswer()
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
      a: "Writing boards show display name, rank, XP, bars (7 days), streak, and tracks completed—never lyrics. Emerging (7d) separately shows its public momentum score, signal counts, and reasons without dollar, Ink, Pro, ad, or sponsorship points. Opt in via Studio Progress → Sharing. Your public music home is off by default and never shows private lyrics unless you publish a Lyrics DNA Drop."
    },
    {
      q: "What is Lyrics DNA Drop?",
      a: "Studio Pro—publish a shareable lyric snapshot from the left panel. Viewing, downloading, and importing Lyrics DNA Drops are also Pro: guests are sent to sign in (check tier, upgrade, or create an account); Visitor members land on Studio Tier with the Lyrics DNA Drop perk highlighted. Recipients import lyrics, structure, Creative DNA, vibe, and strains. Live lyric drops list on your Artist Home. Update snapshot after edits; Take offline to revoke. Music is separate and Free: use Release song from a sheet or New release on The Scene. Lyrics DNA Drop is not the sell desk."
    },
    {
      q: "What is Collab Sheet?",
      a: "Studio Pro — share a live editable lyric sheet on a track with friends. Everyone on the sheet sees edits in real time, a 2/13-style presence chip (live of shared), in-sheet chat at the bottom, and activity alerts when someone writes 4+ new bars or changes structure. Only the owner can invite or revoke access. Lyrics DNA Drop is a snapshot import; Collab Sheet is the same room."
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
      q: "What is included in a Lyrics DNA Drop?",
      a: "Lyrics & sections, Creative DNA, checked intents, vibe, guardrails, special instructions, and Style DNA when toggled on. Album drops add album DNA presets and motifs. Optional links and embeds attach from the Lyrics DNA Drop dialog. Audio and pricing belong to Releases—use New release or Release Catalog, not the Lyrics DNA Drop dialog.",
    },
    {
      q: "Is my Lyrics DNA Drop live-synced when I edit?",
      a: "No — it's the last published snapshot. After changes, open Lyrics DNA Drop → Update snapshot (same URL). Until then, shared links keep the previous version."
    },
    {
      q: "How do I unshare or take a Lyrics DNA Drop offline?",
      a: "Lyrics DNA Drop (track left panel or album page) → Take offline. The public link stops immediately. Publish again later with Confirm Lyrics DNA Drop."
    },
    {
      q: "Why did light mode follow me off the lyrics sheet?",
      a: "It should not. Light / dark / system on the sun-moon icon is sheet-only. Vault, albums, and The Scene stay on the studio dark theme. Open the same track again and your sheet choice comes back."
    },
    {
      q: "What is the eye count on my wall post?",
      a: "Only you see it, on posts and reverbs you posted. The eye is unique people who actually viewed it. The people icon is loves + replies. Visitors do not see these numbers."
    }
];

const FIRST_DROPS_FAQS = [
  {
    q: "What is a Release?",
    a: getFirstDropsWhatFaqAnswer(),
  },
  {
    q: "How do I publish a Release?",
    a: getFirstDropsSellFaqAnswer(),
  },
  {
    q: "Do I need Pro to publish a song or album?",
    a: getMusicReleaseTierFaqAnswer(),
  },
  {
    q: "Do I keep the rights to my music?",
    a: getFirstDropsRightsFaqAnswer(),
  },
  {
    q: "What does AKAsheet keep on a Release sale?",
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
    a: `Signing in lands you on The Scene — friends' wall posts, Discover, Your Booth${pinBit}. Vault and Activity are in the top nav. The skyline follows live weather near you (NYC only if we cannot read a location).`,
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

export function HowToUseDialog({ open, onOpenChange, initialTab = 'start-here' }: HowToUseDialogProps) {
  const { albums } = useContext(DataContext);
  const { toast } = useToast();
  const flags = useConfigSurfaceFlags();
  const faqs = useMemo(() => buildStudioFaqs(flags), [flags]);
  const [activeTab, setActiveTab] = useState<ManualTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  const searchItems = useMemo<ManualSearchItem[]>(() => [
    { label: 'Paths', detail: 'One job, that screen, then start the coach', tab: 'paths', targetId: 'manual-paths', keywords: 'write lyrics press song live new release vault sheet post clip go public dna drop discover library earnings ink refer the pressing' },
    { label: 'Start here', detail: 'First-hour walkthrough', tab: 'start-here', targetId: 'manual-start-here', keywords: 'begin new artist write first track tour scene vault' },
    { label: 'Public identity', detail: 'Artist, creator, and Music Fan labels', tab: 'scene', targetId: 'manual-public-identity', keywords: 'artist songwriter producer engineer dj music fan profile sound identity genre mood influence region collaboration' },
    { label: 'Featured Library track', detail: 'Owned or purchased music on your profile', tab: 'scene', targetId: 'manual-featured-track', keywords: '30 second excerpt preview purchased song music fan buy full stream public page' },
    { label: 'Discover matches', detail: 'Taste, craft, and new public profiles', tab: 'scene', targetId: 'manual-discovery', keywords: 'for your taste craft new live genre mood influence region why matched private lyrics' },
    { label: 'Follow, Inner Circle, and Friends', detail: 'The three relationship levels', tab: 'scene', targetId: 'manual-relationships', keywords: 'support circle followers supporters friend collaboration messages inner circle' },
    { label: 'Listener Insights', detail: 'Qualified release listening and conversions', tab: 'scene', targetId: 'manual-listener-insights', keywords: '80 percent repeat completion purchase source analytics private creator' },
    { label: 'Emerging (7d)', detail: 'Transparent momentum ranking', tab: 'scene', targetId: 'manual-emerging', keywords: 'leaderboard score qualified listeners follows inner circle buyer conversions fair no pay rank' },
    { label: 'Blank sheets & Press tracking', detail: 'Name album sheets and optional Beat → Released stages', tab: 'scene', targetId: 'manual-album-sheets', keywords: 'blank tracklist add sheets press release tracking beat writing recorded mixed mastered artwork released sort search percent finished settings toggle off album' },
    { label: 'Safe Vault backup', detail: 'Versioned export and merge-only restore', tab: 'scene', targetId: 'manual-vault-backup-v2', keywords: 'portable export import restore version 2 collision copy non destructive style profile legacy' },
    { label: 'Sell your music', detail: 'Release setup, pricing, fees, and payouts', tab: 'first-drops', targetId: 'manual-selling-overview', keywords: 'sell song audio price pay what you want release stripe earnings cash out' },
    { label: 'Release pricing options', detail: 'Fixed price and pay-what-you-want', tab: 'first-drops', targetId: 'manual-selling-pricing', keywords: 'minimum floor suggested fee 1.99 2.99 4.99 7.77' },
    { label: 'Release fees', detail: 'Platform fee and artist share examples', tab: 'first-drops', targetId: 'manual-selling-fees', keywords: '25 percent 15 percent 10 percent stripe processing split' },
    { label: 'Release payouts', detail: 'Stripe connection, held sales, and Earnings', tab: 'first-drops', targetId: 'manual-selling-payouts', keywords: 'bank connect cash out sales details origin timestamp' },
    { label: 'Studio tiers', detail: 'Visitor and Studio Pro', tab: 'tiering', targetId: 'manual-studio-tiers', keywords: 'free pro monthly yearly price limits' },
    { label: 'Ink economy', detail: 'Residency and Raw Ink', tab: 'tiering', targetId: 'manual-ink-economy', keywords: 'credits fuel balance refill permanent' },
    { label: 'The Infinity Loop', detail: 'Extract, archive, calibrate, and sync', tab: 'loop', targetId: 'manual-infinity-loop', keywords: 'method workflow dna' },
    ...PRECISION_TOOL_GLOSSARY,
    { label: 'Workstation map', detail: 'Left, center, and right panels', tab: 'panels', targetId: 'manual-workstation-map', keywords: 'where location controls' },
    ...faqs.map((faq, idx) => ({
      label: faq.q,
      detail: 'Studio FAQ',
      tab: 'faq' as const,
      targetId: `manual-faq-${idx}`,
      keywords: faq.a,
    })),
  ], [faqs]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (query.length < 2) return [];
    return searchItems
      .filter((item) => `${item.label} ${item.detail} ${item.keywords || ''}`.toLocaleLowerCase().includes(query))
      .slice(0, 8);
  }, [searchItems, searchQuery]);

  const scrollToManualTarget = useCallback((tab: ManualTab, targetId: string) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, []);

  const chooseSearchResult = useCallback((item: ManualSearchItem) => {
    setSearchQuery('');
    scrollToManualTarget(item.tab, item.targetId);
  }, [scrollToManualTarget]);

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
        <DialogHeader className="relative z-[90] p-4 sm:p-8 pb-4 border-b bg-background/80 backdrop-blur-md shrink-0">
            <DialogTitle className="font-headline text-2xl sm:text-4xl flex items-center gap-3 font-bold">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary shrink-0" /> Studio Master Manual
            </DialogTitle>
            <DialogDescription className="font-tagline uppercase tracking-[0.3em] text-[10px] text-muted-foreground">AKAsheet · Put Your World Within Reach</DialogDescription>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchResults[0]) {
                    event.preventDefault();
                    chooseSearchResult(searchResults[0]);
                  }
                }}
                placeholder="Search tools, selling, Ink, sharing, or a question..."
                aria-label="Search the Studio Master Manual"
                className="h-10 pl-10 pr-10 bg-muted/20 border-border/60 font-code text-xs"
              />
              {searchQuery ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear manual search"
                  className="absolute right-1 top-1/2 mt-1 h-8 w-8 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
              {searchQuery.trim().length >= 2 ? (
                <div className="isolate absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[100] max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl">
                  {searchResults.length ? searchResults.map((item) => (
                    <button
                      key={`${item.tab}-${item.targetId}`}
                      type="button"
                      className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => chooseSearchResult(item)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">{item.label}</span>
                        <span className="block truncate text-[10px] uppercase tracking-widest text-muted-foreground">{item.detail}</span>
                      </span>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    </button>
                  )) : (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">No manual sections match that search.</p>
                  )}
                </div>
              ) : null}
            </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ManualTab)} className="flex-grow flex flex-col min-h-0">
          <div className="px-4 sm:px-8 border-b bg-muted/10 shrink-0">
            <TabsList className="flex h-auto min-h-11 w-full max-w-full flex-wrap items-end justify-start gap-x-4 gap-y-0 sm:gap-x-6 overflow-visible rounded-none bg-transparent p-0 no-scrollbar">
              <TabsTrigger value="paths" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Paths</TabsTrigger>
              <TabsTrigger value="start-here" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Start Here</TabsTrigger>
              <TabsTrigger value="scene" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Scene &amp; Profile</TabsTrigger>
              <TabsTrigger value="first-drops" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Sell Your Music</TabsTrigger>
              <TabsTrigger value="tiering" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Studio Tiers</TabsTrigger>
              <TabsTrigger value="loop" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">The ∞ Loop</TabsTrigger>
              <TabsTrigger value="power-tools" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Precision Tools</TabsTrigger>
              <TabsTrigger value="panels" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Workstation Map</TabsTrigger>
              <TabsTrigger value="faq" className="data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary px-0 font-bold uppercase tracking-widest text-[10px] shrink-0">Studio FAQ</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-grow p-4 sm:p-8 min-h-0">
            <div className="max-w-4xl mx-auto space-y-12 pb-12">

              <TabsContent id="manual-paths" value="paths" className="mt-0 scroll-mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ManualPathDeck onLeave={() => onOpenChange(false)} />
              </TabsContent>

              <TabsContent id="manual-start-here" value="start-here" className="mt-0 scroll-mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard icon={<Map className="text-cyan-300" />} title="Paths" colorClass="border-l-cyan-400 text-cyan-300">
                  <p className="text-sm text-foreground/90">
                    One job at a time: the screen, where it lives, and the steps. Write lyrics (Vault) and Press a song (Scene → New release) are different jobs — they are not nested.
                  </p>
                  <Button type="button" size="sm" className="h-8 font-bold uppercase" onClick={() => setActiveTab('paths')}>
                    Open Paths
                  </Button>
                </ChapterCard>

                <ChapterCard icon={<Radio className="text-emerald-400" />} title="The Scene" colorClass="border-l-emerald-500 text-emerald-400">
                  <p className="text-sm text-foreground/90">
                    You land here after sign-in. Do not stay. Open a sheet and write a bar — that is the first hour.
                    Weather, Discover, and the wall can wait.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                      <p className="font-bold text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                        <Archive className="h-3 w-3" /> Do this
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Keep writing / Start track</strong> on the dock — or Vault in the top nav (sky icon).</li>
                        <li>Then the 3 steps in <strong>Write in 60 seconds</strong> below. That is the whole start.</li>
                        <li><strong>Skip for now:</strong> Msgs, Activity bell, Library, leaderboard, circle, Ink store, posting to the wall.</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                      <p className="font-bold text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                        <CloudSun className="h-3 w-3" /> Skip — sky
                      </p>
                      <p className="text-xs leading-relaxed">
                        The skyline follows weather near you. It is scenery, not a setting you configure. Leave it.
                      </p>
                    </div>
                  </div>
                </ChapterCard>

                {flags.lock ? (
                <ChapterCard icon={<Lock className="text-amber-300" />} title="Finish this bar" colorClass="border-l-amber-500 text-amber-300">
                  <p className="text-sm text-foreground/90">
                    Skip this until you have written on a sheet. Optional public casts — not how you start.
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-xs">
                    <li><strong>Later:</strong> drop one bar, get a Fit score + share card. Sign in only to put your name on a reply.</li>
                    <li><strong>Reply to this bar</strong> — answer someone else&apos;s line, not only the unfinished seed.</li>
                    <li><strong>Casting artists</strong> — Press Desk → Finish this bar; Manage → Pick, Clear for release, Close.</li>
                  </ul>
                </ChapterCard>
                ) : null}

                <ChapterCard icon={<MousePointer2 className="text-primary" />} title="Write in 60 seconds" colorClass="border-l-primary text-primary">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li><strong>Open a sheet</strong> — Vault, or Keep writing / Start track on the Scene dock.</li>
                    <li><strong>Paste or type</strong> — Smart Structure in the top bar, or write on the sheet. One line is enough.</li>
                    <li><strong>Generate one bar</strong> — tap that line → Bar Workstation at the bottom → Generate Next (~{AI_COSTS.generateNextLine} Ink).</li>
                  </ol>
                  <p className="text-xs border-l-2 border-primary/30 pl-3 italic">
                    Skip until you have a bar: Generation Workstation, Lyrics DNA Drop, Collab Sheet, Release song, Creative Effects, Takes, export, the sun/moon theme toggle. Co-Writer rails (DNA, Vibe, Intents, Style DNA) are optional—flip a switch on only if you want Next to follow it.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    When you sell or share later: <strong>Release song</strong> = audio + price. <strong>Lyrics DNA Drop</strong> = an opt-in lyric snapshot (Studio Pro to view or import; not your Vault). They are separate.
                  </p>
                </ChapterCard>

                <div className="grid gap-4 md:grid-cols-2">
                  <ChapterCard icon={<Globe className="text-fuchsia-400" />} title="Artist Home" colorClass="border-l-fuchsia-500 text-fuchsia-400">
                    <p className="text-sm">
                      Skip until you have something to show. Free public page — off until you flip Public on. Pro is for studio tools, not this page.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      When you are ready: Scene dock <strong>Artist Home | Edit page</strong>. Same control from Your Booth.
                    </p>
                  </ChapterCard>
                  <ChapterCard icon={<Bell className="text-emerald-400" />} title="Activity" colorClass="border-l-emerald-500 text-emerald-400">
                    <p className="text-sm">
                      Skip until someone replies, requests, or imports. The top-nav bell is not your writing desk.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Later: unread in the bell, or <strong>View all</strong> at <code className="text-primary">/activity</code> — Inbox · Requests · Sent.
                    </p>
                  </ChapterCard>
                </div>

                <ChapterCard icon={<Trophy className="text-amber-400" />} title="Progress &amp; community" colorClass="border-l-amber-500 text-amber-400">
                  <p className="text-sm text-foreground/90">Skip this block until you have written a few bars. XP follows the sheet automatically.</p>
                  <ul className="list-disc list-inside space-y-1.5 text-sm">
                    <li><strong>Studio Progress</strong> — later, Vault sidebar or <code className="text-primary">/studio-progress</code>.</li>
                    <li><strong>The Block</strong> — later, friends feed on The Scene; circle at <code className="text-primary">/friends</code>.</li>
                    <li><strong>Share card / Refer a Friend</strong> — later. Ink Store; your friend gets welcome Ink plus a referral bonus, and your reward unlocks after their first 50 Ink of legitimate AI use.</li>
                  </ul>
                </ChapterCard>

                <div className="grid gap-4 md:grid-cols-3">
                  <ChapterCard icon={<Radio className="text-emerald-400" />} title="Scene tour" colorClass="border-l-emerald-500 text-emerald-400">
                    <p className="text-sm">Optional. Replay if you want the wall, Booth, feed, Discover, and dock pointed out. Not required to write.</p>
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
                    <p className="text-sm">This is the one to take after you open a sheet—sheet, Next/Previous, Co-Writer, Structure, Release song, Ink.</p>
                    <Button type="button" className="font-bold uppercase text-[10px] tracking-widest gap-2" onClick={handleReplayWorkstationTour}>
                      <RefreshCw className="h-4 w-4" /> Replay tour
                    </Button>
                  </ChapterCard>
                  <ChapterCard icon={<CassetteTape className="text-sky-400" />} title="Vault tour" colorClass="border-l-sky-500 text-sky-400">
                    <p className="text-sm">Optional. Albums and loose tracks. First vault visit already auto-runs it — skip replay unless you want it again.</p>
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

                <ChapterCard icon={<CassetteTape className="text-sky-300" />} title="Blank sheets &amp; Press tracking" colorClass="border-l-sky-400 text-sky-300">
                  <p className="text-sm">
                    Inside a created album, <strong>Add sheets</strong> drops empty lyric pages you name in a list — they stay on the album. Optional <strong>Press / Release</strong> stages (Beat → Writing → Recorded → Mixed → Mastered → Artwork → Released) show progress. Turn them off in Settings or on that album. Search and sort the tracklist. This is not Press live or Lyrics DNA Drop.
                  </p>
                </ChapterCard>

                <p className="text-[11px] text-muted-foreground font-code border border-border/40 rounded-lg px-3 py-2 bg-muted/10">
                  <Lightbulb className="inline h-3.5 w-3.5 mr-1.5 text-yellow-500 align-text-bottom" />
                  After your first tour, the lyrics page may show one tip per visit. Pause or dismiss — you do not have to follow it.
                </p>
              </TabsContent>

              <TabsContent value="scene" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-16">
                <ChapterCard id="manual-public-identity" icon={<Globe className="text-fuchsia-400" />} title="Your Public Music Identity" colorClass="border-l-fuchsia-500 text-fuchsia-400">
                  <p className="text-sm text-foreground/90">
                    AKAsheet is not artists-only. In <strong>Edit Public Page</strong>, choose up to three labels: Artist, Songwriter, Producer, Engineer, DJ, or Music Fan. These are public profile labels, not security permissions or subscription tiers.
                  </p>
                  <p className="text-xs">Add public genres, moods, influences, region, collaboration status, and current focus. Those choices power explainable Discover matches; private lyrics and DNA never do.</p>
                  <Button asChild variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]">
                    <Link href="/profile/customize"><Globe className="mr-2 h-4 w-4" /> Edit Public Page</Link>
                  </Button>
                </ChapterCard>

                <ChapterCard id="manual-featured-track" icon={<Music className="text-fuchsia-300" />} title="Feature an Owned or Purchased Track" colorClass="border-l-fuchsia-500 text-fuchsia-300">
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Open <strong>Edit Public Page</strong> and find the featured Library track control.</li>
                    <li>Choose a release you published or purchased from another artist.</li>
                    <li>Pick the exact start of the 30-second public excerpt, build the showcase, then save.</li>
                  </ol>
                  <p className="text-xs">Visitors who do not own the track hear your excerpt and see Buy. The owner and purchasers get the full stream after AKAsheet checks entitlement. Music Fans can use this to put a purchased favorite on their profile.</p>
                </ChapterCard>

                <ChapterCard id="manual-discovery" icon={<Compass className="text-sky-400" />} title="Discover by Taste, Craft, or What Is New" colorClass="border-l-sky-500 text-sky-400">
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>For your taste</strong> matches public genres, moods, influences, and region.</li>
                    <li><strong>For your craft</strong> matches public roles and collaboration choices.</li>
                    <li><strong>New &amp; live</strong> shows the newest public activity without personalization.</li>
                    <li><strong>Knock</strong> on <strong>Recently live</strong> Artist Homes. Each door: up to <strong>5 visitors</strong> and <strong>15 knocks</strong> per day (3 from you). The card shows a small tally — visitors and knocks at their door, plus your knocks there. Artists collect knocks when they open their own public home; if they are already home, they get a live <strong>Say hello</strong> prompt and it still saves to Activity.</li>
                  </ul>
                  <p className="text-xs">Every personalized card explains why it matched. Money, Ink, Pro status, sales totals, private writing, and private listening history cannot buy placement.</p>
                  <Button asChild variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]">
                    <Link href="/discover"><Compass className="mr-2 h-4 w-4" /> Open Discover</Link>
                  </Button>
                </ChapterCard>

                <ChapterCard id="manual-relationships" icon={<Users className="text-emerald-400" />} title="Follow, Inner Circle, and Friends" colorClass="border-l-emerald-500 text-emerald-400">
                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3"><strong className="text-foreground">Follow</strong><br />One-way support. It does not open collaboration or Msgs.</div>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3"><strong className="text-foreground">Inner Circle</strong><br />A stronger supporter signal, still separate from friendship.</div>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3"><strong className="text-foreground">Friends</strong><br />Reciprocal connection used for collaboration and Msgs.</div>
                  </div>
                  <p className="text-xs">Manage supporters and people you support in Support Circle. Blocks prevent new relationship actions.</p>
                  <Button asChild variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]">
                    <Link href="/supporters"><Users className="mr-2 h-4 w-4" /> Open Support Circle</Link>
                  </Button>
                </ChapterCard>

                <ChapterCard id="manual-listener-insights" icon={<Radio className="text-cyan-400" />} title="Qualified Listener Insights" colorClass="border-l-cyan-500 text-cyan-400">
                  <p className="text-sm">Listener Insights is the creator-only release dashboard for historical starts and sales plus verified qualified listeners, repeats, completions, sources, timeline, and track summaries.</p>
                  <p className="text-xs">Existing preview/full starts and purchases appear retroactively. They stay separate from qualified listens because only playback recorded with proof of reaching 80% can qualify. Your own verified plays do not count, and listener identities stay private.</p>
                  <Button asChild variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]">
                    <Link href="/insights"><Radio className="mr-2 h-4 w-4" /> Open Listener Insights</Link>
                  </Button>
                </ChapterCard>

                <ChapterCard id="manual-emerging" icon={<Trophy className="text-amber-400" />} title="Emerging (7d): Momentum You Can Explain" colorClass="border-l-amber-500 text-amber-400">
                  <p className="text-sm">Leaderboard keeps the writing-progress boards and adds <strong>Emerging (7d)</strong> for public music momentum. Each entry shows its score, signal counts, and reasons.</p>
                  <p className="text-xs">Qualified listening, repeats, follows, Inner Circle joins, shared-listen conversions, and unique buyer conversions can add points. Dollar amount, Ink, Pro, ads, and sponsorship cannot.</p>
                  <Button asChild variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]">
                    <Link href="/leaderboard"><Trophy className="mr-2 h-4 w-4" /> View Emerging</Link>
                  </Button>
                </ChapterCard>

                <ChapterCard id="manual-album-sheets" icon={<CassetteTape className="text-sky-300" />} title="Blank Sheets &amp; Press / Release Tracking" colorClass="border-l-sky-400 text-sky-300">
                  <p className="text-sm">
                    Open any created album. <strong>Add Track</strong> still makes one sheet and opens it. <strong>Add sheets</strong> drops one or more blank lyric pages onto that album so you can name them in the list and keep working the tracklist.
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-sm">
                    <li><strong>Rename in place</strong> — pencil on a row, or change the title in Track Status on the sheet.</li>
                    <li><strong>Search</strong> the album list by title, genre, mood, or stage.</li>
                    <li><strong>Sort</strong> by album order, name, date created, last edited, or % finished — then flip ascending or descending. Manual up/down reorder only works in album order with an empty search.</li>
                    <li><strong>Press / Release tracking</strong> is a personal checklist: Beat, Writing, Recorded, Mixed, Mastered, Artwork, Released. Same stages for every account — public identity labels do not change them.</li>
                    <li><strong>Turn it off or on</strong> in Settings → Press / Release tracking (default for albums that have not set their own switch), or with the switch on that album page. The sheet also shows the stage under Track Status when tracking is on.</li>
                  </ul>
                  <p className="text-xs border-l-2 border-sky-400/40 pl-3">
                    Released here means “this idea is ready or already out” on your checklist. It does not press audio live and it is not a Lyrics DNA Drop.
                  </p>
                </ChapterCard>

                <ChapterCard id="manual-vault-backup-v2" icon={<Archive className="text-violet-300" />} title="Versioned, Non-Destructive Vault Backup" colorClass="border-l-violet-500 text-violet-300">
                  <p className="text-sm">Open <strong>The Vault → Download</strong>, then choose <strong>Studio Blueprint (.json)</strong> for a fast writing/settings backup or <strong>Full Vault Archive (.zip)</strong> for the blueprint plus owned song files, previews, Sheet Takes, and cover artwork.</p>
                  <ul className="list-disc list-inside space-y-1.5 text-xs">
                    <li><strong>Restore:</strong> return to The Vault, tap Import, choose the JSON or ZIP, review the preview, and tap Import.</li>
                    <li>Import merges; it never removes or overwrites current projects.</li>
                    <li>ID conflicts become clearly named imported copies.</li>
                    <li>Media from a Full Vault Archive is uploaded to fresh private paths owned by the signed-in account.</li>
                    <li>Legacy backups remain supported; unknown future versions and malformed files are rejected.</li>
                    <li>Your existing Style Profile wins if one is already present.</li>
                  </ul>
                  <Button asChild variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px]">
                    <Link href="/vault"><Archive className="mr-2 h-4 w-4" /> Open The Vault</Link>
                  </Button>
                </ChapterCard>
              </TabsContent>

              <TabsContent value="first-drops" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-16">
                <ChapterCard id="manual-selling-overview" icon={<Music className="text-fuchsia-400" />} title="Publish and Sell Music Releases" colorClass="border-l-fuchsia-500 text-fuchsia-400">
                  {!flags.firstDrops ? (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                      Music releases are currently paused by Studio Ops. Existing sales remain saved; release controls return when the feature is switched back on.
                    </p>
                  ) : null}
                  <p className="text-sm text-foreground/90">{firstDropsPitch()}</p>
                  <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">Exactly where to go</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li><strong>Open The Scene → New release</strong>, or open the song&apos;s sheet and use <strong>Left panel → Track Status → Release song</strong>.</li>
                      <li><strong>Choose a Vault track</strong>. A Release publishes the recording; Lyrics DNA Drop is the separate lyric-preview and import link.</li>
                      <li><strong>Upload the finished audio</strong>, choose Fixed price or Pay what you want, and review the live artist-share line.</li>
                      <li><strong>Publish release</strong> — Free on every signed-in account (Visitor catalog slots apply). Listen / buy appears on your Artist Home, The Scene, and its public release link. Lyrics DNA Drop links stay Pro.</li>
                      <li><strong>Open Earnings</strong> and connect Stripe payouts so your share can reach your bank.</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fans hear a 30-second preview before purchase. After buying once, they stream the full song inside AKAsheet from Library. Music purchases use money, never Ink. You keep ownership of your lyrics, recording, and master.
                  </p>
                  <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] p-4 text-xs">
                    <p className="font-bold text-cyan-200">Try the Library player with a House release</p>
                    <p className="mt-1 text-muted-foreground">
                      House releases are included free with every member account. Open <strong>Library</strong> from The Scene and spin <strong>Mirror by Neomaiya Sol</strong> when it is featured there to test playback, search, queues, and crates before buying anything.
                    </p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-fuchsia-200">
                      Streaming is included with access. Save a device copy for offline play from Library—included for music you own or purchased.
                    </p>
                  </div>
                  <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/5 p-4 text-xs">
                    <p className="font-bold text-fuchsia-200">Buy now or build a music cart</p>
                    <p className="mt-1 text-muted-foreground">
                      Every purchasable song or album offers immediate checkout and Add to cart. A cart can mix releases from different artists, fixed prices, and each listener&apos;s chosen pay-what-you-want amount. Stripe runs one transaction while AKAsheet records each unlock, artist fee split, payout, and receipt separately.
                    </p>
                  </div>
                </ChapterCard>

                <ChapterCard id="manual-selling-pricing" icon={<BadgeDollarSign className="text-emerald-400" />} title="Pricing Options" colorClass="border-l-emerald-500 text-emerald-400">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                      <p className="font-bold text-foreground">Fixed price</p>
                      <p className="text-xs">Everyone pays the exact amount you set. The lowest live checkout price is <strong>{centsToUsdLabel(DROP_PAID_MIN_CENTS)}</strong>.</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Good for a clear, consistent release price</p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
                      <p className="font-bold text-foreground">Pay what you want</p>
                      <p className="text-xs">Set a minimum and a suggested amount. The buyer may pay more, but never less than <strong>{centsToUsdLabel(DROP_PAID_MIN_CENTS)}</strong>.</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Good for supporter pricing and flexible drops</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-100">
                    <strong>No free artist checkout:</strong> ordinary live releases are paid. Admin-selected House releases are the free, account-included exception. Current quick-price examples are {DROP_PRICE_PRESETS_CENTS.map(centsToUsdLabel).join(', ')}.
                  </div>
                </ChapterCard>

                <ChapterCard id="manual-selling-fees" icon={<CircleDollarSign className="text-amber-400" />} title="Fees & What You Keep" colorClass="border-l-amber-500 text-amber-400">
                  <p>{firstDropsFeeCashoutLine()}</p>
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2.5">Fan pays</th>
                          <th className="px-3 py-2.5">Platform fee</th>
                          <th className="px-3 py-2.5">Fee amount</th>
                          <th className="px-3 py-2.5 text-emerald-300">You keep</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-code tabular-nums">
                        {FIRST_DROP_PRICE_EXAMPLES.map((example) => (
                          <tr key={example.amountCents}>
                            <td className="px-3 py-2.5 font-bold text-foreground">{centsToUsdLabel(example.amountCents)}</td>
                            <td className="px-3 py-2.5">{example.feePercent}%</td>
                            <td className="px-3 py-2.5">{centsToUsdLabel(example.feeCents)}</td>
                            <td className="px-3 py-2.5 font-bold text-emerald-300">{centsToUsdLabel(example.artistCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-xs">
                    <li><strong>Below $3:</strong> 25% platform fee.</li>
                    <li><strong>$3 through $4.99:</strong> 15% platform fee.</li>
                    <li><strong>$5 and up:</strong> 10% platform fee.</li>
                    <li><strong>Stripe processing:</strong> AKAsheet pays card processing; it is not another deduction from the artist share shown above.</li>
                  </ul>
                </ChapterCard>

                <ChapterCard id="manual-selling-payouts" icon={<Banknote className="text-sky-400" />} title="Payouts, Sales Tracking & Where Fans Buy" colorClass="border-l-sky-500 text-sky-400">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="font-bold text-foreground">Get paid</p>
                      <ol className="list-decimal list-inside space-y-1.5 text-xs">
                        <li>Open <strong>Earnings</strong> from the Scene dock, account menu, Settings → Release payouts, or Release Catalog.</li>
                        <li>Complete Stripe&apos;s identity and bank setup once.</li>
                        <li>New sales move to Stripe automatically. Sales made before setup remain <strong>Held</strong> until you connect or send held sales.</li>
                      </ol>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-foreground">Track every sale</p>
                      <p className="text-xs">Earnings shows lifetime gross sales, total fees, your net earnings, sale count, average sale, latest-sale time, buyer, song, origin link, timestamp, and Paid or Held status.</p>
                    </div>
                  </div>
                  <Button asChild className="w-full font-bold uppercase tracking-widest text-[10px]">
                    <Link href="/earnings">
                      <Banknote className="mr-2 h-4 w-4" /> Open Release Earnings
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Fans can buy immediately or add releases to one multi-artist cart from the Listen / buy player on your Artist Home, The Scene, and public song or album pages. Manage live releases from The Scene, Vault, or Edit Public Page → Live Lyrics DNA Drops.
                  </p>
                </ChapterCard>
              </TabsContent>
              
              <TabsContent value="tiering" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard id="manual-studio-tiers" icon={<ShieldCheck />} title="Visitor vs Studio Pro" colorClass="border-l-primary text-primary">
                    <p>AKAsheet is a professional workstation. Your membership level determines project scale, vault access, and monthly Ink residency.</p>
                    <p className="text-xs bg-muted/30 border border-border/40 rounded-lg p-3"><strong>Visitor accounts:</strong> try the full DNA &amp; REMIX and Generation Workstation flows with system presets. <strong>Pro:</strong> archive your own DNA, Vibe, and Style strains; unlimited albums; cloud sync.</p>
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

                <ChapterCard id="manual-ink-economy" icon={<Droplets className="text-primary" />} title="The Ink Economy" colorClass="border-l-primary">
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
                <ChapterCard id="manual-infinity-loop" icon={<BrainCircuit className="text-primary" />} title="The ∞ Loop Methodology" colorClass="border-l-primary text-primary">
                    <p>The core of AKAsheet is a continuous cycle of creative refinement. You are never 'finished'—you are always evolving.</p>
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
                <div id="manual-precision-glossary" className="scroll-mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 space-y-3">
                  <div>
                    <h2 className="font-headline text-2xl font-bold uppercase text-primary">Clickable glossary</h2>
                    <p className="text-xs text-muted-foreground">Tap any precision tool to jump straight to its explanation.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRECISION_TOOL_GLOSSARY.map((item) => (
                      <button
                        key={item.targetId}
                        type="button"
                        className="rounded-full border border-primary/25 bg-background/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => scrollToManualTarget(item.tab, item.targetId)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Generate a bar</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">In-line on the sheet, or the Bar Workstation footer. Co-Writer is the rails those gens read.</p>
                </div>

                <ChapterCard id="manual-inline-generation" icon={<MousePointer2 className="text-primary" />} title="In-line on the sheet" colorClass="border-l-primary">
                    <p>Hover over any lyrical line on the notepad to reveal surgical triggers. Add a line directly below, above, or delete the line with one click.</p>
                </ChapterCard>

                <ChapterCard id="manual-bar-workstation" icon={<Zap className="text-primary" />} title="Bar Workstation (footer)" colorClass="border-l-primary">
                    <p>Select a line to activate the Bar Workstation. Generate <strong>Next</strong> or <strong>Previous</strong> suggestions anchored to your active focus ({AI_COSTS.generateNextLine} Ink each).</p>
                    <p className="text-xs">Set <strong>End With</strong> to force the next suggestion to land on your punchline. Watch the rule badges light up to see which DNA, Vibes, and Intents are guiding the AI.</p>
                </ChapterCard>

                <ChapterCard id="manual-co-writer" icon={<Sparkles className="text-primary" />} title="Co-Writer (right panel)" colorClass="border-l-primary">
                    <p>Co-Writer is the rails: DNA, Vibe, Intents, Guardrails, Style DNA. Flip a switch on so Generate Next / drafts follow it. Train Style DNA from this sheet when you want gens to clip like you.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Sheet &amp; Structure</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Center panel — the rhyme book itself.</p>
                </div>

                <ChapterCard id="manual-smart-structure" icon={<ClipboardPaste className="text-primary" />} title="Smart Structure" colorClass="border-l-primary">
                    <p>Click <strong>+ Paste Your Lyrics</strong> in the center top bar. Label sections with <code className="text-primary">[Verse]</code>, <code className="text-primary">[Hook]</code>, etc. on their own lines for automatic splits ({AI_COSTS.analyzeStructure} Ink).</p>
                </ChapterCard>

                <ChapterCard id="manual-rhyme-pulse" icon={<Zap className="text-amber-500" />} title="Rhyme Pulse" colorClass="border-l-amber-500 text-amber-500">
                    <p>The round button in the center top bar runs a one-time deep phonetic scan of your current sheet ({AI_COSTS.findRhymes} Ink). Results update rhyme highlighting across every line.</p>
                </ChapterCard>

                <ChapterCard id="manual-sheet-editing" icon={<ListRestart className="text-muted-foreground" />} title="Sheet Editing &amp; Undo" colorClass="border-l-muted-foreground">
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Enter</strong> — split a line at the cursor; the workstation handles indexing and hanging indents.</li>
                        <li><strong>Backspace</strong> at the start of a bar — merge with the line above.</li>
                        <li><strong>Undo</strong> — center top bar reverts sheet and section changes (up to 20 history steps).</li>
                    </ul>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Right Panel Controls</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">DNA, vibe, intents, style, and guardrails.</p>
                </div>

                <ChapterCard id="manual-dna-suite" icon={<Dna className="text-green-500" />} title="DNA Suite (Right Panel)" colorClass="border-l-green-500">
                    <p>Five questions — world, emotion, trigger, message, tone. Type your own DNA here or refine fields after you load or extract a profile.</p>
                    <p className="text-xs">Primary save path: <strong>DNA &amp; REMIX → Analysis Step → Save DNA Profile</strong>. DNA Suite + the <strong>folder icon</strong> is where you browse vault saves, load full profiles (↻), or edit mapped fields by hand. Hub VAULT tab works the same during a remix.</p>
                </ChapterCard>

                <ChapterCard id="manual-intents" icon={<Target className="text-sky-500" />} title="Intents (Right Panel)" colorClass="border-l-sky-500">
                    <p>Punchlines and recurring phrases you want in the song. Hover any intent and click the <strong>Precision Lock arrow</strong> to force the AI to end its next suggestion on that exact phrase.</p>
                </ChapterCard>

                <ChapterCard id="manual-guardrails" icon={<Shield className="text-rose-500" />} title="Guardrails (Right Panel)" colorClass="border-l-rose-500">
                    <p>Surgical restrictions. The AI avoids <strong>Forbidden Words</strong> and integrates <strong>Must-Include Words</strong> during every generation pass.</p>
                </ChapterCard>

                <ChapterCard id="manual-track-vibe" icon={<Palette className="text-amber-500" />} title="Track Vibe &amp; Vibe Vault" colorClass="border-l-amber-500 text-amber-500">
                    <p>Set genre, BPM, feeling tags, and instrumentation in <strong>Track Vibe</strong>. Copy the instrumentation string into Suno, Udio, or similar tools.</p>
                    <p className="text-xs">Save presets with the <strong>folder icon</strong> under Track Vibe — reuse the same sonic palette across every song in the project.</p>
                </ChapterCard>

                <ChapterCard id="manual-style-dna" icon={<Fingerprint className="text-fuchsia-500" />} title="Style DNA &amp; Training" colorClass="border-l-fuchsia-500 text-fuchsia-500">
                    <p><strong>Train AI on Style</strong> ({AI_COSTS.improveMyStyle} Ink) teaches the workstation your vocabulary and flow. Style DNA feeds every generation when the toggle is on.</p>
                    <p className="text-xs">Save style strains to the Style Vault (folder icon) for reuse across tracks.</p>
                </ChapterCard>

                <ChapterCard id="manual-creative-effects" icon={<Wand2 className="text-indigo-500" />} title="Creative Effects" colorClass="border-l-indigo-500 text-indigo-400">
                    <p>Lyric tools in the right panel — Simile, Metaphor, and Sound-Alike on every tier; Twist, Image Chain, POV, and more on Studio Pro ({AI_COSTS.runCreativeEffect} Ink each).</p>
                    <p className="text-xs">Pick a tool from the dropdown — what it does and how to fill the fields is written under the picker. Results land in the Scratch Pad for review before you paste into the sheet.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">DNA &amp; Remix Engine</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Generation Workstation → DNA &amp; REMIX.</p>
                </div>

                <ChapterCard id="manual-seed-remix" icon={<ScanLine className="text-sky-400" />} title="Seed DNA &amp; REMIX" colorClass="border-l-sky-500 text-sky-400">
                    <p>Step 1 of DNA &amp; REMIX. Paste lyrics, a poem, rough ideas, or inspiration — or turn on <strong>Sync Current Lyrics</strong> to pull from your sheet. Run extraction to open Analysis Step.</p>
                    <p className="text-xs">This pass maps analytical strains <em>without</em> drafting new bars. You can re-matrix remix paths later without re-pasting source text once extraction is saved.</p>
                </ChapterCard>

                <ChapterCard id="manual-analysis-step" icon={<Sparkles className="text-emerald-400" />} title="Analysis Step — Save &amp; Inject" colorClass="border-l-emerald-500 text-emerald-400">
                    <p>Step 2 decodes your source into color-coded strain cards (Themes, Motifs, Emotion, Structure, Style, and more).</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>Save DNA Profile</strong> (Pro) — archives the <em>entire</em> extraction to your vault for any track.</li>
                        <li><strong>⚡ on a strain</strong> — injects just that part into the Calibration Hub for this remix (Creative DNA fields, Intents, Structure guide, or Style DNA).</li>
                        <li><strong>Define Paths</strong> — optional remix forks with influence sliders before Calibration Hub.</li>
                    </ul>
                    <p className="text-xs">Edit or type DNA manually anytime in DNA Suite after you load or extract — the vault and Suite stay in sync with the same profile shape.</p>
                </ChapterCard>

                <ChapterCard id="manual-dna-extraction" icon={<ScanLine className="text-sky-400" />} title="DNA Extraction (Overview)" colorClass="border-l-sky-500/60 text-sky-400/90">
                    <p>The full flow: <strong>Seed</strong> (paste or sync) → <strong>Analysis Step</strong> (save full profile or ⚡ parts) → <strong>Remix Paths</strong> (optional) → <strong>Calibration Hub</strong> → synthesis.</p>
                </ChapterCard>

                <ChapterCard id="manual-calibration-hub" icon={<Settings className="text-primary" />} title="Calibration Hub" colorClass="border-l-primary">
                    <p>The workstation brain (Step 10). Mix DNA strains, Style DNA, Intents, Structure presets, remix paths, and Special Instructions before synthesis.</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>INSIGHTS</strong> — latest extraction strains with ⚡ inject buttons (one field at a time).</li>
                        <li><strong>VAULT</strong> — load full saved profiles (↻) or cherry-pick individual strains from expanded entries.</li>
                        <li><strong>Structure</strong> — opens expanded with the Default preset so you can tune bar counts immediately.</li>
                    </ul>
                </ChapterCard>

                <ChapterCard id="manual-special-instructions" icon={<FilePenLine className="text-blue-400" />} title="Special Instructions" colorClass="border-l-blue-500 text-blue-400">
                    <p>A direct creative brief in the Calibration Hub — tone, POV, constraints, or scene direction. Treated as a hard rule at synthesis, <em>not</em> blended by remix path percentages.</p>
                </ChapterCard>

                <ChapterCard id="manual-remix-paths" icon={<GitBranch className="text-violet-400" />} title="Remix Paths" colorClass="border-l-violet-500 text-violet-400">
                    <p>Select multiple creative paths in DNA &amp; REMIX. Influence % sliders blend selected forks relative to each other during synthesis — explore narrative branches without rewriting the whole track.</p>
                </ChapterCard>

                <ChapterCard id="manual-creative-syncing" icon={<FlaskConical className="text-cyan-400" />} title="Creative Syncing" colorClass="border-l-cyan-500 text-cyan-400">
                    <p>During Studio Draft and remix synthesis, the Creative Syncing overlay weaves active DNA, Intents, Style, Vibe, guardrails, and Special Instructions into one neural pass.</p>
                </ChapterCard>

                <ChapterCard id="manual-dna-vault" icon={<FolderOpen className="text-green-500" />} title="DNA Vault &amp; DNA Mixer" colorClass="border-l-green-500">
                    <p><strong>Save:</strong> DNA &amp; REMIX → Analysis Step → <strong>Save DNA Profile</strong> (Pro). <strong>Load:</strong> Calibration Hub VAULT tab or DNA Suite folder icon — full profile (↻) or partial ⚡ per strain.</p>
                    <p className="text-xs"><strong>DNA Mixer</strong> (Album page) — selectively pick individual creative strains from your vault history without loading an entire profile.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Generation &amp; Capture</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Left panel workstation, drafts, and voice capture.</p>
                </div>

                <ChapterCard id="manual-studio-draft" icon={<BrainCircuit className="text-primary" />} title="Generation Workstation &amp; Studio Draft" colorClass="border-l-primary">
                    <p>Open <strong>Generation Workstation</strong> from the left panel. Run <strong>Studio Draft</strong> in the Calibration Hub to generate full sections — a typical default structure is about {STUDIO_DRAFT_INK_PER_SONG} Ink ({AI_COSTS.generateDraftPerBar} Ink per bar).</p>
                    <p className="text-xs">Use Next/Previous Line for surgical tweaks; running it on every bar costs more over a full track than a single draft pass.</p>
                </ChapterCard>

                <ChapterCard id="manual-freestyle-pad" icon={<Mic className="text-primary" />} title="Freestyle Pad" colorClass="border-l-primary">
                    <p>Studio Pro — open from the footer Bar Workstation. Speak your bars; tap <strong>Add to Editor</strong> to drop transcribed lines directly into the active section ({AI_COSTS.freestyleTranscription} Ink after a short pickup, not per clip).</p>
                </ChapterCard>

                <ChapterCard id="manual-vibe-suggester" icon={<Volume2 className="text-amber-500" />} title="Vibe Suggester" colorClass="border-l-amber-500 text-amber-500">
                    <p>Left panel → <strong>Analyze Vibe</strong> reads your lyrics and auto-fills genre, BPM, and instrumentation in Track Vibe ({AI_COSTS.suggestVibe} Ink). Copy the result into external music AIs.</p>
                </ChapterCard>

                <div className="pt-4 space-y-4">
                    <h2 className="text-2xl font-headline font-bold uppercase text-primary border-b-2 border-primary/10 pb-2">Export &amp; Share</h2>
                    <p className="text-xs text-muted-foreground font-code uppercase tracking-widest">Pro workflows for performance and collaboration.</p>
                </div>

                <ChapterCard id="manual-performance-mode" icon={<MonitorPlay className="text-sky-400" />} title="Performance Mode" colorClass="border-l-sky-500 text-sky-400">
                    <p>Studio Pro — left panel Track Status card. Distraction-free teleprompter with rhyme focus for live runs or rehearsal.</p>
                </ChapterCard>

                <ChapterCard id="manual-dna-drop" icon={<Link2 className="text-primary" />} title="Lyrics DNA Drop" colorClass="border-l-primary">
                    <p>Studio Pro — publish, view, download, and import lyric snapshots. Guests who tap a live drop go to sign in (must be Pro — sign in to check tier or create an account). Signed-in Visitor members go to Studio Tier with the Lyrics DNA Drop perk flashing. Update snapshot after edits; <strong>Take offline</strong> to revoke the link. To sell from The Scene, use <strong>New release</strong> (Free) — Lyrics DNA Drop is not the sell desk.</p>
                </ChapterCard>

                <ChapterCard id="manual-collab-sheet" icon={<Users className="text-violet-300" />} title="Collab Sheet" colorClass="border-l-violet-500 text-violet-300">
                    <p>Studio Pro — open <strong>Collab Sheet</strong> from the left panel to share a live editable sheet on this track. Invite friends; edits sync in real time. Top-right shows live presence (e.g. 2/13). Chat expands from the bottom drawer — no pop-up window. Only the owner can invite or revoke. Shared sheets appear in the Vault Collab Sheets section; albums show a Collab badge when any track is live.</p>
                </ChapterCard>

                <ChapterCard id="manual-export-backup" icon={<NotebookText className="text-muted-foreground" />} title="Export Track &amp; Vault Backup" colorClass="border-l-muted-foreground">
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        <li><strong>Export Track</strong> — left panel PDF export anytime.</li>
                        <li><strong>Vault Export</strong> — Vault dashboard downloads a <code className="text-primary">.json</code> backup; re-import to restore albums, DNA presets, and strains.</li>
                    </ul>
                </ChapterCard>
              </TabsContent>

              <TabsContent value="panels" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <ChapterCard id="manual-workstation-map" icon={<MonitorPlay className="text-amber-600" />} title="Workstation Map" colorClass="border-l-amber-500 text-amber-700">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="left">
                            <AccordionTrigger className="font-bold text-xs uppercase">Left Panel: Track Status</AccordionTrigger>
                            <AccordionContent className="text-xs space-y-2">
                                <p>• <strong>Status:</strong> Manage titles and enter Performance Mode. Optional Press / Release stage (Beat → Released) lives here too — turn it off in Settings or on the album page. Not the same as Press live.</p>
                                <p>• <strong>Release song:</strong> Upload audio, set a price, and publish the music release. This is separate from Lyrics DNA Drop.</p>
                                <p>• <strong>Lyrics DNA Drop / Collab Sheet:</strong> Lyrics DNA Drop = Pro lyric snapshot — publish, view, and import. Collab Sheet = live shared editing with presence + chat.</p>
                                <p>• <strong>Structure:</strong> Live song map (Verse, Hook, Bridge). Tap a section to jump the sheet; Add Section to grow the form. Not the Smart Structure paste tool.</p>
                                <p>• <strong>Vibe Suggester:</strong> Generate suno/udio instrumentation prompts.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="center">
                            <AccordionTrigger className="font-bold text-xs uppercase">Center Panel: The Sheet</AccordionTrigger>
                            <AccordionContent className="text-xs space-y-2">
                                <p>• <strong>Rhyme Pulse (Round Button):</strong> Initiates a deep manual scan ({AI_COSTS.findRhymes} Ink).</p>
                                <p>• <strong>Bar Workstation:</strong> Select a line, then Generate Next / Previous. Hover a line for in-line Next.</p>
                                <p>• <strong>Smart Structure:</strong> Paste raw text to auto-deconstruct blocks.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="right">
                            <AccordionTrigger className="font-bold text-xs uppercase">Right Panel: Co-Writer</AccordionTrigger>
                            <AccordionContent className="text-xs space-y-2">
                                <p>• <strong>DNA Suite:</strong> World, emotion, trigger, message, tone — type your own or edit after load/extract. <strong>Folder icon</strong> opens the vault. Primary extraction save: DNA &amp; REMIX → Analysis Step.</p>
                                <p>• <strong>Intents:</strong> Punchlines to weave in, with the <strong>Precision Lock Arrow</strong>.</p>
                                <p>• <strong>Style DNA:</strong> Cadence and vocab from training this sheet. Switch on so gens clip like you.</p>
                                <p>• <strong>Creative Effects:</strong> Pick a tool from the dropdown — the description under it tells you what it does. Results go to Scratch Pad.</p>
                                <p>• <strong>Takes:</strong> Above Draft Chest—record up to 3 vocal memos per track (5 minutes each) and play them back anytime. Private booth notes, not a music release.</p>
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
                            <AccordionItem id={`manual-faq-${idx}`} key={idx} value={`faq-${idx}`} className="scroll-mt-6 border rounded-xl bg-card/50 px-6 overflow-hidden">
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
