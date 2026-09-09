import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { getVisitorInkGrantSummary } from '@/lib/ink-grants';
import { FREE_ALBUM_LIMIT, FREE_TRACK_LIMIT, SIGNUP_INK, PRO_FEATURE_PREVIEW_DAYS } from '@/lib/subscription';
import { AI_COSTS } from '@/lib/costs';
import { GUEST_DEMO_MAX_USES } from '@/lib/guest-try';
import type { Album } from '@/lib/types';
import {
  getLastWorkedTrackPath,
  isTrackEditorPath,
} from '@/lib/studio-tips-session';
import { resolveWorkstationTrackPath } from '@/lib/workstation-path';
import { vaultHref } from '@/lib/scene-home';

/** Dispatched from Studio Master Manual to replay the lyrics-page guided tour. */
export const REPLAY_GUIDED_TOUR_EVENT = 'b4b-replay-guided-tour';
export const PENDING_TOUR_REPLAY_KEY = 'b4b-pending-tour-replay';
export const REPLAY_TRY_SHEET_TOUR_EVENT = 'b4b-replay-try-sheet-tour';
export const TRY_SHEET_TOUR_SEEN_KEY = 'b4b-try-sheet-tour-seen';
export const REPLAY_VAULT_TOUR_EVENT = 'b4b-replay-vault-tour';
export const PENDING_VAULT_TOUR_REPLAY_KEY = 'b4b-pending-vault-tour-replay';

function normalizePath(path: string): string {
  const base = path.split('?')[0].split('#')[0];
  return base.endsWith('/') && base.length > 1 ? base.slice(0, -1) : base;
}

function isCurrentPath(path: string): boolean {
  if (typeof window === 'undefined') return false;
  return normalizePath(window.location.pathname) === normalizePath(path);
}

/** Last opened track (if still in vault), or the first loose / album track. */
export function resolveWorkstationTourPath(albums: Album[]): string | null {
  return resolveWorkstationTrackPath(albums);
}

export function dispatchReplayVaultTour() {
  if (typeof window === 'undefined') return;
  if (isCurrentPath(vaultHref())) {
    window.dispatchEvent(new CustomEvent(REPLAY_VAULT_TOUR_EVENT));
    return;
  }
  try {
    sessionStorage.setItem(PENDING_VAULT_TOUR_REPLAY_KEY, '1');
  } catch {
    /* ignore */
  }
  window.location.assign(vaultHref());
}

export function dispatchReplayGuidedTour(trackPath?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const target = trackPath?.trim() || getLastWorkedTrackPath();
  if (!target || !isTrackEditorPath(target)) return false;

  if (isCurrentPath(target)) {
    window.dispatchEvent(new CustomEvent(REPLAY_GUIDED_TOUR_EVENT));
    return true;
  }

  try {
    sessionStorage.setItem(PENDING_TOUR_REPLAY_KEY, '1');
  } catch {
    /* ignore */
  }
  window.location.assign(target);
  return true;
}

export type LyricsTourStep = {
  id: string;
  target: string;
  /** Smaller highlight on phone — avoids full-panel spotlights that fight the tour card. */
  mobileTarget?: string;
  /** On mobile, pin the tour card above or below the spotlight (defaults to auto). */
  mobileCardPlacement?: 'top' | 'bottom';
  title: string;
  body: string;
  example?: string;
};

export const LYRICS_PAGE_TOUR_STEPS: LyricsTourStep[] = [
  {
    id: 'paste',
    target: '[data-tour="smart-structure"]',
    mobileCardPlacement: 'bottom',
    title: 'Paste or write lyrics',
    body: 'Start with Smart Structure — paste raw lyrics or notes and we split them into Verse, Hook, and bars.',
    example: 'Paste a voice-memo transcript → structured bars in one click.',
  },
  {
    id: 'sheet',
    target: '[data-tour="lyrics-sheet"]',
    mobileTarget: '[data-tour="lyrics-sheet-focus"]',
    mobileCardPlacement: 'bottom',
    title: 'Your rhyme book',
    body: 'Write line-by-line on the sheet. Tap a line to select it — that line is what Generate Next / Previous writes off of. Or just type your own.',
    example: 'Think in couplets — each row is a line, goals count pairs.',
  },
  {
    id: 'bar-workstation',
    target: '[data-tour="bar-workstation"]',
    mobileCardPlacement: 'top',
    title: 'Bar Workstation',
    body: 'Select a line, then Next writes under it and Previous writes above it. Type in the box to stay in your own voice. Suggestions land here to Accept or dismiss.',
    example: 'Stuck mid-verse? One bar at a time — Next / Previous costs Ink (shown on the button).',
  },
  {
    id: 'rhyme-pulse',
    target: '[data-tour="rhyme-pulse"]',
    mobileCardPlacement: 'bottom',
    title: 'Rhyme Pulse',
    body: 'Scan your sheet for rhyme families and turn on highlighting so punchlines land clean.',
  },
  {
    id: 'cowriter',
    target: '[data-tour="cowriter-panel"]',
    mobileTarget: '[data-tour="cowriter-panel"]',
    mobileCardPlacement: 'bottom',
    title: 'Co-Writer rails',
    body: 'Right panel = the rails AI follows. Each block has a switch. Off = ignored. On = used. Stack DNA + Vibe + Intents — Generate Next reads all of them together.',
    example: 'Flip only Vibe for a beat-first line. Add Intents when you need a punchline in the bar.',
  },
  {
    id: 'dna',
    target: '[data-tour="dna-suite"]',
    mobileTarget: '[data-tour="dna-suite-header"]',
    title: 'DNA Suite',
    body: 'Five Creative Direction questions (world, emotion, trigger, message, tone). Toggle the switch to include them. Type here, or extract in DNA & REMIX then edit.',
    example: '“It takes place in a neon motel after last call.”',
  },
  {
    id: 'vibe',
    target: '[data-tour="vibe-suite"]',
    title: 'Track Vibe',
    body: 'Genre, BPM, mood, instrumentation. Switch on so Next / drafts sound like the record, not a generic bar. Copy instrumentation into Suno or Udio.',
    example: '84 BPM · dark trap · 808s, choir pad, clipped hats.',
  },
  {
    id: 'intents',
    target: '[data-tour="intents-suite"]',
    title: 'Intents',
    body: 'Punchlines you want in the song. Check any mix. The middle arrow Precision-Locks the next line to end on that exact phrase.',
    example: 'Add “still on the porch” → check it → Next tries to land it.',
  },
  {
    id: 'guardrails',
    target: '[data-tour="guardrails-suite"]',
    title: 'Guardrails',
    body: 'Forbidden words / must-include lists and themes to avoid. Switch on only when you need the model boxed in.',
    example: 'Must include “river.” Forbid a name you do not want in the verse.',
  },
  {
    id: 'style',
    target: '[data-tour="style-suite"]',
    title: 'Style DNA',
    body: 'Your cadence / vocabulary profile. Switch on to color gens like you. Train or load a preset, then Generate Next with DNA + Vibe + Style stacked.',
    example: 'Style on + DNA on + one Intent = the usual “sounds like me” stack.',
  },
  {
    id: 'creative-effects',
    target: '[data-tour="creative-effects"]',
    title: 'Creative Effects',
    body: 'Specialized lyric tools — simile, twist, POV, and the rest. Pick one from the dropdown; what it does and how to fill the fields appears right under the picker. Run it, then grab the lines from Scratch Pad onto the sheet. You do not need to memorize each tool — the description is on the one you select.',
    example: 'Pick Twist, type a common phrase, run — then paste the best line into a bar.',
  },
  {
    id: 'sheet-takes',
    target: '[data-tour="sheet-takes"]',
    title: 'Takes',
    body: 'Record up to 3 vocal memos on this track — a scratch hook, a melody, a reference vocal. Play them back while you write. Takes stay private on the sheet. They are not the song you sell.',
    example: 'Hit record, spit the hook, stop. Keep writing to that take.',
  },
  {
    id: 'generation',
    target: '[data-tour="generation-workstation"]',
    mobileCardPlacement: 'bottom',
    title: 'Generation Workstation',
    body: 'Full-song drafts and DNA & REMIX live here — not on the sheet Next button. Open it, then tap the ? on Select Workflow Mode for a walkthrough of each path.',
    example: 'Studio Draft writes sections from your rails. DNA & REMIX extracts a voice from pasted lyrics or this sheet.',
  },
  {
    id: 'song-structure',
    target: '[data-tour="song-structure"]',
    mobileCardPlacement: 'bottom',
    title: 'Structure (left)',
    body: 'This is the song map: Verse, Hook, Bridge, and the rest. Tap a section to jump the sheet there. Add Section to grow the form. Arrows reorder; trash removes. This is not Smart Structure — that paste tool lives on the center sheet.',
    example: 'Add Hook, tap it, write the chorus on those lines.',
  },
  {
    id: 'press-song',
    target: '[data-tour="press-song"]',
    mobileCardPlacement: 'bottom',
    title: 'Release song',
    body: 'This opens the music release desk: upload audio, set a price, confirm you have the rights, then publish the release. Free on every signed-in account. DNA Drop below is the separate Pro lyric page. You can also start with New release on The Scene.',
    example: 'Finished mix → Release song → set price → live on The Scene.',
  },
  {
    id: 'dna-drop',
    target: '[data-tour="dna-drop"]',
    title: 'DNA Drop (Pro)',
    body: 'Publish a shareable lyric snapshot—lyrics, structure, DNA, and vibe. Collaborators import it after they sign in. This is separate from Release song; audio and price stay in Release Catalog.',
    example: 'Drop a link for feedback — they merge it into their vault.',
  },
  {
    id: 'collab-sheet',
    target: '[data-tour="collab-sheet"]',
    mobileCardPlacement: 'bottom',
    title: 'Collab Sheet (Pro)',
    body: 'Share a live editable sheet with friends on this track. Edits sync in real time — presence shows who is on the page, and chat opens from the bottom drawer. Only the owner can invite more people.',
    example: 'Open Collab Sheet → invite a friend → write the hook together live.',
  },
  {
    id: 'ink',
    target: '[data-tour="ink-balance"]',
    mobileCardPlacement: 'bottom',
    title: 'Ink fuel',
    body: 'Residency Ink refills monthly; permanent Ink never expires. Costs show on AI buttons before you click.',
  },
  {
    id: 'save',
    target: '[data-tour="track-status"]',
    mobileTarget: '[data-tour="track-export"]',
    mobileCardPlacement: 'bottom',
    title: 'Save & export',
    body: 'Your track saves as you edit. Export PDF with Studio Pro — your work auto-saves in the demo vault.',
  },
];

export function hasSeenTrySheetTour(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(TRY_SHEET_TOUR_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTrySheetTourSeen() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRY_SHEET_TOUR_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function dispatchReplayTrySheetTour() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REPLAY_TRY_SHEET_TOUR_EVENT));
}

/** Logged-out try sheet — sells the booth, not the signed-in vault tour. */
export const TRY_SHEET_TOUR_STEPS: LyricsTourStep[] = [
  {
    id: 'try-sheet',
    target: '[data-tour="lyrics-sheet"]',
    mobileTarget: '[data-tour="lyrics-sheet-focus"]',
    mobileCardPlacement: 'bottom',
    title: 'This is the real sheet',
    body: 'Same booth you get after signup. Tap a line to select it, or type your own bar. Generate Next / Previous always writes off the line that is selected — not a random verse.',
    example: 'Tap line 01, type a bar. That line is now the seed.',
  },
  {
    id: 'try-workstation',
    target: '[data-tour="bar-workstation"]',
    mobileCardPlacement: 'top',
    title: 'Writing workstation',
    body: 'Bottom strip is the Bar Workstation. Next writes under the selected line. Previous writes above it. Type in the box if you do not want AI. Suggestions show here to Accept.',
    example: `This try sheet gives ${GUEST_DEMO_MAX_USES} free Generate Next / starter assists. After signup, Next is ${AI_COSTS.generateNextLine} Ink each.`,
  },
  {
    id: 'try-rhyme',
    target: '[data-tour="rhyme-pulse"]',
    mobileCardPlacement: 'bottom',
    title: 'Rhyme Pulse is free here',
    body: 'Highlights matching end-rhymes as you write. On the try sheet it does not spend Ink.',
  },
  {
    id: 'try-cowriter',
    target: '[data-tour="cowriter-panel"]',
    mobileCardPlacement: 'bottom',
    title: 'Co-Writer (right panel)',
    body: 'These are the rails. Each card has a switch — off means AI ignores it. Turn several on and they stack. Generate Next reads every switch that is on.',
    example: 'DNA + Vibe on, Guardrails off = world + beat, no word bans.',
  },
  {
    id: 'try-dna',
    target: '[data-tour="dna-suite"]',
    mobileTarget: '[data-tour="dna-suite-header"]',
    title: 'DNA Suite',
    body: 'Five questions: world, emotion, trigger, message, tone. Flip the switch on, type a world — Next will write like it is in that room.',
    example: '“It takes place in a neon motel after last call.”',
  },
  {
    id: 'try-vibe',
    target: '[data-tour="vibe-suite"]',
    title: 'Track Vibe',
    body: 'Genre, BPM, feel, instrumentation. Switch on so the bar sounds like a record, not a poem. After signup you can save vibes; here, flip it on and try Next.',
    example: 'Dark trap · 84 BPM · 808s and a choir pad.',
  },
  {
    id: 'try-intents',
    target: '[data-tour="intents-suite"]',
    title: 'Intents',
    body: 'Punchlines you want in the song. Add one, check it, then Generate Next — the model tries to weave it. The arrow lock forces the line to end on that exact phrase.',
    example: 'Intent: “still on the porch.”',
  },
  {
    id: 'try-guardrails',
    target: '[data-tour="guardrails-suite"]',
    title: 'Guardrails',
    body: 'Words to forbid or force. Switch off unless you need the box. Combining Guardrails + DNA is how you keep a clean concept.',
  },
  {
    id: 'try-style',
    target: '[data-tour="style-suite"]',
    title: 'Style DNA',
    body: 'Your cadence profile. Switch on so gens clip like you. Load a preset or train later — on the try sheet, toggling it on is enough to feel the stack.',
  },
  {
    id: 'try-effects',
    target: '[data-tour="creative-effects"]',
    title: 'Creative Effects',
    body: 'Specialized lyric tools. Pick one from the dropdown — what it does is written right under the picker, so you do not need a list. Fill the fields, run it, then pull lines from Scratch Pad. Running one may ask you to sign up; browsing the picker is free.',
    example: 'Open the dropdown, pick any tool, read the blurb, then decide if you want to run it.',
  },
  {
    id: 'try-takes',
    target: '[data-tour="sheet-takes"]',
    title: 'Takes',
    body: 'Vocal memos on this track — up to 3, 5 min each. Record a scratch hook or melody and play it back while you write. Sign in to save them. Takes are private booth notes, not the song you sell.',
    example: 'Hit record, spit the hook, stop. Sign in to keep the take on this track.',
  },
  {
    id: 'try-combine',
    target: '[data-tour="generate-next"], [data-tour="bar-workstation"]',
    mobileCardPlacement: 'top',
    title: 'Select a line, then generate',
    body: 'Rails do nothing until you pick a line and tap Next (or Previous). Combine DNA + Vibe + an Intent, tap line 02, hit Next. That is the product.',
    example: 'No line selected = Next has nothing to write off of.',
  },
  {
    id: 'try-left',
    target: '[data-tour="left-panel"]',
    mobileTarget: '[data-tour="generation-workstation"]',
    mobileCardPlacement: 'bottom',
    title: 'Left panel',
    body: 'Workstation for the whole song: titles, paste, vibe suggester, scene prompt, export. Structure and Release song are next—the sheet stays center.',
  },
  {
    id: 'try-structure',
    target: '[data-tour="song-structure"]',
    mobileCardPlacement: 'bottom',
    title: 'Structure (left)',
    body: 'Song map: Verse, Hook, Bridge. Tap a section to jump the sheet there. Add Section to grow the form. Arrows reorder; trash removes. Smart Structure on the center sheet is the paste-and-split tool — this card is the live outline.',
    example: 'Add Hook, tap it, write the chorus on those lines.',
  },
  {
    id: 'try-press',
    target: '[data-tour="press-song"]',
    mobileCardPlacement: 'bottom',
    title: 'Release song',
    body: 'This is the music release desk. Release song uploads the audio, sets a price, and publishes it for listening or purchase. DNA Drop is the lyric link, while Takes stay private. On the try sheet it asks you to create an account first.',
    example: 'Write here. Mix elsewhere. Sign up, release the song.',
  },
  {
    id: 'try-workstation-locked',
    target: '[data-tour="generation-workstation"]',
    mobileCardPlacement: 'bottom',
    title: 'Generation Workstation',
    body: `Locked on the try sheet. After you sign up you get a ${PRO_FEATURE_PREVIEW_DAYS * 24}-hour Pro preview — Full Studio Draft (whole song from your rails) and DNA & REMIX (paste a verse or sync this sheet, extract the voice, generate a new draft). Inside that window, tap ? for a visual of each mode.`,
    example: 'Sheet Next = one bar. Workstation = the whole record or a remix pivot.',
  },
  {
    id: 'try-ink',
    target: '[data-tour="try-ink"]',
    mobileCardPlacement: 'bottom',
    title: 'Ink is the fuel',
    body: `Ink pays for AI: Next / Previous (${AI_COSTS.generateNextLine} Ink), Rhyme Pulse (${AI_COSTS.findRhymes}), drafts (scales with bars), titles, vibe, scene. Residency Ink refills on a plan; Raw Ink you buy never expires. This try page uses ${GUEST_DEMO_MAX_USES} free demo assists — not your real Ink pool.`,
    example: `Sign up free → ${SIGNUP_INK} Ink in the tank, plus ${PRO_FEATURE_PREVIEW_DAYS * 24} hours to open Generation Workstation.`,
  },
];

export const WORKSTATION_MODE_TOUR_STEPS: LyricsTourStep[] = [
  {
    id: 'ws-modes',
    target: '[data-tour="ws-mode-select"]',
    mobileTarget: '[data-tour="ws-mode-heading"]',
    mobileCardPlacement: 'bottom',
    title: 'Two ways in',
    body: 'Generation Workstation is not Generate Next. Pick a mode, calibrate the hub, then synthesize. Costs scale with how many bars you enable.',
  },
  {
    id: 'ws-draft',
    target: '[data-tour="ws-mode-draft"]',
    mobileCardPlacement: 'bottom',
    title: 'Full Studio Draft',
    body: 'Writes a whole song onto the sheet from whatever rails are on (DNA, vibe, intents, guardrails, style). You set structure — Verse 16 / Hook 8 — then generate.',
    example: 'Example: DNA world = “rain on the block,” Vibe = 90 BPM boom-bap, Intents checked. Draft fills Verse / Hook / Bridge in that voice. Review, keep, or stash to Draft Chest.',
  },
  {
    id: 'ws-remix',
    target: '[data-tour="ws-mode-remix"]',
    mobileCardPlacement: 'top',
    title: 'DNA & REMIX',
    body: 'Extract a Creative DNA from pasted lyrics, a poem, or this sheet (Sync Current Lyrics). Analysis Step lets you save the profile or ⚡ inject one strain, then generate a new draft in that extracted voice.',
    example: 'Example: paste a verse you love → extract → ⚡ inject Message/Truth into this remix → generate. Same melody-of-thought, new bars.',
  },
];

export const FREE_TIER_EXPECTATIONS = {
  headline: 'Visitor — demo-scale studio',
  body: `Free demo: ${FREE_ALBUM_LIMIT} album, ${FREE_TRACK_LIMIT} tracks. AI tools run on your Ink (${getVisitorInkGrantSummary()}). Artist Home, The Pressing, The Block, and song/album music releases are included. Pro unlocks unlimited catalog, custom vault saves, Imprint mix controls, DNA Strain Mixer, Pro AI studio tools, Performance, Freestyle, Collab Sheet, import/export, and DNA Drop lyric links. Offline Library downloads work for music you own or purchased on any tier. Load-only DNA/Vibe/Style presets on Visitor.`,
  dismissKey: 'b4b-free-tier-expectations-dismissed',
} as const;

export const PRO_TRIAL_BANNER = {
  headline: 'Pro preview',
  dismissKey: 'b4b-pro-trial-banner-dismissed',
} as const;

export async function markLyricsTutorialComplete(userId: string) {
  await setDoc(
    doc(db, 'users', userId),
    { lyricsTutorialCompletedAt: new Date().toISOString() },
    { merge: true }
  );
}

export const VAULT_PAGE_TOUR_STEPS: LyricsTourStep[] = [
  {
    id: 'vault-header',
    target: '[data-tour="vault-header"]',
    mobileCardPlacement: 'bottom',
    title: 'The Vault',
    body: 'Your studio home — albums, loose tracks, and every project blueprint live here.',
  },
  {
    id: 'vault-create',
    target: '[data-tour="vault-create"]',
    mobileCardPlacement: 'bottom',
    title: 'Create a project',
    body: 'Spin up a Concept Album (shared DNA across tracks) or capture a Loose Track for quick ideas.',
    example: 'Album = cohesive project. Loose track = single song, no album inherit.',
  },
  {
    id: 'vault-collection',
    target: '[data-tour="vault-collection"]',
    mobileCardPlacement: 'bottom',
    title: 'Your collection',
    body: 'Albums show as vinyl records. Click one to open its track list, then open a sheet to write and generate bars.',
  },
  {
    id: 'vault-loose-tracks',
    target: '[data-tour="vault-loose-tracks"]',
    title: 'Loose tracks',
    body: 'Singles and drafts that are not on an album yet. Move them into an album anytime from the ⋮ menu.',
  },
  {
    id: 'vault-progress',
    target: '[data-tour="vault-progress-mobile"], [data-tour="vault-progress-desktop"]',
    mobileCardPlacement: 'bottom',
    title: 'Studio progress',
    body: 'XP, rank, weekly goals, and trophies live here. On phone it sits under the vault header; on desktop look for the trophy bubble on the left.',
    example: 'Tap the header anytime to expand or collapse — View all opens your full progress board.',
  },
  {
    id: 'vault-social-dock',
    target: '[data-tour="vault-social-dock-mobile"], [data-tour="vault-social-dock-desktop"]',
    mobileCardPlacement: 'bottom',
    title: 'Artist Home & Activity',
    body: 'These two buttons are on the right on a wide screen (under the vault header on phone). Artist Home turns your public page on or off and opens Edit Public Page. Activity is your inbox — loves, replies, and friend requests. A green badge means something new.',
    example: 'Tap Artist Home for visibility and your akasheet.com link. Activity opens the inbox.',
  },
  {
    id: 'vault-search',
    target: '[data-tour="vault-search"]',
    mobileCardPlacement: 'bottom',
    title: 'Search the vault',
    body: 'Find lyrics across every album and track. Use quotes for exact phrases.',
    example: '"midnight drive" finds that exact line anywhere in your vault.',
  },
  {
    id: 'ink',
    target: '[data-tour="ink-balance"]',
    mobileCardPlacement: 'bottom',
    title: 'Ink fuel',
    body: 'Residency Ink refills monthly; permanent Ink never expires. Tap to open the Ink Store or buy packs.',
  },
];

export async function markVaultTutorialComplete(userId: string) {
  await setDoc(
    doc(db, 'users', userId),
    { vaultTutorialCompletedAt: new Date().toISOString() },
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Scene home tour — first-visit walkthrough of the signed-in social lobby.
// ---------------------------------------------------------------------------

export const REPLAY_SCENE_TOUR_EVENT = 'b4b-replay-scene-tour';
export const PENDING_SCENE_TOUR_REPLAY_KEY = 'b4b-pending-scene-tour-replay';

export function dispatchReplaySceneTour() {
  if (typeof window === 'undefined') return;
  if (isCurrentPath('/')) {
    window.dispatchEvent(new CustomEvent(REPLAY_SCENE_TOUR_EVENT));
    return;
  }
  try {
    sessionStorage.setItem(PENDING_SCENE_TOUR_REPLAY_KEY, '1');
  } catch {
    /* ignore */
  }
  window.location.assign('/');
}

export const SCENE_HOME_TOUR_STEPS: LyricsTourStep[] = [
  {
    id: 'scene-header',
    target: '[data-tour="scene-header"]',
    mobileCardPlacement: 'bottom',
    title: 'Welcome to the Scene',
    body: 'This is your home now — your friends, drops from across the site, and quick lanes into the studio. Everything you make shows up here.',
  },
  {
    id: 'scene-composer',
    target: '[data-tour="scene-composer"]',
    mobileCardPlacement: 'bottom',
    title: 'Drop a bar to your wall',
    body: 'Post a line, a thought, or a link. Friends see it on their Scene, and visitors see it on your Artist Home wall.',
    example: 'Add a YouTube / TikTok / Instagram / Facebook link and it plays inline.',
  },
  {
    id: 'scene-booth',
    target: '[data-tour="scene-booth"]',
    mobileCardPlacement: 'bottom',
    title: 'Your Booth',
    body: 'Your public music home at a glance. Flip it live to get on the map, then choose Artist, creator, or Music Fan labels, add your Sound Identity, feature an owned or purchased track, and arrange your page. Private lyrics are never published.',
    example: 'Edit Public Page is where identity, the featured track, and customizing happen.',
  },
  {
    id: 'scene-feed',
    target: '[data-tour="scene-feed"]',
    mobileCardPlacement: 'top',
    title: 'Your Scene portals',
    body: 'Your Block and Discover now open as full-screen, one-card-at-a-time streams. The bubbles jump between people, side controls move between cards, and every post keeps its love, reply, Reverb, share, player, and profile actions.',
    example: 'Discover uses public taste and craft signals to explain why an artist, post, or Drop matches you.',
  },
  {
    id: 'scene-progress',
    target: '[data-tour="scene-progress-mobile"], [data-tour="scene-progress-desktop"]',
    mobileCardPlacement: 'bottom',
    title: 'Studio progress',
    body: 'XP, rank, streak, and weekly goals. Writing bars in the studio feeds all of it — and your rank shows on your page and the leaderboard.',
  },
  {
    id: 'scene-nav',
    target: '[data-tour="scene-nav-mobile"], [data-tour="scene-nav-desktop"]',
    mobileCardPlacement: 'bottom',
    title: 'The Vault is where you write',
    body: 'The portal hub opens The Vault, Library, Artist Home, Your Circle, Listener Insights, and Support Circle. Library also includes House releases you can use to test the player. New release below the hub is how you put a song or album on sale — Free, and not DNA Drop (that lyric link is Pro). The Scene is the block; the Vault is the booth.',
    example: 'Try Mirror by Neomaiya Sol in Library when it is featured there. Replay this tour anytime from the Studio Manual (?).',
  },
];

export async function markSceneTutorialComplete(userId: string) {
  await setDoc(
    doc(db, 'users', userId),
    { sceneTutorialCompletedAt: new Date().toISOString() },
    { merge: true }
  );
}
