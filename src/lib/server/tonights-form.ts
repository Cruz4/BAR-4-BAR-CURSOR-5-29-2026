import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { getHouseBarAdminConfig } from '@/lib/server/scene-live';
import {
  clampTonightsFormBar,
  DEFAULT_TONIGHTS_FORM_CONFIG,
  emptyTonightsFormSlots,
  formatTonightsFormLabel,
  isValidTonightsFormSlot,
  resolveTonightsFormClock,
  TONIGHTS_FORM_SLOT_COUNT,
  type TonightsFormAdminConfig,
  type TonightsFormArchiveEntry,
  type TonightsFormPublic,
  type TonightsFormPublicConfig,
  type TonightsFormSlot,
} from '@/lib/tonights-form';

const CONFIG_DOC = 'config/tonightsForm';
const FORMS_COLLECTION = 'tonightsForms';

type FormDoc = {
  nightKey: string;
  label: string;
  frozen: boolean;
  frozenAt: string | null;
  slots: Array<TonightsFormSlot | null>;
  participants: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

function mapConfig(data: Record<string, unknown> | undefined): TonightsFormAdminConfig {
  if (!data) {
    return { ...DEFAULT_TONIGHTS_FORM_CONFIG, updatedBy: null };
  }
  return {
    enabled: data.enabled === true,
    seedHouseBar: data.seedHouseBar !== false,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
  };
}

function normalizeSlots(raw: unknown): Array<TonightsFormSlot | null> {
  const base = emptyTonightsFormSlots();
  if (!Array.isArray(raw)) return base;
  for (let i = 0; i < TONIGHTS_FORM_SLOT_COUNT; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const slot = (item as TonightsFormSlot).slot;
    const barText = clampTonightsFormBar(String((item as TonightsFormSlot).barText ?? ''));
    const displayName = String((item as TonightsFormSlot).displayName ?? '').trim();
    if (!isValidTonightsFormSlot(slot) || !barText || !displayName) continue;
    base[slot - 1] = {
      slot,
      barText,
      displayName,
      profileSlug:
        typeof (item as TonightsFormSlot).profileSlug === 'string'
          ? (item as TonightsFormSlot).profileSlug
          : undefined,
      userId:
        typeof (item as TonightsFormSlot).userId === 'string'
          ? (item as TonightsFormSlot).userId
          : undefined,
      kind: (item as TonightsFormSlot).kind === 'house_seed' ? 'house_seed' : 'writer',
      claimedAt:
        typeof (item as TonightsFormSlot).claimedAt === 'string'
          ? (item as TonightsFormSlot).claimedAt
          : new Date().toISOString(),
    };
  }
  return base;
}

function mapFormDoc(data: Record<string, unknown> | undefined, nightKey: string): FormDoc {
  const slots = normalizeSlots(data?.slots);
  const participants: Record<string, number> = {};
  if (data?.participants && typeof data.participants === 'object') {
    for (const [uid, slot] of Object.entries(data.participants as Record<string, unknown>)) {
      const n = Number(slot);
      if (uid && isValidTonightsFormSlot(n)) participants[uid] = n;
    }
  }
  for (const slot of slots) {
    if (slot?.userId && slot.kind === 'writer') {
      participants[slot.userId] = slot.slot;
    }
  }
  const filledCount = slots.filter(Boolean).length;
  const now = new Date().toISOString();
  return {
    nightKey,
    label:
      typeof data?.label === 'string' && data.label.trim()
        ? data.label.trim()
        : formatTonightsFormLabel(nightKey),
    frozen: data?.frozen === true,
    frozenAt: typeof data?.frozenAt === 'string' ? data.frozenAt : null,
    slots,
    participants,
    createdAt: typeof data?.createdAt === 'string' ? data.createdAt : now,
    updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : now,
  };
}

function toPublic(
  config: TonightsFormPublicConfig,
  form: FormDoc,
  clock: ReturnType<typeof resolveTonightsFormClock>,
  viewerUserId?: string
): TonightsFormPublic {
  const isCurrentNight = form.nightKey === clock.nightKey;
  const frozen = form.frozen || (isCurrentNight && !clock.active);
  const active = config.enabled && isCurrentNight && clock.active && !frozen;
  const yourSlot =
    viewerUserId && form.participants[viewerUserId]
      ? form.participants[viewerUserId]
      : null;

  return {
    enabled: config.enabled,
    nightKey: form.nightKey,
    label: form.label,
    active,
    frozen,
    slots: form.slots,
    filledCount: form.slots.filter(Boolean).length,
    yourSlot,
  };
}

async function resolveProfileSlug(userId: string, known?: string): Promise<string | undefined> {
  if (known?.trim()) return known.trim();
  if (!userId) return undefined;
  try {
    const db = await getDb();
    const snap = await db.doc(`users/${userId}/gamification/summary`).get();
    const slug = snap.data()?.profileSlug;
    return typeof slug === 'string' && slug.trim() ? slug.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function readConfigDoc(): Promise<TonightsFormAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    return { ...DEFAULT_TONIGHTS_FORM_CONFIG, updatedBy: null };
  }
  try {
    const db = await getDb();
    const snap = await db.doc(CONFIG_DOC).get();
    return mapConfig(snap.exists ? (snap.data() as Record<string, unknown>) : undefined);
  } catch (error) {
    console.warn('[tonights-form] config read failed:', (error as Error).message);
    return { ...DEFAULT_TONIGHTS_FORM_CONFIG, updatedBy: null };
  }
}

async function readFormDoc(nightKey: string): Promise<FormDoc | null> {
  if (!hasAdminFirestoreCredentials()) return null;
  try {
    const db = await getDb();
    const snap = await db.doc(`${FORMS_COLLECTION}/${nightKey}`).get();
    if (!snap.exists) return null;
    return mapFormDoc(snap.data() as Record<string, unknown>, nightKey);
  } catch (error) {
    console.warn('[tonights-form] form read failed:', (error as Error).message);
    return null;
  }
}

async function buildHouseSeedSlot(): Promise<TonightsFormSlot | null> {
  const config = await getTonightsFormAdminConfig();
  if (!config.seedHouseBar) return null;
  const house = await getHouseBarAdminConfig();
  if (!house.enabled) return null;
  const barText = clampTonightsFormBar(house.seedBar);
  if (barText.length < 4) return null;
  const now = new Date().toISOString();
  return {
    slot: 1,
    barText,
    displayName: house.title?.trim() || 'House',
    kind: 'house_seed',
    claimedAt: now,
  };
}

async function ensureFormForNight(nightKey: string): Promise<FormDoc> {
  const existing = await readFormDoc(nightKey);
  if (existing) return existing;

  const db = await getDb();
  const now = new Date().toISOString();
  const slots = emptyTonightsFormSlots();
  const houseSeed = await buildHouseSeedSlot();
  if (houseSeed) slots[0] = houseSeed;

  const doc: FormDoc = {
    nightKey,
    label: formatTonightsFormLabel(nightKey),
    frozen: false,
    frozenAt: null,
    slots,
    participants: {},
    createdAt: now,
    updatedAt: now,
  };

  await db.doc(`${FORMS_COLLECTION}/${nightKey}`).set(doc, { merge: true });
  return doc;
}

async function maybeFreezeForm(form: FormDoc, clock: ReturnType<typeof resolveTonightsFormClock>): Promise<FormDoc> {
  const shouldFreeze =
    !form.frozen &&
    (form.nightKey !== clock.nightKey || (form.nightKey === clock.nightKey && !clock.active));

  if (!shouldFreeze) return form;

  const db = await getDb();
  const now = new Date().toISOString();
  await db.doc(`${FORMS_COLLECTION}/${form.nightKey}`).set(
    { frozen: true, frozenAt: now, updatedAt: now },
    { merge: true }
  );
  return { ...form, frozen: true, frozenAt: now, updatedAt: now };
}

export async function getTonightsFormAdminConfig(): Promise<TonightsFormAdminConfig> {
  return readConfigDoc();
}

export async function saveTonightsFormConfig(input: {
  enabled: boolean;
  seedHouseBar: boolean;
  adminEmail: string;
}): Promise<TonightsFormAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }
  const now = new Date().toISOString();
  const db = await getDb();
  await db.doc(CONFIG_DOC).set(
    {
      enabled: Boolean(input.enabled),
      seedHouseBar: Boolean(input.seedHouseBar),
      updatedAt: now,
      updatedBy: input.adminEmail,
    },
    { merge: true }
  );
  return getTonightsFormAdminConfig();
}

export async function getTonightsFormPublic(viewerUserId?: string): Promise<TonightsFormPublic> {
  const config = await readConfigDoc();
  const clock = resolveTonightsFormClock();

  if (!config.enabled) {
    return {
      enabled: false,
      nightKey: clock.nightKey,
      label: formatTonightsFormLabel(clock.nightKey),
      active: false,
      frozen: true,
      slots: emptyTonightsFormSlots(),
      filledCount: 0,
      yourSlot: null,
    };
  }

  let form = await readFormDoc(clock.nightKey);
  if (!form && clock.active) {
    form = await ensureFormForNight(clock.nightKey);
  }

  if (!form) {
    const lastKey = clock.nightKey;
    const last = await readFormDoc(lastKey);
    if (last) {
      const frozen = await maybeFreezeForm(last, clock);
      return toPublic(config, frozen, clock, viewerUserId);
    }
    return {
      enabled: true,
      nightKey: clock.nightKey,
      label: formatTonightsFormLabel(clock.nightKey),
      active: clock.active,
      frozen: !clock.active,
      slots: emptyTonightsFormSlots(),
      filledCount: 0,
      yourSlot: null,
    };
  }

  const ready = await maybeFreezeForm(form, clock);
  return toPublic(config, ready, clock, viewerUserId);
}

export async function getTonightsFormByNightKey(
  nightKey: string,
  viewerUserId?: string
): Promise<TonightsFormPublic | null> {
  const config = await readConfigDoc();
  const form = await readFormDoc(nightKey);
  if (!form) return null;
  const clock = resolveTonightsFormClock();
  const frozen = await maybeFreezeForm(form, clock);
  return toPublic(config, frozen, { nightKey, active: false }, viewerUserId);
}

export async function listTonightsFormArchive(limit = 12): Promise<TonightsFormArchiveEntry[]> {
  if (!hasAdminFirestoreCredentials()) return [];
  try {
    const db = await getDb();
    const snap = await db
      .collection(FORMS_COLLECTION)
      .orderBy('nightKey', 'desc')
      .limit(Math.min(48, Math.max(1, limit)))
      .get();
    return snap.docs.map((doc) => {
      const data = mapFormDoc(doc.data() as Record<string, unknown>, doc.id);
      return {
        nightKey: data.nightKey,
        label: data.label,
        frozenAt: data.frozenAt,
        filledCount: data.slots.filter(Boolean).length,
      };
    });
  } catch (error) {
    console.warn('[tonights-form] archive list failed:', (error as Error).message);
    return [];
  }
}

export async function claimTonightsFormSlot(input: {
  userId: string;
  displayName: string;
  profileSlug?: string;
  slot: number;
  barText: string;
}): Promise<TonightsFormPublic> {
  const config = await readConfigDoc();
  if (!config.enabled) {
    throw new Error("Tonight's Form is off right now.");
  }

  const clock = resolveTonightsFormClock();
  if (!clock.active) {
    throw new Error("Tonight's Form opens at 6 PM Eastern and closes at sunrise.");
  }

  if (!isValidTonightsFormSlot(input.slot)) {
    throw new Error('Pick a seat between 1 and 16.');
  }

  const barText = clampTonightsFormBar(input.barText);
  if (barText.length < 4) {
    throw new Error('Write at least a short bar before claiming your seat.');
  }

  const displayName = input.displayName.trim().slice(0, 64) || 'Artist';
  const profileSlug = await resolveProfileSlug(input.userId, input.profileSlug);
  const db = await getDb();
  const ref = db.doc(`${FORMS_COLLECTION}/${clock.nightKey}`);

  await ensureFormForNight(clock.nightKey);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error('Could not open tonight’s form. Try again.');
    }
    const form = mapFormDoc(snap.data() as Record<string, unknown>, clock.nightKey);

    if (form.frozen) {
      throw new Error('This form already froze at sunrise.');
    }

    const existingSlot = form.participants[input.userId];
    if (existingSlot) {
      throw new Error(`You already claimed seat ${existingSlot} tonight.`);
    }

    const index = input.slot - 1;
    const current = form.slots[index];
    if (current) {
      throw new Error(`Seat ${input.slot} is already taken.`);
    }

    const now = new Date().toISOString();
    const nextSlots = [...form.slots];
    nextSlots[index] = {
      slot: input.slot,
      barText,
      displayName,
      profileSlug,
      userId: input.userId,
      kind: 'writer',
      claimedAt: now,
    };
    const nextParticipants = { ...form.participants, [input.userId]: input.slot };

    tx.set(
      ref,
      {
        slots: nextSlots,
        participants: nextParticipants,
        updatedAt: now,
      },
      { merge: true }
    );
  });

  return getTonightsFormPublic(input.userId);
}
