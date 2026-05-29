import 'server-only';

import { getDb } from '@/lib/firebase/server';
import { mergeStudioCosts, type StudioCosts } from '@/lib/studio-costs';
import { AI_COSTS } from '@/lib/costs';

let cachedCosts: StudioCosts | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export async function getStudioCosts(): Promise<StudioCosts> {
  const now = Date.now();
  if (cachedCosts && now - cachedAt < CACHE_MS) return cachedCosts;

  try {
    const db = await getDb();
    const snap = await db.doc('config/studio').get();
    cachedCosts = mergeStudioCosts(snap.data()?.costs);
  } catch {
    cachedCosts = { ...AI_COSTS } as StudioCosts;
  }
  cachedAt = now;
  return cachedCosts;
}

export function clearStudioCostsCache() {
  cachedCosts = null;
  cachedAt = 0;
}
