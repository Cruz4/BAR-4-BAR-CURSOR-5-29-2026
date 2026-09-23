import 'server-only';

import { getProductSurfaces } from '@/lib/server/product-surfaces';
import { isSongGenerationSurfaceLive } from '@/lib/product-surface-modes';
import {
  completeRenderJob,
  failJobWithRefund,
  getRenderJob,
  transitionRenderJob,
} from '@/lib/server/render/job-service';
import { renderTakeAudio } from '@/lib/server/render/render-take-audio';

const MANAGED_WORKER_ID = 'akasheet-studio-cloud';

export function isDevRenderAutoWorkerEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.RENDER_DEV_AUTO_WORKER === 'true';
}

/** Show Generate / Render Studio in dev when admin has Song generation off (opt-in). */
export function isDevSongGenUiOverrideEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.RENDER_DEV_SONG_GEN_UI === 'true'
  );
}

export function isManagedRenderWorkerEnvEnabled(): boolean {
  return process.env.RENDER_MANAGED_WORKER === 'true';
}

export function isManagedRenderWorkerEnabled(): boolean {
  return isDevRenderAutoWorkerEnabled() || isManagedRenderWorkerEnvEnabled();
}

/** Server processes jobs when Song generation is on (Cloud Run — no home PC) or dev/managed worker is enabled. */
export async function shouldAutoProcessRenderJob(): Promise<boolean> {
  if (isManagedRenderWorkerEnabled()) return true;
  const surfaces = await getProductSurfaces();
  return isSongGenerationSurfaceLive(surfaces.songGeneration);
}

export async function stubCompleteRenderJob(uid: string, jobId: string, workerId: string): Promise<void> {
  const job = await getRenderJob(uid, jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'ready') return;

  if (job.status === 'queued') {
    await transitionRenderJob(uid, jobId, 'claimed', {
      deviceId: workerId,
      claimedAt: new Date().toISOString(),
    });
  }

  const refreshed = await getRenderJob(uid, jobId);
  if (!refreshed || refreshed.status === 'ready') return;

  try {
    if (refreshed.status === 'claimed') {
      await transitionRenderJob(uid, jobId, 'generating', { progressPct: 20 });
    }
    const rendered = await renderTakeAudio(refreshed.recipe);
    await completeRenderJob(uid, jobId, {
      durationSec: rendered.durationSec,
      modelFamily: rendered.modelFamily,
      modelRevision: rendered.modelRevision,
      audio: rendered.audio,
      mime: rendered.mime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Song render failed';
    const latest = await getRenderJob(uid, jobId);
    if (latest && !['ready', 'failed', 'canceled'].includes(latest.status)) {
      await failJobWithRefund(uid, latest, 'ace_failed', message);
    }
    throw err;
  }
}

export async function processManagedRenderJob(uid: string, jobId: string): Promise<void> {
  if (!(await shouldAutoProcessRenderJob())) return;
  await stubCompleteRenderJob(uid, jobId, MANAGED_WORKER_ID);
}

export function scheduleManagedRenderJob(uid: string, jobId: string): void {
  void processManagedRenderJob(uid, jobId).catch((err) =>
    console.warn('[render/managed-worker] auto-process failed', jobId, err)
  );
}
