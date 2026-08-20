/**
 * First-session onboarding helpers.
 *
 * After signup (demo handoff or landing), the first lyrics sheet offers an
 * opt-in workstation tour (LyricsTourOfferDialog). Coach marks still help
 * during the first ~30 minutes. Vault tour runs on the first real vault visit
 * (after handoff). Visibility / leaderboard intro follows the vault tour.
 *
 * Replay: Studio Manual (?) → Replay Workstation Tour / Replay Vault Tour.
 */

import type { User } from '@/lib/types';
import type { LyricsTourStep } from '@/lib/studio-onboarding';

export const FRESH_SIGNUP_WINDOW_MS = 30 * 60 * 1000;

export const COACH_FIRST_INK_EVENT = 'b4b:coach-first-ink';
export const COACH_FIRST_ACCEPT_EVENT = 'b4b:coach-first-accept';

export const FIRST_SESSION_GUIDED_PENDING_KEY = 'b4b-first-session-guided';
export const FIRST_SESSION_GUIDED_TOPIC_KEY = 'b4b-first-session-guided-topic';
export const FIRST_SESSION_GUIDED_GENRE_KEY = 'b4b-first-session-guided-genre';

/** Blocks vault tour / privacy while demo→sheet handoff is navigating. */
export const DEMO_HANDOFF_IN_FLIGHT_KEY = 'b4b-demo-handoff-inflight';

/** User was offered the lyrics sheet tour once (accepted or declined). */
export function lyricsTourOfferKey(userId: string): string {
  return `b4b_lyrics_tour_offer_${userId}`;
}

export function hasSeenLyricsTourOffer(userId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(lyricsTourOfferKey(userId)) === '1';
  } catch {
    return true;
  }
}

export function markLyricsTourOfferSeen(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(lyricsTourOfferKey(userId), '1');
  } catch {
    /* ignore */
  }
}

export function markDemoHandoffInFlight(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DEMO_HANDOFF_IN_FLIGHT_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearDemoHandoffInFlight(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DEMO_HANDOFF_IN_FLIGHT_KEY);
  } catch {
    /* ignore */
  }
}

export function isDemoHandoffInFlight(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DEMO_HANDOFF_IN_FLIGHT_KEY) === '1';
  } catch {
    return false;
  }
}

export type CoachMarkStage = 'generate' | 'ink' | 'accept';

export type FirstSessionGuidedContext = {
  topic: string;
  genre: string;
};

/** Flag the next track editor open to run the condensed first-session guided tour. */
export function markFirstSessionGuidedPending(ctx?: Partial<FirstSessionGuidedContext>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(FIRST_SESSION_GUIDED_PENDING_KEY, '1');
    if (ctx?.topic?.trim()) {
      sessionStorage.setItem(FIRST_SESSION_GUIDED_TOPIC_KEY, ctx.topic.trim());
    }
    if (ctx?.genre?.trim()) {
      sessionStorage.setItem(FIRST_SESSION_GUIDED_GENRE_KEY, ctx.genre.trim());
    }
  } catch {
    /* ignore */
  }
}

/** Read and clear the guided-tour handoff from the vault hero. */
export function consumeFirstSessionGuidedPending(): { active: boolean; ctx: FirstSessionGuidedContext } {
  if (typeof window === 'undefined') {
    return { active: false, ctx: { topic: '', genre: '' } };
  }
  try {
    const active = sessionStorage.getItem(FIRST_SESSION_GUIDED_PENDING_KEY) === '1';
    const topic = sessionStorage.getItem(FIRST_SESSION_GUIDED_TOPIC_KEY) || '';
    const genre = sessionStorage.getItem(FIRST_SESSION_GUIDED_GENRE_KEY) || '';
    sessionStorage.removeItem(FIRST_SESSION_GUIDED_PENDING_KEY);
    sessionStorage.removeItem(FIRST_SESSION_GUIDED_TOPIC_KEY);
    sessionStorage.removeItem(FIRST_SESSION_GUIDED_GENRE_KEY);
    return { active, ctx: { topic, genre } };
  } catch {
    return { active: false, ctx: { topic: '', genre: '' } };
  }
}

/** Four-step editor tour for artists who chose Guide me — leads into their first AI bar. */
export function buildFirstSessionGuidedSteps(ctx: FirstSessionGuidedContext): LyricsTourStep[] {
  const topic = ctx.topic.trim();
  const genre = ctx.genre.trim();
  const topicSnippet =
    topic.length > 72 ? `${topic.slice(0, 72)}…` : topic;

  return [
    {
      id: 'first-write',
      target: '[data-tour="lyrics-sheet-focus"], [data-tour="lyrics-sheet"]',
      mobileCardPlacement: 'bottom',
      title: 'Step 1 · Write your opening line',
      body: topic
        ? `Your topic — "${topicSnippet}" — is saved on this track. Drop one raw bar here that captures that energy. Messy is fine; you can edit anytime.`
        : 'Drop one raw opening bar — a feeling, image, or half a thought. This is your contribution; everything after builds from what you write.',
      example: 'Click the line, type, press Enter when you are ready.',
    },
    {
      id: 'first-context',
      target: '[data-tour="lyrics-sheet"]',
      mobileCardPlacement: 'bottom',
      title: 'Step 2 · Your studio context',
      body: genre
        ? `Your ${genre} vibe is set${topic ? ` and your topic is loaded` : ''}. Each row is a bar — click any line to activate it and wake the Bar Workstation below.`
        : 'Each row is a bar. Click your line to activate it — the Bar Workstation appears underneath with rhyme and generation tools.',
    },
    {
      id: 'first-generate',
      target: '[data-tour="bar-workstation"]',
      mobileCardPlacement: 'top',
      title: 'Step 3 · Generate your next bar',
      body: 'With your line selected, tap Generate Next. AI reads your rhyme, vibe, and topic, then suggests two bars that continue your idea.',
      example: 'Costs a little Ink — pick Opt 1 or Opt 2, or regenerate for fresh options.',
    },
    {
      id: 'first-manual',
      target: '[data-tour="ink-balance"]',
      mobileCardPlacement: 'bottom',
      title: 'Step 4 · You are in control',
      body: 'Ink lives in the header. Explore freely — your sheet autosaves. Open Studio Manual (?) anytime to replay this guide or tour DNA, vault, and export.',
      example: 'Account menu → Studio Manual → Replay Workstation Tour.',
    },
  ];
}

/** Fresh signup still inside their first ~30 minutes, tour not yet completed. */
export function isFirstWriteSession(user: Pick<User, 'createdAt' | 'lyricsTutorialCompletedAt'> | null | undefined): boolean {
  if (!user) return false;
  if (user.lyricsTutorialCompletedAt) return false;
  const ageMs = Date.now() - new Date(user.createdAt).getTime();
  return ageMs >= 0 && ageMs < FRESH_SIGNUP_WINDOW_MS;
}

function coachKey(userId: string, stage: CoachMarkStage): string {
  return `b4b_coach_${stage}_${userId}`;
}

export function hasSeenCoachMark(userId: string, stage: CoachMarkStage): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(coachKey(userId, stage)) === '1';
  } catch {
    return true;
  }
}

export function markCoachMarkSeen(userId: string, stage: CoachMarkStage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(coachKey(userId, stage), '1');
  } catch {
    /* ignore */
  }
}

export function dispatchCoachEvent(eventName: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(eventName));
}
