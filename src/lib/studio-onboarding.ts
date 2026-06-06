import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { PRO_VS_VISITOR_MONTHLY_INK_MULTIPLIER } from '@/lib/studio-tiers';
import type { Album } from '@/lib/types';
import {
  getLastWorkedTrackPath,
  isTrackEditorPath,
} from '@/lib/studio-tips-session';

/** Dispatched from Studio Master Manual to replay the lyrics-page guided tour. */
export const REPLAY_GUIDED_TOUR_EVENT = 'b4b-replay-guided-tour';
export const PENDING_TOUR_REPLAY_KEY = 'b4b-pending-tour-replay';
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

/** Last opened track, or the first loose track / album track if none saved yet. */
export function resolveWorkstationTourPath(albums: Album[]): string | null {
  const last = getLastWorkedTrackPath();
  if (last) return last;

  const unassigned = albums.find((a) => a.id === 'unassigned');
  if (unassigned?.tracks?.[0]) {
    return `/albums/unassigned/tracks/${unassigned.tracks[0].id}`;
  }

  for (const album of albums) {
    if (album.id === 'unassigned' || !album.tracks?.length) continue;
    return `/albums/${album.id}/tracks/${album.tracks[0].id}`;
  }

  return null;
}

export function dispatchReplayVaultTour() {
  if (typeof window === 'undefined') return;
  if (isCurrentPath('/')) {
    window.dispatchEvent(new CustomEvent(REPLAY_VAULT_TOUR_EVENT));
    return;
  }
  try {
    sessionStorage.setItem(PENDING_VAULT_TOUR_REPLAY_KEY, '1');
  } catch {
    /* ignore */
  }
  window.location.assign('/');
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
  title: string;
  body: string;
  example?: string;
};

export const LYRICS_PAGE_TOUR_STEPS: LyricsTourStep[] = [
  {
    id: 'paste',
    target: '[data-tour="smart-structure"]',
    title: 'Paste or write lyrics',
    body: 'Start with Smart Structure — paste raw lyrics or notes and we split them into Verse, Hook, and bars.',
    example: 'Paste a voice-memo transcript → structured bars in one click.',
  },
  {
    id: 'sheet',
    target: '[data-tour="lyrics-sheet"]',
    title: 'Your rhyme book',
    body: 'Write line-by-line on the sheet. Two lines = one rhyme bar for Studio Progress and challenges. Click any line to activate the Bar Workstation below.',
    example: 'Think in couplets — each line is its own row, but goals count pairs.',
  },
  {
    id: 'bar-workstation',
    target: '[data-tour="bar-workstation"]',
    title: 'Generate your next bar',
    body: 'Select a bar, then use Generate Next or Previous. AI anchors to your DNA, vibe, and rhyme context.',
    example: 'Stuck mid-verse? One bar at a time — ~10 Ink per suggestion.',
  },
  {
    id: 'rhyme-pulse',
    target: '[data-tour="rhyme-pulse"]',
    title: 'Rhyme Pulse',
    body: 'Scan your sheet for rhyme families and turn on highlighting so punchlines land clean.',
  },
  {
    id: 'generation',
    target: '[data-tour="generation-workstation"]',
    title: 'Generation Workstation',
    body: 'For full drafts or DNA remix pivots, open the Generation Workstation (cost scales with bar count).',
  },
  {
    id: 'dna',
    target: '[data-tour="dna-suite"]',
    title: 'Creative DNA',
    body: 'Five direction questions keep every suggestion on-theme. Use the folder icon to open the DNA Vault — expand a preset to ⚡ inject one strain or ↻ load the full profile.',
    example: 'Free = system presets. Pro = archive YOUR extractions to the vault.',
  },
  {
    id: 'dna-drop',
    target: '[data-tour="dna-drop"]',
    title: 'DNA Drop (Pro)',
    body: 'Publish a shareable project link from the left panel. Collaborators import your lyrics, structure, DNA, and vibe after they sign in.',
    example: 'Drop a link for feedback — they merge it into their vault.',
  },
  {
    id: 'ink',
    target: '[data-tour="ink-balance"]',
    title: 'Ink fuel',
    body: 'Residency Ink refills monthly; permanent Ink never expires. Costs show on AI buttons before you click.',
  },
  {
    id: 'save',
    target: '[data-tour="track-status"]',
    title: 'Save & export',
    body: 'Your track saves as you edit. Export PDF anytime. Cloud sync across devices is included with Studio Pro.',
  },
];

export const FREE_TIER_EXPECTATIONS = {
  headline: 'Visitor — full AI on free Ink',
  body: `Generate Next Line, Smart Structure, all 9 Creative Effects, and DNA & REMIX all run on your residency Ink. Load system DNA/Vibe/Style presets anytime. Studio Pro is for power users: custom strain saves, Performance Mode, Freestyle, vault import/export, DNA Drop links, and ~${PRO_VS_VISITOR_MONTHLY_INK_MULTIPLIER}× monthly residency Ink.`,
  dismissKey: 'b4b-free-tier-expectations-dismissed',
} as const;

export const PRO_TRIAL_BANNER = {
  headline: 'Pro trial',
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
    title: 'The Vault',
    body: 'Your studio home — albums, loose tracks, and every project blueprint live here.',
  },
  {
    id: 'vault-create',
    target: '[data-tour="vault-create"]',
    title: 'Create a project',
    body: 'Spin up a Concept Album (shared DNA across tracks) or capture a Loose Track for quick ideas.',
    example: 'Album = cohesive project. Loose track = single song, no album inherit.',
  },
  {
    id: 'vault-collection',
    target: '[data-tour="vault-collection"]',
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
    title: 'Studio progress',
    body: 'XP, rank, weekly goals, and trophies live here. On phone it sits under the vault header; on desktop look for the trophy bubble on the left.',
    example: 'Tap the header anytime to expand or collapse — View all opens your full progress board.',
  },
  {
    id: 'vault-search',
    target: '[data-tour="vault-search"]',
    title: 'Search the vault',
    body: 'Find lyrics across every album and track. Use quotes for exact phrases.',
    example: '"midnight drive" finds that exact line anywhere in your vault.',
  },
  {
    id: 'ink',
    target: '[data-tour="ink-balance"]',
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
