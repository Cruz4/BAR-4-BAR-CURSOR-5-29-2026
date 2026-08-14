import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { updateHouseLockSeed } from '@/lib/server/lock';
import {
  DEFAULT_HOUSE_BAR,
  DEFAULT_WEEKLY_CHALLENGE,
  clampHouseSeedBar,
  clampWeeklyDescription,
  clampWeeklyTarget,
  clampWeeklyTitle,
  type HouseBarAdminConfig,
  type HouseBarPublicConfig,
  type SceneLivePublic,
  type WeeklyChallengeAdminConfig,
  type WeeklyChallengePublicConfig,
} from '@/lib/scene/live-events';

const HOUSE_DOC = 'config/houseBar';
const WEEKLY_DOC = 'config/weeklyChallenge';

function mapHouse(data: Record<string, unknown> | undefined): HouseBarAdminConfig {
  if (!data) {
    return { ...DEFAULT_HOUSE_BAR, updatedBy: null };
  }
  const seedBar = clampHouseSeedBar(typeof data.seedBar === 'string' ? data.seedBar : '')
    || DEFAULT_HOUSE_BAR.seedBar;
  return {
    enabled: data.enabled === true,
    seedBar,
    title:
      typeof data.title === 'string' && data.title.trim()
        ? data.title.trim().slice(0, 80)
        : DEFAULT_HOUSE_BAR.title,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
  };
}

function mapWeekly(data: Record<string, unknown> | undefined): WeeklyChallengeAdminConfig {
  if (!data) {
    return { ...DEFAULT_WEEKLY_CHALLENGE, updatedBy: null };
  }
  return {
    enabled: data.enabled === true,
    title:
      typeof data.title === 'string' && data.title.trim()
        ? clampWeeklyTitle(data.title)
        : DEFAULT_WEEKLY_CHALLENGE.title,
    description:
      typeof data.description === 'string' && data.description.trim()
        ? clampWeeklyDescription(data.description)
        : DEFAULT_WEEKLY_CHALLENGE.description,
    targetBars: clampWeeklyTarget(data.targetBars),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
  };
}

function toPublicHouse(cfg: HouseBarAdminConfig): HouseBarPublicConfig {
  const { updatedBy: _updatedBy, ...rest } = cfg;
  return rest;
}

function toPublicWeekly(cfg: WeeklyChallengeAdminConfig): WeeklyChallengePublicConfig {
  const { updatedBy: _updatedBy, ...rest } = cfg;
  return rest;
}

async function readDoc(path: string): Promise<Record<string, unknown> | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(path).get();
    return snap.exists ? (snap.data() as Record<string, unknown>) : undefined;
  } catch (error) {
    console.warn('[scene-live] read failed:', (error as Error).message);
    return undefined;
  }
}

export async function getHouseBarAdminConfig(): Promise<HouseBarAdminConfig> {
  return mapHouse(await readDoc(HOUSE_DOC));
}

export async function getWeeklyChallengeAdminConfig(): Promise<WeeklyChallengeAdminConfig> {
  return mapWeekly(await readDoc(WEEKLY_DOC));
}

export async function getSceneLivePublic(): Promise<SceneLivePublic> {
  const [house, weekly] = await Promise.all([
    getHouseBarAdminConfig(),
    getWeeklyChallengeAdminConfig(),
  ]);
  return {
    houseBar: toPublicHouse(house),
    weeklyChallenge: toPublicWeekly(weekly),
  };
}

export async function saveHouseBarConfig(input: {
  enabled: boolean;
  seedBar: string;
  title?: string;
  adminEmail: string;
}): Promise<HouseBarAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }
  const seedBar = clampHouseSeedBar(input.seedBar);
  if (input.enabled && seedBar.length < 8) {
    throw new Error('Write at least a short bar before turning House bar of the day on.');
  }
  const title =
    typeof input.title === 'string' && input.title.trim()
      ? input.title.trim().slice(0, 80)
      : DEFAULT_HOUSE_BAR.title;
  const now = new Date().toISOString();
  const db = await getDb();
  await db.doc(HOUSE_DOC).set(
    {
      enabled: Boolean(input.enabled),
      seedBar: seedBar || DEFAULT_HOUSE_BAR.seedBar,
      title,
      updatedAt: now,
      updatedBy: input.adminEmail,
    },
    { merge: true }
  );
  if (seedBar) {
    try {
      await updateHouseLockSeed(seedBar);
    } catch (err) {
      console.warn('[scene-live] house lock seed', err);
    }
  }
  return getHouseBarAdminConfig();
}

export async function saveWeeklyChallengeConfig(input: {
  enabled: boolean;
  title: string;
  description: string;
  targetBars: number;
  adminEmail: string;
}): Promise<WeeklyChallengeAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }
  const title = clampWeeklyTitle(input.title);
  if (input.enabled && title.length < 4) {
    throw new Error('Set a challenge title before turning it on.');
  }
  const now = new Date().toISOString();
  const db = await getDb();
  await db.doc(WEEKLY_DOC).set(
    {
      enabled: Boolean(input.enabled),
      title: title || DEFAULT_WEEKLY_CHALLENGE.title,
      description: clampWeeklyDescription(input.description) || DEFAULT_WEEKLY_CHALLENGE.description,
      targetBars: clampWeeklyTarget(input.targetBars),
      updatedAt: now,
      updatedBy: input.adminEmail,
    },
    { merge: true }
  );
  return getWeeklyChallengeAdminConfig();
}
