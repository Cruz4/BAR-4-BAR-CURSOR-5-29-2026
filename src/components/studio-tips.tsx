'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Play, Target, BrainCircuit, Shield, Wand2, Palette, Sparkles, Zap, FolderOpen, ClipboardPaste, ArrowRight, ListRestart, Fingerprint, MonitorPlay, RefreshCw, Link2, FilePenLine, GitBranch, Download, Mic, Settings, Rocket, HelpCircle, MousePointer2, Dna, Clock, Trophy, Share2, Gift, Globe, Lightbulb, Layers, FlaskConical, ScanLine, Undo2, Crown, EyeOff, Image, CalendarRange, Upload, Medal, BadgeCheck, Lock, Flame, Hash, Camera, Pencil, ToggleRight, Mail, PanelLeft, Sparkle, Bell, Radio, Music, Library, Eye, Sun, Users } from 'lucide-react';
import { PRO_FEATURE_PREVIEW_DAYS, REFERRAL_INK_SPEND_THRESHOLD, SIGNUP_INK } from '@/lib/subscription';
import { MAX_REFERRAL_REWARDS, REFERRAL_INK_REWARD } from '@/lib/referrals';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useConfigSurfaceFlags, configSurfaceAllows, type ConfigSurfaceFeature } from '@/hooks/use-config-surface-flags';
import { firstDropsFeeCashoutLine } from '@/lib/drop-commerce';
import { AI_COSTS } from '@/lib/costs';
import { STUDIO_DRAFT_INK_TIP, COMPETITOR_ANCHOR_COPY } from '@/lib/studio-tiers';
import {
  areStudioTipsEnabled,
  clearTrackSheetNavigation,
  getTrackSheetVisitCount,
  hasTipBeenShownThisSession,
  isTrackEditorPath,
  markTipShownThisSession,
  recordTrackSheetEntry,
  setStudioTipsEnabled,
} from '@/lib/studio-tips-session';

type StudioTip = {
  id: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  color: string;
  /** Defaults to Studio Insight; use did-you-know for lighter trivia-style cards. */
  kind?: 'insight' | 'did-you-know';
  /** Hide when that live admin flag is off. */
  feature?: ConfigSurfaceFeature;
};

const STUDIO_TIPS: StudioTip[] = [
  { id: 1, icon: MousePointer2, title: "3-WAY SYSTEM", text: "Hover over any line on the sheet to reveal hidden generation triggers. Add a bar next, previous, or delete instantly.", color: "text-primary" },
  { id: 2, icon: Target, title: "PRECISION LOCK", text: "Hover over any Intent in the Right Panel and click the Arrow to force the AI to land exactly on that phrase for its next suggestion.", color: "text-sky-600" },
  { id: 3, icon: BrainCircuit, title: "DNA HIERARCHY", text: "The AI prioritizes Track DNA over Album DNA. Use Track DNA to surgically override big themes for a single song. On the album page, Pro can Extract Album DNA to fill World / Emotion / Message from every track in order.", color: "text-green-600" },
  { id: 4, icon: Shield, title: "GUARDRAILS", text: "Struggling with cliches? Add forbidden words in the Guardrails section (Right Panel) to force the AI into new vocabulary.", color: "text-rose-600" },
  { id: 5, icon: Wand2, title: "CREATIVE EFFECTS", text: "Visitor accounts get Simile, Metaphor & Sound-Alike. Studio Pro unlocks Twist, Image Chain, POV, and more in the Right Panel.", color: "text-indigo-600" },
  { id: 7, icon: Palette, title: "BEAT PROMPTS", text: `Click 'Analyze Vibe' in the Left Panel to generate a deep production string you can use in music AIs like Suno or Udio (${AI_COSTS.suggestVibe} Ink).`, color: "text-amber-600" },
  { id: 8, icon: Sparkles, title: "ACTIVE CONTEXT", text: "Watch the Bar Workstation badges in the footer. They light up to show which DNA, Vibes, and Intents are currently guiding the AI.", color: "text-sky-600" },
  { id: 9, icon: Zap, title: "RHYME PULSE", text: `Initiate a one-time deep phonetic scan of your current sheet by clicking the round Rhyme Pulse button in the center top bar (${AI_COSTS.findRhymes} Ink).`, color: "text-primary" },
  { id: 10, icon: FolderOpen, title: "DNA VAULT", text: "Save on DNA & REMIX → Analysis Step → Save DNA Profile (Pro). Load full profiles (↻) or ⚡ individual strains from the Hub VAULT tab or DNA Suite folder icon.", color: "text-green-600" },
  { id: 11, icon: ClipboardPaste, title: "SMART STRUCTURE", text: `Click '+ Paste Your Lyrics' in the center bar to paste raw text. Label sections with [Verse], [Hook], etc. on their own lines for perfect splits (${AI_COSTS.analyzeStructure} Ink).`, color: "text-primary" },
  { id: 12, icon: ArrowRight, title: "ENTER TO SPLIT", text: "In the sheet, press Enter to split a line at the cursor. The workstation handles all indexing and hanging indents for you.", color: "text-primary" },
  { id: 13, icon: ListRestart, title: "BACKSPACE TO MERGE", text: "Press Backspace at the start of a bar to merge it with the one above. Your rhyme book stays organized effortlessly.", color: "text-primary" },
  { id: 14, icon: Fingerprint, title: "STYLE TRAINING", text: `Use 'Train AI on Style' in the Right Panel to let the workstation learn your specific vocabulary and flow for more authentic suggestions (${AI_COSTS.improveMyStyle} Ink).`, color: "text-accent" },
  { id: 15, icon: MonitorPlay, title: "PERFORMANCE MODE", text: "Studio Pro unlocks Performance Mode from the Track Status card (Left Panel)—a distraction-free teleprompter with rhyme focus.", color: "text-sky-400" },
  { id: 16, icon: RefreshCw, title: "THE ∞ LOOP", text: "DNA & REMIX: paste lyrics or sync your sheet → Analysis Step → Save DNA Profile (full) or ⚡ strains (parts) → calibrate and synthesize.", color: "text-primary" },
  { id: 17, icon: Link2, title: "SYNC TOGGLE", text: "In DNA & REMIX, use 'Sync Current Lyrics' to instantly import your sheet, or turn it off to manually remix external concepts.", color: "text-primary" },
  { id: 18, icon: FilePenLine, title: "HANGING INDENTS", text: "The workstation automatically indents wrapped text by 25px, keeping your long bars legible and perfectly aligned with the grid.", color: "text-muted-foreground" },
  { id: 19, icon: Sparkles, title: "PRO PREVIEW", text: "New artists get a short Pro preview — export, Performance & DNA Drop. Catalog stays demo-scale (1 album / 2 tracks) until paid Pro. Ink stays on your demo pool.", color: "text-primary" },
  { id: 20, icon: GitBranch, title: "REMIX DIRECTIONS", text: "When using DNA & REMIX, select multiple creative paths to see how the AI blends different narrative 'forks' during synthesis.", color: "text-primary" },
  { id: 21, icon: Download, title: "VAULT EXPORT", text: "Use 'Vault Export' on the dashboard to download a .json backup. You can re-import this into any workstation to sync your work.", color: "text-primary" },
  { id: 22, icon: Mic, title: "FREESTYLE PAD", text: "Caught a vibe? Open the Freestyle Pad in the footer to speak your bars. Tap 'Add to Editor' to drop them directly into the sheet.", color: "text-primary" },
  { id: 23, icon: Target, title: "PRECISION ENDING", text: "Set an 'End With' constraint in the footer Bar Workstation to force neural suggestions to land perfectly on your punchline.", color: "text-cyan-500" },
  { id: 24, icon: Settings, title: "CALIBRATION HUB", text: "Step 10 is the workstation's brain. Mix vault strains with your track intents to review your rules before generating lyrics.", color: "text-primary" },
  { id: 25, icon: Rocket, title: "MOBILE PWA", text: "Install AKAsheet to your home screen on iOS or Android for a full-screen, native studio experience on the go.", color: "text-primary" },
  { id: 26, icon: HelpCircle, title: "STUDIO MANUAL", text: "Stuck? Click the '?' icon in the header to open the Spatial Manual. It maps every tool to its exact location in the Left, Center, or Right panels.", color: "text-primary" },
  { id: 27, icon: Dna, title: "DNA MIXER", text: "Open the DNA Mixer in the Album page to selectively pick individual creative strains from your vault history.", color: "text-emerald-500" },
  { id: 28, icon: Clock, title: "INK PRIORITY", text: "The studio automatically uses your expiring monthly Residency Ink before touching your Permanent Ink.", color: "text-primary" },
  { id: 29, icon: Trophy, title: "STUDIO PROGRESS", text: "Open The Vault sidebar (desktop) or Studio Progress in the header menu for weekly goals, rank XP, and milestones. Full board: /studio-progress.", color: "text-amber-400" },
  { id: 30, icon: Sparkles, title: "ACHIEVEMENTS", text: "Badges unlock as you write, generate, and explore. Hover trophies in Studio Progress for unlock details.", color: "text-violet-400" },
  { id: 31, icon: Share2, title: "SHARE CARDS", text: "In Studio Progress → Sharing & visibility, tap Share achievement card to export a foil milestone card with rank, XP, and streak — great for social posts.", color: "text-sky-400" },
  { id: 32, icon: Gift, title: "REFER A FRIEND", text: `Ink Store → copy your link. Your friend gets ${SIGNUP_INK} welcome Ink plus up to ${REFERRAL_INK_REWARD} extra. You can earn up to ${REFERRAL_INK_REWARD} Ink after they spend ${REFERRAL_INK_SPEND_THRESHOLD} Ink, for up to ${MAX_REFERRAL_REWARDS} eligible referrals.`, color: "text-primary" },
  { id: 33, kind: 'did-you-know', icon: Lightbulb, title: "WRITTEN VS GENERATED", text: "Studio Progress splits your work: hand-typed lines (and lines you edit after AI) count toward writing goals and streaks. AI-generated lines earn lighter XP and feed Generate Next milestones — not “write 10 bars” trophies.", color: "text-amber-400" },
  { id: 34, icon: Globe, title: "DNA DROP", text: "Studio Pro can publish a DNA Drop link from the left panel. Collaborators import your lyrics, structure, DNA, and vibe after sign-in — great for feedback loops.", color: "text-primary" },
  { id: 71, icon: Users, title: "COLLAB SHEET", text: "Studio Pro — Collab Sheet on the left panel shares a live editable track with friends. Presence chip (2/13 live), bottom chat drawer, real-time bar sync. Invited writers edit free; only you can invite or revoke.", color: "text-violet-300" },
  { id: 35, kind: 'did-you-know', icon: Zap, title: "⚡ INJECT VS ↻ LOAD", text: "Did you know? ⚡ on a strain appends just that field (Creative DNA, Intents, Structure, or Style). The vault ↻ button loads the entire saved profile in one shot.", color: "text-yellow-500" },
  { id: 36, icon: FlaskConical, title: "CREATIVE SYNCING", text: "During full drafts and remix synthesis, the Creative Syncing overlay weaves active DNA, Intents, Style, Vibe, and Special Instructions into one neural pass.", color: "text-cyan-400" },
  { id: 37, kind: 'did-you-know', icon: ScanLine, title: "ANALYSIS STEP", text: "Did you know? After extraction, Analysis Step shows strain cards. Save DNA Profile archives the entire extraction; ⚡ injects one field into this remix. Edit manually in DNA Suite anytime after load or extract.", color: "text-sky-400" },
  { id: 38, icon: Layers, title: "HUB INSIGHTS TAB", text: "In the Calibration Hub, INSIGHTS shows your latest extraction strains with ⚡ inject buttons. VAULT loads saved album DNA presets — expand entries to cherry-pick individual fields.", color: "text-primary" },
  { id: 39, kind: 'did-you-know', icon: Lightbulb, title: "SAVE INK ON DRAFTS", text: STUDIO_DRAFT_INK_TIP, color: "text-sky-400" },
  { id: 40, kind: 'did-you-know', icon: Globe, title: "LYRICS VS FULL SONGS", text: COMPETITOR_ANCHOR_COPY, color: "text-muted-foreground" },
  { id: 6, kind: 'did-you-know', icon: FilePenLine, title: "SPECIAL INSTRUCTIONS", text: "Did you know? Special Instructions in the Hub are a direct creative brief — they are not blended or weighted by remix path percentages.", color: "text-blue-400" },
  { id: 47, icon: Crown, title: "STUDIO RANKS", text: "Earn XP from writing, generating, streaks, and milestones to climb ranks like Headliner and Vault Architect. Track progress on /studio-progress or the Vault sidebar.", color: "text-amber-500" },
  { id: 41, kind: 'did-you-know', icon: Palette, title: "VIBE VAULT", text: "Did you know? Save instrumentation and BPM presets with the folder icon under Track Vibe (Right Panel) — reuse the same sonic palette across every song in the album.", color: "text-amber-600" },
  { id: 42, icon: Undo2, title: "20-LEVEL UNDO", text: "Made a structural mistake? The Undo button in the center top bar reverts sheet and section changes instantly — up to 20 history steps deep.", color: "text-muted-foreground" },
  { id: 43, kind: 'did-you-know', icon: EyeOff, title: "LEADERBOARD & PROFILE", text: "Did you know? You start private. Turn on Show on leaderboard or Public profile in Studio Progress → Sharing & visibility when you want to share — weekly rankings list display name and studio stats only, never lyrics.", color: "text-violet-400" },
  { id: 44, icon: Image, title: "COVER ART FOR DROPS", text: "Upload square album cover art (min 500px; exported at 1000×1000) so vinyl grids and DNA Drop previews stay sharp when you share.", color: "text-emerald-500" },
  { id: 45, kind: 'did-you-know', icon: CalendarRange, title: "WEEKLY VS MONTHLY", text: "Did you know? Weekly goals reset every Monday; monthly challenges roll on the calendar month. Both track rhyme bars — check /studio-progress for live counters.", color: "text-amber-400" },
  { id: 46, icon: Upload, title: "VAULT IMPORT", text: "Dashboard → Vault Export downloads a .json backup. Re-import anytime to restore albums, DNA presets, and strains on a new workstation.", color: "text-primary" },
  // Jul 2026 — privacy, progress, and preview clarity
  { id: 48, kind: 'did-you-know', icon: Medal, title: "FOIL BADGE PREVIEW", text: "Did you know? Tap an unlocked trophy in Studio Progress to preview the foil card first — then Download PNG when you like the look. Locked badges stay locked.", color: "text-violet-400" },
  { id: 49, kind: 'did-you-know', icon: BadgeCheck, title: "FREE BADGE ≠ LOCKED", text: `Did you know? During your ${PRO_FEATURE_PREVIEW_DAYS * 24}-hour Pro feature preview, export, Performance, Freestyle, and DNA Drop can unlock while your badge still says FREE — that is the preview, not a bug.`, color: "text-pink-400" },
  { id: 50, kind: 'did-you-know', icon: Lock, title: "LYRICS STAY PRIVATE", text: "Did you know? Leaderboard, public profile, and achievement share cards never publish vault lyrics — only the display name and studio stats you choose to share.", color: "text-emerald-400" },
  { id: 51, kind: 'did-you-know', icon: Flame, title: "PERSONAL BESTS", text: "Did you know? Beat your best bars in a session, bars in a day, or longest streak and Studio Progress celebrates the personal best — keep an eye out when you are in the zone.", color: "text-orange-400" },
  { id: 52, kind: 'did-you-know', icon: Hash, title: "RHYME BAR MATH", text: "Did you know? On the sheet, two lyric lines make one rhyme bar. Weekly writing goals and streaks count rhyme bars — not raw line count.", color: "text-amber-400" },
  { id: 53, icon: Camera, title: "UPDATE DNA DROP", text: "Published a DNA Drop? After you edit the track, open DNA Drop → Update snapshot so collaborators get the latest lyrics and DNA on the same link.", color: "text-sky-400" },
  { id: 54, kind: 'did-you-know', icon: Pencil, title: "EDIT AI → WRITTEN", text: "Did you know? Generate a line, then edit it by hand — that line counts toward writing goals and streaks, not just Generate Next milestones.", color: "text-amber-300" },
  { id: 55, kind: 'did-you-know', icon: ToggleRight, title: "OPT-IN SWITCHES", text: "Did you know? In Sharing & visibility, ON means share. Both Show on leaderboard and Public profile off = fully private — no opposite “hide” toggle to decode.", color: "text-violet-300" },
  { id: 56, icon: Mail, title: "VERIFY FOR WELCOME", text: "Welcome Ink and your Pro feature preview unlock after email verification — abuse protection so the same inbox cannot farm free Ink forever.", color: "text-primary" },
  { id: 57, icon: PanelLeft, title: "VAULT SIDEBAR GOALS", text: "On desktop, the Vault sidebar shows live weekly goals and rank XP without leaving the sheet — open full Studio Progress anytime for trophies and sharing.", color: "text-amber-400" },
  { id: 58, icon: Sparkle, title: "PREVIEW QUEST", text: "During Pro preview, saving a custom DNA profile completes the preview quest — a nudge to vault your extraction before the window ends.", color: "text-emerald-400" },
  // Aug 2026 — Scene home pivot
  { id: 59, icon: Globe, title: "THE SCENE", text: "Signing in lands you on The Scene — friends' wall drops, a Discover stream of live Artist Homes and DNA Drops, and Your Booth. The Vault is one click away in the right dock.", color: "text-emerald-400" },
  { id: 60, kind: 'did-you-know', icon: Share2, title: "POST FROM HOME", text: "Did you know? The composer at the top of The Scene posts straight to your Artist Home wall — friends see it on their Scene feed too.", color: "text-fuchsia-400" },
  { id: 61, icon: FilePenLine, title: "KEEP WRITING OR START FRESH", text: "The write button on The Scene dock is split: tap the main side to jump back into your last sheet, or tap the Start Track edge to open a brand new one.", color: "text-primary" },
  { id: 62, kind: 'did-you-know', icon: Share2, title: "SHARE ANY POST", text: "Did you know? Every wall post has a Share button — X, Facebook, WhatsApp, email, or copy link — that deep-links straight back to that post on your Artist Home.", color: "text-sky-400" },
  { id: 63, icon: MonitorPlay, title: "EMBED TIKTOK, IG & FB", text: "Paste a full TikTok, Instagram, or Facebook post URL into a wall post and it plays inline on your Artist Home — short links usually will not parse, use the full post URL.", color: "text-fuchsia-400" },
  { id: 64, icon: Bell, title: "ACTIVITY INBOX", text: "Activity is your work ping: “your verse is still open,” “streak dies at midnight,” “someone echoed your bar.” Friend requests and DNA imports still land here — not a dump of feed posts. Optional push under Settings → Notifications.", color: "text-emerald-400" },
  { id: 65, icon: Radio, title: "HOUSE BAR OF THE DAY", text: "When Studio Ops pins it, The Scene shows one shared unfinished bar. Tap Write the next line to answer in a popup on The Scene — not your last track.", color: "text-fuchsia-400", feature: 'house-bar' },
  { id: 66, icon: CalendarRange, title: "WEEKLY PUBLIC CHALLENGE", text: "A Scene-wide weekly cypher (hand-written bars, Monday reset) can be pinned, rewritten, or turned off from Admin. Your count shows on the pin.", color: "text-amber-400", feature: 'weekly-challenge' },
  { id: 67, icon: Music, title: "NEW RELEASE", text: "DNA Drop is the separate Pro lyric page. To publish music — Free on every signed-in account — tap New release on The Scene. Choose a song or album, upload the recording, set a price, and press live. Fans preview 30 seconds, then buy once and stream here. Cash out through Earnings. Pro adds unlimited catalog slots and offline Library downloads.", color: "text-fuchsia-400", feature: 'first-drops' },
  { id: 68, kind: 'did-you-know', icon: Music, title: "YOU KEEP THE RIGHTS", text: `Did you know? We are not a label. You keep your lyrics, recordings, and masters. Release sales are buy-once in-app streams—not Spotify. ${firstDropsFeeCashoutLine()} Ink is never used to buy music.`, color: "text-amber-300", feature: 'first-drops' },
  { id: 69, icon: Library, title: "LIBRARY", text: "Drops you unlock live in Library — Scene dock. House releases are included free so you can try the player right away; start with Mirror by Neomaiya Sol when it is featured there. Search, crate, and stream in-app. Same account, no re-buy.", color: "text-fuchsia-400", feature: 'first-drops' },
  { id: 85, icon: Music, title: "ONE MUSIC CART", text: "Buy a release now or add songs and albums from different artists to one cart. Fixed prices stay fixed; your pay-what-you-want choices stay attached. Stripe charges once and every artist sale is credited separately.", color: "text-fuchsia-300", feature: 'first-drops' },
  { id: 70, kind: 'did-you-know', icon: Globe, title: "YOUR MUSIC HOME IS FREE", text: "Did you know? Your public music home is free for artists, creators, and Music Fans—claim it, choose your identity, skin it, and go live. Pro is for studio tools, not public presence.", color: "text-fuchsia-300" },
  { id: 84, kind: 'did-you-know', icon: Bell, title: "ACTIVITY OPENS THE POST", text: "Did you know? Tap Open on an Activity love or reply and it jumps to that wall post. If it was a comment, the thread opens on that reply — no hunting the wall.", color: "text-emerald-400" },
  { id: 72, icon: Lock, title: "FINISH THIS BAR", text: "Cast one unfinished line from Press Desk. Anyone can reply with a Fit score. Manage your casts from the Scene dock — Finish this bar.", color: "text-emerald-400", feature: 'lock' },
  { id: 73, kind: 'did-you-know', icon: Mic, title: "VOICE ON THE WALL", text: "Did you know? Wall posts and replies can be voice notes — up to 60 seconds. Hit Voice in the composer, then listeners tap Read to see the transcript or Listen to play it back with controls.", color: "text-sky-300" },
  { id: 74, kind: 'did-you-know', icon: Mic, title: "SHEET TAKES", text: "Did you know? The right panel has Takes above Draft Chest — record up to 3 vocal memos per track, 5 minutes each. Play them back anytime you open that sheet.", color: "text-sky-400" },
  { id: 75, icon: Sun, title: "SHEET THEME ONLY", text: "The sun/moon icon on a lyrics sheet is for that sheet only — light, dark, or paper. Leave the track and the rest of the app stays studio dark. Open it again and your sheet choice comes back.", color: "text-amber-300" },
  { id: 76, kind: 'did-you-know', icon: Eye, title: "YOUR POST REACH", text: "Did you know? On posts and reverbs you posted, a light eye on the bottom-right is unique people who saw it. A people count is loves + replies. Only you see those numbers.", color: "text-fuchsia-300" },
  // Aug 2026 — stronger public identity, discovery, support, and portability
  { id: 77, icon: Globe, title: "MUSIC FAN BELONGS HERE", text: "Edit Public Page → Sound Identity lets you choose up to three public labels, including Music Fan, plus genres, moods, influences, region, collaboration status, and your current focus. These labels do not change account permissions.", color: "text-fuchsia-300" },
  { id: 78, icon: Music, title: "FEATURE A LIBRARY TRACK", text: "Your public page can feature a release you published or purchased. Pick the 30-second excerpt; visitors without it hear that preview and see Buy, while owners and purchasers get the full stream.", color: "text-fuchsia-400", feature: 'first-drops' },
  { id: 79, kind: 'did-you-know', icon: Sparkles, title: "DISCOVER EXPLAINS WHY", text: "Did you know? For your taste and For your craft use only public identity choices and tell you why a profile matched. Private lyrics, DNA, listening history, money, Ink, and Pro status stay out of ranking.", color: "text-sky-400" },
  { id: 80, icon: Users, title: "THREE LEVELS OF CONNECTION", text: "Follow is one-way support. Inner Circle is stronger supporter intent. Friends are reciprocal and still control collaboration and Msgs. Manage the first two in Support Circle.", color: "text-emerald-400" },
  { id: 81, icon: Eye, title: "QUALIFIED LISTENER INSIGHTS", text: "Listener Insights includes historical release starts and sales, then tracks verified 80% listens, repeats, completions, sources, and track performance going forward. Old starts stay separate from qualified counts, and named listener histories are not exposed.", color: "text-cyan-400", feature: 'first-drops' },
  { id: 82, kind: 'did-you-know', icon: Trophy, title: "EMERGING CANNOT BE BOUGHT", text: "Did you know? Leaderboard → Emerging (7d) publishes its score and reasons. Qualified listening and real support can move it; price, sales dollars, Ink, Pro, ads, and sponsorship cannot add points.", color: "text-amber-400" },
  { id: 83, icon: Download, title: "SAFE VAULT RESTORE", text: "Export Studio Vault now creates a versioned backup. Import previews the contents and merges collision-safe copies—it never removes or overwrites your current projects.", color: "text-violet-300" },
];

export function StudioTips() {
  const pathname = usePathname();
  const { user } = useAuth();
  const flags = useConfigSurfaceFlags();
  const tipPool = React.useMemo(
    () => STUDIO_TIPS.filter((t) => configSurfaceAllows(t.feature, flags)),
    [flags]
  );
  const [currentTipIdx, setCurrentTipIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTipsSetting, setShowTipsSetting] = useState(true);
  const scheduledPathRef = useRef<string | null>(null);
  const [visitCount, setVisitCount] = useState(0);

  const duration = 12000;

  const dismissTip = useCallback(() => {
    markTipShownThisSession(pathname);
    setIsVisible(false);
    setProgress(0);
    setIsPaused(false);
  }, [pathname]);

  const handleTipsToggle = useCallback(
    (enabled: boolean) => {
      setShowTipsSetting(enabled);
      setStudioTipsEnabled(enabled);
      if (!enabled) dismissTip();
    },
    [dismissTip]
  );

  const getRandomIdx = useCallback((excludeIdx: number) => {
    if (tipPool.length <= 1) return 0;
    let newIdx;
    do { newIdx = Math.floor(Math.random() * tipPool.length); } while (newIdx === excludeIdx && tipPool.length > 1);
    return newIdx;
  }, [tipPool.length]);

  useEffect(() => {
    setIsVisible(false);
    setProgress(0);
    setIsPaused(false);
    scheduledPathRef.current = null;
    setShowTipsSetting(areStudioTipsEnabled());
    clearTrackSheetNavigation(pathname);
    if (isTrackEditorPath(pathname)) {
      const visits = recordTrackSheetEntry(pathname);
      setVisitCount(visits);
    } else {
      setVisitCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    const isTrackEditor = isTrackEditorPath(pathname);

    if (!user || !isTrackEditor) {
      setIsVisible(false);
      return;
    }

    if (!user.lyricsTutorialCompletedAt) {
      setIsVisible(false);
      return;
    }

    if (!areStudioTipsEnabled()) {
      setShowTipsSetting(false);
      return;
    }

    // First open of a sheet (including right after the one-time guided tour) — no tip.
    const visits = getTrackSheetVisitCount(pathname);
    if (visits < 2) {
      return;
    }

    if (hasTipBeenShownThisSession(pathname)) {
      return;
    }

    if (scheduledPathRef.current === pathname) {
      return;
    }

    scheduledPathRef.current = pathname;
    setCurrentTipIdx(getRandomIdx(-1));

    const timer = setTimeout(() => {
      if (hasTipBeenShownThisSession(pathname)) return;
      if (getTrackSheetVisitCount(pathname) < 2) return;
      markTipShownThisSession(pathname);
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [getRandomIdx, pathname, user, visitCount]);

  useEffect(() => {
    if (!isVisible || isPaused) return;
    const step = 100 / (duration / 100);
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + step));
    }, 100);
    return () => clearInterval(interval);
  }, [isVisible, isPaused]);

  useEffect(() => {
    if (isVisible && progress >= 100) {
      dismissTip();
    }
  }, [progress, isVisible, dismissTip]);

  if (!showTipsSetting || !isVisible) return null;
  const currentTip = tipPool[currentTipIdx] ?? tipPool[0];
  if (!currentTip) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-background/70 pointer-events-auto dark:bg-black/40" onClick={dismissTip}>
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 10 }} 
            className="w-full max-w-[420px] pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <Card className="border border-border shadow-[0_30px_60px_rgba(0,0,0,0.65)] bg-card overflow-hidden rounded-xl relative dark:border-white/10 dark:bg-[hsl(216_45%_8%)]">
                <div className="absolute left-12 top-0 bottom-0 w-px bg-rose-500/25 z-0" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent,transparent_31px,rgba(148,163,184,0.06)_31px,rgba(148,163,184,0.06)_32px)] pointer-events-none z-0 dark:opacity-100 opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.03] pointer-events-none z-0" />

                <div className="h-1.5 bg-muted/60 w-full relative z-10 dark:bg-white/5">
                  <motion.div className="h-full bg-primary/80" style={{ width: `${progress}%` }} />
                </div>
                
                <CardContent className="p-8 pl-16 space-y-5 relative z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl bg-muted/60 border border-border shrink-0 shadow-sm dark:bg-black/40 dark:border-white/10", currentTip.color)}>
                                <currentTip.icon className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5">
                                <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground font-code">
                                  {currentTip.kind === 'did-you-know' ? 'Did You Know?' : 'Studio Insight'}
                                </h4>
                                <p className="font-bold text-lg font-headline tracking-tight text-foreground uppercase italic leading-none">{currentTip.title}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/5" onClick={dismissTip}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <p className="text-base text-foreground/85 leading-relaxed font-handwriting font-medium min-h-[80px] dark:text-sky-200/90">
                      {currentTip.text}
                    </p>

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 dark:border-white/10 dark:bg-black/25">
                      <Label htmlFor="studio-tips-toggle" className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer">
                        Show tips when I revisit a sheet
                      </Label>
                      <Switch
                        id="studio-tips-toggle"
                        checked={showTipsSetting}
                        onCheckedChange={handleTipsToggle}
                        aria-label="Show studio tips when revisiting a sheet"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="ghost"
                          className="flex-1 font-bold uppercase tracking-widest text-[9px] h-10 border border-border hover:bg-muted/60 text-muted-foreground dark:border-white/10 dark:hover:bg-white/5"
                          onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? <Play className="mr-2 h-3.5 w-3.5" /> : <div className="mr-2 flex gap-0.5"><div className="w-0.5 h-3 bg-current" /><div className="w-0.5 h-3 bg-current" /></div>}
                            {isPaused ? 'RESUME' : 'PAUSE'}
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1 font-bold uppercase tracking-widest text-[9px] h-10 shadow-md bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                          onClick={dismissTip}
                        >
                            GOT IT
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
