import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';

/** Dispatched from Studio Master Manual to replay the lyrics-page guided tour. */
export const REPLAY_GUIDED_TOUR_EVENT = 'b4b-replay-guided-tour';
export const PENDING_TOUR_REPLAY_KEY = 'b4b-pending-tour-replay';

export function dispatchReplayGuidedTour() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_TOUR_REPLAY_KEY, '1');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(REPLAY_GUIDED_TOUR_EVENT));
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
    body: 'Write bar-by-bar on the sheet. Click any line to activate the Bar Workstation below.',
    example: 'Each bar is its own line — think in bars, not paragraphs.',
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
    body: 'Five direction questions keep every suggestion on-theme. Free tier loads system presets; Pro archives your own strains.',
    example: 'Free = try the full workflow. Pro = save YOUR DNA to the vault.',
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
  headline: 'Free tier — full workflow, system presets',
  body: 'DNA & REMIX, Generation Workstation, and bar-by-bar AI all work on free Ink. You can load system DNA/Vibe/Style presets. Studio Pro unlocks saving YOUR custom strains, unlimited projects, and cloud sync.',
  dismissKey: 'b4b-free-tier-expectations-dismissed',
} as const;

export async function markLyricsTutorialComplete(userId: string) {
  await setDoc(
    doc(db, 'users', userId),
    { lyricsTutorialCompletedAt: new Date().toISOString() },
    { merge: true }
  );
}
