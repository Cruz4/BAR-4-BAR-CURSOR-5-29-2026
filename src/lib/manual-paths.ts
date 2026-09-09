import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import {
  BLOCK_SECTION_ID,
  DISCOVER_SECTION_ID,
  FIND_ARTISTS_SECTION_ID,
  SCENE_BOOTH_ID,
  vaultHref,
} from '@/lib/scene-home';
import { WALL_CLIP_MAX_SECONDS } from '@/lib/profile/wall-clips';
import { APP_ROOT_SEGMENTS } from '@/lib/profile/profile-slug';
import { getLastWorkedTrackPath } from '@/lib/studio-tips-session';

export const MANUAL_PATH_STORAGE_KEY = 'b4b-manual-path';
export const MANUAL_PATH_START_EVENT = 'b4b:manual-path-start';
export const MANUAL_PATH_STOP_EVENT = 'b4b:manual-path-stop';
export const RELEASE_PUBLISHED_EVENT = 'b4b:release-published';
export const OPEN_STUDIO_MANUAL_EVENT = 'b4b:open-studio-manual';

export type ManualPathGroup = 'do' | 'then' | 'also' | 'words';
export type ManualPathTier = 'free' | 'pro' | 'ink';

export type ManualPathStep = {
  id: string;
  title: string;
  body: string;
  href?: string;
  target?: string;
  action?: 'open-lathe' | 'open-lathe-album';
  /** True when the user is already on this step's screen. */
  isDone?: (pathname: string) => boolean;
  doneEvent?: string;
};

export type ManualPathLane = {
  id: string;
  title: string;
  blurb: string;
  tier: ManualPathTier;
  group: ManualPathGroup;
  steps: ManualPathStep[];
};

export type ManualPathSession = {
  laneId: string;
  stepId: string;
};

export type OpenStudioManualDetail = {
  tab?: 'paths' | 'start-here' | 'scene' | 'first-drops' | 'tiering';
};

function normalizePath(path: string): string {
  const base = path.split('?')[0].split('#')[0];
  return base.endsWith('/') && base.length > 1 ? base.slice(0, -1) : base;
}

function isScene(pathname: string): boolean {
  return normalizePath(pathname) === '/';
}

function isVaultish(pathname: string): boolean {
  const p = normalizePath(pathname);
  return p === '/vault' || p.startsWith('/albums/');
}

function isSheet(pathname: string): boolean {
  return /\/albums\/[^/]+\/tracks\/[^/]+$/.test(normalizePath(pathname));
}

function isArtistHome(pathname: string): boolean {
  const p = normalizePath(pathname);
  const first = p.split('/').filter(Boolean)[0];
  return Boolean(first) && !APP_ROOT_SEGMENTS.has(first);
}

export const MANUAL_PATHS: ManualPathLane[] = [
  {
    id: 'press-song',
    title: 'Press a song live',
    blurb: 'Scene → New release → upload audio → price → press live. Free. Not a DNA Drop.',
    tier: 'free',
    group: 'do',
    steps: [
      {
        id: 'scene',
        title: 'Open The Scene',
        body: 'Signed-in home. New release lives on Your Booth and on the dock — not in The Vault.',
        href: `/#${SCENE_BOOTH_ID}`,
        target: '[data-tour="scene-booth"]',
        isDone: isScene,
      },
      {
        id: 'new-release',
        title: 'Open New release',
        body: 'Tap New release on Your Booth or the dock. This sells song or album audio.',
        href: `/#${SCENE_BOOTH_ID}`,
        target: '[data-tour="scene-press-song"]',
        action: 'open-lathe',
        isDone: isScene,
      },
      {
        id: 'upload',
        title: 'Upload the recording',
        body: 'Start a single song, or an album then add tracks. Visitor limit: 1 album and 2 tracks.',
        action: 'open-lathe',
        target: '#release-step-publish',
      },
      {
        id: 'price',
        title: 'Set a price',
        body: 'Fixed price or pay-what-you-want. Fans pay money for music — never Ink.',
        action: 'open-lathe',
        target: '#release-step-publish',
      },
      {
        id: 'press-live',
        title: 'Press live',
        body: 'Publish the release. DNA Drop is the separate Pro lyric link — do not mix them up.',
        action: 'open-lathe',
        target: '#release-step-publish',
        doneEvent: RELEASE_PUBLISHED_EVENT,
      },
    ],
  },
  {
    id: 'post-clip',
    title: 'Post a photo or clip',
    blurb: `Camera or files on Your Booth, The Block, or Artist Home. Clips up to ${WALL_CLIP_MAX_SECONDS}s. Free.`,
    tier: 'free',
    group: 'do',
    steps: [
      {
        id: 'wall',
        title: 'Open a wall',
        body: 'Your Booth on The Scene, Your Block, or your Artist Home wall — same Camera and Photo buttons.',
        href: `/#${SCENE_BOOTH_ID}`,
        target: '[data-tour="scene-composer"]',
        isDone: isScene,
      },
      {
        id: 'camera',
        title: 'Camera or files',
        body: `Tap Camera to shoot, or Photo to pick a file. Clips can be ${WALL_CLIP_MAX_SECONDS} seconds. Guest playground is photos only.`,
        href: `/#${SCENE_BOOTH_ID}`,
        target: '[data-path="wall-camera"]',
      },
      {
        id: 'edit',
        title: 'Crop, filter, music',
        body: 'Pick which part of the video and which slice of the song. Mute video and music separately. Optional.',
        target: '[data-tour="scene-composer"]',
      },
      {
        id: 'post',
        title: 'Post it',
        body: 'Send from Your Booth. Comments on a reply use the same Camera and Photo buttons.',
        target: '[data-tour="scene-composer"]',
      },
    ],
  },
  {
    id: 'imprint-post',
    title: 'Style a booth post',
    blurb: 'Your Booth → Imprint toggle → live quote card from your words. Pro unlocks faders and lock slots.',
    tier: 'pro',
    group: 'also',
    steps: [
      {
        id: 'booth',
        title: 'Your Booth',
        body: 'On The Scene, open Your Booth. Write a post, then tap Imprint to preview the styled quote card.',
        href: `/#${SCENE_BOOTH_ID}`,
        target: '[data-tour="scene-composer"]',
        isDone: isScene,
      },
      {
        id: 'mix',
        title: 'Mix or lock (Pro)',
        body: 'Studio Pro: open Imprint mix — Color, Texture, Rhythm, Depth faders, Shuffle, and up to five locked styles.',
        target: '[data-tour="scene-composer"]',
      },
      {
        id: 'send',
        title: 'Post it',
        body: 'Hit Post. The card stays styled on your wall and in feeds.',
        target: '[data-tour="scene-composer"]',
      },
    ],
  },
  {
    id: 'go-public',
    title: 'Go public',
    blurb: 'Booth → turn Artist Home live → share your /profile. Free. Lyrics stay private.',
    tier: 'free',
    group: 'do',
    steps: [
      {
        id: 'booth',
        title: 'Your Booth',
        body: 'This is the public-page switch. Flip Live when you are ready to be on the map.',
        href: `/#${SCENE_BOOTH_ID}`,
        target: '[data-path="booth-live"]',
        isDone: isScene,
      },
      {
        id: 'live',
        title: 'Turn Artist Home live',
        body: 'Use the Live switch on Your Booth. Nobody can open the public page until it is on.',
        href: `/#${SCENE_BOOTH_ID}`,
        target: '[data-path="booth-live"]',
      },
      {
        id: 'share',
        title: 'View and share the page',
        body: 'Open View my page, then Edit Public Page to set identity, The Pressing skin, and a featured track.',
        href: '/profile/customize',
        isDone: (p) => normalizePath(p) === '/profile/customize' || isArtistHome(p),
      },
    ],
  },
  {
    id: 'write-lyrics',
    title: 'Write in The Vault',
    blurb: 'Lyric workstation. Typing is free. Ink only pays AI.',
    tier: 'free',
    group: 'do',
    steps: [
      {
        id: 'vault',
        title: 'Open The Vault',
        body: 'Albums, tracks, and DNA live here. This is not New release.',
        href: vaultHref(),
        isDone: isVaultish,
      },
      {
        id: 'sheet',
        title: 'Open a sheet',
        body: 'Keep writing, or start a track. Paste or type a line — that is the first hour.',
        href: `${vaultHref()}?create=track`,
        isDone: isSheet,
      },
      {
        id: 'bar',
        title: 'Write a bar',
        body: 'Type for free. Generate Next costs Ink. Studio Draft and DNA & REMIX are in the Generation Workstation.',
        target: '[data-tour="lyrics-sheet"]',
        isDone: isSheet,
      },
    ],
  },
  {
    id: 'dna-drop',
    title: 'Share lyrics as a DNA Drop',
    blurb: 'Pro lyric snapshot link. Not New release. Not The Pressing.',
    tier: 'pro',
    group: 'do',
    steps: [
      {
        id: 'vault',
        title: 'Write the lyrics first',
        body: 'Open a sheet in The Vault. A DNA Drop is a shareable lyric page, not audio.',
        href: vaultHref(),
        isDone: isVaultish,
      },
      {
        id: 'drop',
        title: 'Open DNA Drop',
        body: 'On the sheet, tap DNA Drop and publish the lyric snapshot link. Pro.',
        href: `${vaultHref()}?create=track`,
        target: '[data-tour="dna-drop"]',
        isDone: isSheet,
      },
    ],
  },
  {
    id: 'find-artists',
    title: 'Find artists',
    blurb: 'Scene → Discover, or search. Free.',
    tier: 'free',
    group: 'then',
    steps: [
      {
        id: 'scene',
        title: 'The Scene',
        body: 'Discover and search both live here after sign-in.',
        href: `/#${DISCOVER_SECTION_ID}`,
        target: '[data-tour="scene-discover"]',
        isDone: isScene,
      },
      {
        id: 'discover',
        title: 'Open Discover',
        body: 'Full-screen cards of artists and posts. Or use search to jump to a name.',
        href: '/discover',
        target: '[data-tour="scene-search"]',
        isDone: (p) => normalizePath(p) === '/discover',
      },
      {
        id: 'door-knock',
        title: 'Knock on a live door',
        body: 'On Recently live cards, tap Knock. Each door takes up to 5 visitors and 15 knocks per day (3 from you). Artists collect knocks when they open their own Artist Home.',
        href: '/discover',
        isDone: (p) => normalizePath(p) === '/discover',
      },
    ],
  },
  {
    id: 'play-buy',
    title: 'Play or buy music',
    blurb: 'Library: your releases, unlocked purchases, or House. Save owned & purchased tracks offline on any tier.',
    tier: 'free',
    group: 'then',
    steps: [
      {
        id: 'library',
        title: 'Open Library',
        body: 'Play songs you pressed and songs you bought. House tracks are here to test the player.',
        href: '/library',
        isDone: (p) => normalizePath(p) === '/library',
      },
    ],
  },
  {
    id: 'get-paid',
    title: 'Get paid',
    blurb: 'Press live → fans pay money → Earnings / Stripe Connect.',
    tier: 'free',
    group: 'then',
    steps: [
      {
        id: 'press',
        title: 'Have a live release',
        body: 'A sale needs a pressed song or album. Open New release if you have not pressed one yet.',
        href: `/#${SCENE_BOOTH_ID}`,
        action: 'open-lathe',
        target: '[data-tour="scene-press-song"]',
      },
      {
        id: 'earnings',
        title: 'Open Earnings',
        body: 'Connect Stripe, then cash out. Sales can be held until payouts are on.',
        href: '/earnings',
        isDone: (p) => normalizePath(p) === '/earnings',
      },
    ],
  },
  {
    id: 'the-pressing',
    title: 'The Pressing',
    blurb: 'Living background skin on Artist Home. Free. Not a song sale.',
    tier: 'free',
    group: 'then',
    steps: [
      {
        id: 'customize',
        title: 'Edit Public Page',
        body: 'The Pressing is the page skin — atmosphere on Artist Home. It does not sell audio.',
        href: '/profile/customize',
        isDone: (p) => normalizePath(p) === '/profile/customize',
      },
    ],
  },
  {
    id: 'ink-store',
    title: 'Ink and Studio Pro',
    blurb: 'Ink pays AI only. Typing is free. Fans never pay Ink. Pro is $7.77/mo.',
    tier: 'ink',
    group: 'then',
    steps: [
      {
        id: 'pricing',
        title: 'Open Pricing',
        body: 'Ink packs and Studio Pro. Pro unlocks unlimited catalog, DNA Drop, Collab Sheet, and Freestyle.',
        href: '/pricing',
        isDone: (p) => normalizePath(p) === '/pricing',
      },
    ],
  },
  {
    id: 'collab',
    title: 'Collab Sheet',
    blurb: 'Live shared lyric sheet. Pro.',
    tier: 'pro',
    group: 'also',
    steps: [
      {
        id: 'sheet',
        title: 'Open a sheet',
        body: 'Collab lives on a track in The Vault, not on The Scene wall.',
        href: vaultHref(),
        isDone: isSheet,
      },
      {
        id: 'collab',
        title: 'Open Collab Sheet',
        body: 'Invite a friend onto the same sheet. Pro.',
        href: `${vaultHref()}?create=track`,
        target: '[data-tour="collab-sheet"]',
        isDone: isSheet,
      },
    ],
  },
  {
    id: 'freestyle',
    title: 'Freestyle',
    blurb: 'Speak bars onto the sheet. Pro. Ink for transcription.',
    tier: 'pro',
    group: 'also',
    steps: [
      {
        id: 'sheet',
        title: 'Open a sheet',
        body: 'Freestyle records into the lyric workstation.',
        href: vaultHref(),
        isDone: isSheet,
      },
      {
        id: 'mic',
        title: 'Open Freestyle',
        body: 'Tap Freestyle on the sheet, allow the mic, and drop spoken bars onto the page.',
        href: `${vaultHref()}?create=track`,
        target: '[data-tour="bar-workstation"]',
        isDone: isSheet,
      },
    ],
  },
  {
    id: 'refer',
    title: 'Refer a friend',
    blurb: 'Share your link. They get welcome Ink. You can earn Ink after they spend.',
    tier: 'free',
    group: 'also',
    steps: [
      {
        id: 'link',
        title: 'Copy your referral link',
        body: 'On The Scene, under Discover. Send the link — they start fresh, you can earn Ink after they use the studio.',
        href: `/#${FIND_ARTISTS_SECTION_ID}`,
        target: '#refer-a-friend',
        isDone: isScene,
      },
    ],
  },
  {
    id: 'the-scene',
    title: 'The Scene',
    blurb: 'Signed-in home: friends, Discover, Your Booth.',
    tier: 'free',
    group: 'words',
    steps: [
      {
        id: 'land',
        title: 'You are on The Scene',
        body: 'This is home after sign-in. Write in The Vault. Post from Your Booth. Find people in Discover.',
        href: '/',
        target: '[data-tour="scene-header"]',
        isDone: isScene,
      },
    ],
  },
  {
    id: 'your-block',
    title: 'Your Block',
    blurb: 'Friends wall / feed. Free.',
    tier: 'free',
    group: 'words',
    steps: [
      {
        id: 'block',
        title: 'Open Your Block',
        body: 'Friends posts, camera, and comments. Same composer as Your Booth.',
        href: `/#${BLOCK_SECTION_ID}`,
        target: '[data-tour="scene-feed"]',
        isDone: isScene,
      },
    ],
  },
];

export const MANUAL_PATH_GROUPS: { id: ManualPathGroup; title: string; hint: string }[] = [
  { id: 'do', title: 'Do this', hint: 'A full path. Start on any step — the coach stays until you finish.' },
  { id: 'then', title: 'Then', hint: 'Public page, Library, money, and Ink.' },
  { id: 'also', title: 'Also here', hint: 'Optional rooms. Same names on phone and PC.' },
  { id: 'words', title: 'What is what', hint: 'Tap a name to go there. Music release ≠ DNA Drop ≠ The Pressing.' },
];

export function getManualPath(id: string): ManualPathLane | undefined {
  return MANUAL_PATHS.find((lane) => lane.id === id);
}

export function firstOpenStepIndex(lane: ManualPathLane, pathname: string, stepId?: string): number {
  if (stepId) {
    const named = lane.steps.findIndex((step) => step.id === stepId);
    if (named >= 0) return named;
  }
  const firstTodo = lane.steps.findIndex((step) => !step.isDone?.(pathname));
  return firstTodo < 0 ? Math.max(0, lane.steps.length - 1) : firstTodo;
}

export function readManualPathSession(): ManualPathSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MANUAL_PATH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManualPathSession;
    if (!parsed?.laneId || !parsed.stepId || !getManualPath(parsed.laneId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeManualPathSession(session: ManualPathSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) sessionStorage.removeItem(MANUAL_PATH_STORAGE_KEY);
    else sessionStorage.setItem(MANUAL_PATH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function startManualPath(laneId: string, stepId?: string): boolean {
  if (typeof window === 'undefined') return false;
  const lane = getManualPath(laneId);
  if (!lane) return false;
  const index = firstOpenStepIndex(lane, window.location.pathname, stepId);
  const step = lane.steps[index];
  if (!step) return false;
  const session = { laneId: lane.id, stepId: step.id };
  writeManualPathSession(session);
  window.dispatchEvent(new CustomEvent(MANUAL_PATH_START_EVENT, { detail: session }));
  applyManualPathStep(step);
  return true;
}

export function stopManualPath(): void {
  if (typeof window === 'undefined') return;
  writeManualPathSession(null);
  window.dispatchEvent(new CustomEvent(MANUAL_PATH_STOP_EVENT));
}

export function openStudioManual(tab: OpenStudioManualDetail['tab'] = 'paths'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_STUDIO_MANUAL_EVENT, { detail: { tab } }));
}

export function applyManualPathStep(step: ManualPathStep): void {
  if (typeof window === 'undefined') return;
  if (step.action === 'open-lathe') openFirstDropLathe({ mode: 'song' });
  if (step.action === 'open-lathe-album') openFirstDropLathe({ mode: 'album' });

  let href = step.href;
  if (href?.includes('create=track')) {
    const last = getLastWorkedTrackPath();
    if (last) href = last;
  }
  if (!href) {
    if (step.target) {
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(step.target!)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    return;
  }

  const [pathAndQuery, hash] = href.split('#');
  const [path] = pathAndQuery.split('?');
  const here = normalizePath(window.location.pathname);
  const there = normalizePath(path || '/');
  if (here === there) {
    if (hash) {
      window.location.hash = hash;
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else if (step.target) {
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(step.target!)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    return;
  }
  window.location.assign(href);
}

export function emitReleasePublished(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(RELEASE_PUBLISHED_EVENT));
}
