import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

const DOC = 'config/renderOps';

export type RenderOpsConfig = {
  cloudSpendPaused?: boolean;
  cloudMonthlyBudgetUsd?: number;
  cloudSpendMonthKey?: string;
  cloudSpendUsd?: number;
  /** Server-only fal.ai key for ACE-Step (set via scripts/install-fal-key.mjs). */
  falApiKey?: string;
  updatedAt?: string;
};

export async function getRenderOpsConfig(): Promise<RenderOpsConfig> {
  if (!hasAdminFirestoreCredentials()) return {};
  const db = await getDb();
  const snap = await db.doc(DOC).get();
  return (snap.data() as RenderOpsConfig) || {};
}

export async function assertCloudRenderAllowed(): Promise<void> {
  const cfg = await getRenderOpsConfig();
  if (cfg.cloudSpendPaused) {
    throw new Response(JSON.stringify({ error: 'Cloud rendering is temporarily paused.' }), {
      status: 503,
    });
  }
}
