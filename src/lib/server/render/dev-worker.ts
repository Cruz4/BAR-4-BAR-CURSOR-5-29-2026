import 'server-only';

import { stubCompleteRenderJob } from '@/lib/server/render/managed-worker';

/** Dev-only: finish a job without the Python companion (stub take, no audio file). */
export async function simulateLocalRenderJob(
  uid: string,
  jobId: string,
  options?: { skipEnvGate?: boolean }
): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Dev render simulation is only available in development.');
  }
  if (!options?.skipEnvGate && process.env.RENDER_DEV_AUTO_WORKER !== 'true') {
    throw new Error('Set RENDER_DEV_AUTO_WORKER=true in .env.local to enable.');
  }

  await stubCompleteRenderJob(uid, jobId, 'dev-simulated-worker');
}

export {
  isDevRenderAutoWorkerEnabled,
  isDevSongGenUiOverrideEnabled,
} from '@/lib/server/render/managed-worker';
