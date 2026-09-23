import 'server-only';

import { randomBytes } from 'crypto';
import { getDb } from '@/lib/firebase/server';
import { hashRecipe } from '@/lib/song-generation/recipe';
import { assertRenderTransition } from '@/lib/song-generation/state-machine';
import { computeFullRenderInkCost } from '@/lib/song-generation/costs';
import type {
  CompiledRenderRecipe,
  GeneratedTakeRecord,
  RenderJobKind,
  RenderJobRecord,
  RenderRoute,
} from '@/lib/song-generation/types';
import { buildTakeProvenance } from '@/lib/song-generation/provenance';
import { generatedTakeStreamPath, generatedTakeWavPath } from '@/lib/song-generation/storage-paths';
import { uploadTakeAudio } from '@/lib/server/render/take-audio-storage';
import { reserveRenderInk, refundRenderInk } from '@/lib/server/render/ink-reservation';
import { decrementRenderUsage, incrementRenderUsage } from '@/lib/server/render/quota';
import type { User } from '@/lib/types';

const ACE_MODEL_FAMILY = 'ace-step';
const ACE_MODEL_REVISION = '1.5.0-pinned';

/** Firestore rejects `undefined` anywhere in a document (e.g. optional recipe.seed). */
function firestoreDocumentData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function createRenderJob(input: {
  uid: string;
  user: Pick<User, 'subscriptionStatus' | 'subscriptionProduct' | 'proFeaturePreviewExpiresAt'>;
  albumId: string;
  trackId: string;
  kind: RenderJobKind;
  workKind: 'song' | 'instrumental';
  route: RenderRoute;
  recipe: CompiledRenderRecipe;
  deviceId?: string | null;
  parentTakeId?: string | null;
  variantMode?: RenderJobRecord['variantMode'];
}): Promise<RenderJobRecord> {
  const db = await getDb();
  const jobId = randomBytes(10).toString('hex');
  const now = new Date().toISOString();
  const recipeHash = hashRecipe(input.recipe);
  const inkCost = computeFullRenderInkCost(input.recipe.durationSec);
  const reservation = await reserveRenderInk(
    input.uid,
    inkCost,
    input.workKind === 'instrumental' ? 'renderInstrumental' : 'renderSong'
  );

  const job: RenderJobRecord = {
    id: jobId,
    ownerId: input.uid,
    albumId: input.albumId,
    trackId: input.trackId,
    kind: input.kind,
    workKind: input.workKind,
    status: 'queued',
    route: input.route,
    recipe: input.recipe,
    recipeHash,
    reservation,
    deviceId: input.deviceId ?? null,
    parentTakeId: input.parentTakeId ?? null,
    variantMode: input.variantMode,
    progressPct: 0,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };

  await db.doc(`users/${input.uid}/renderJobs/${jobId}`).set(firestoreDocumentData(job));
  await incrementRenderUsage(input.uid, input.route, input.route === 'cloud');
  return job;
}

export async function getRenderJob(uid: string, jobId: string): Promise<RenderJobRecord | null> {
  const db = await getDb();
  const snap = await db.doc(`users/${uid}/renderJobs/${jobId}`).get();
  if (!snap.exists) return null;
  return snap.data() as RenderJobRecord;
}

export async function transitionRenderJob(
  uid: string,
  jobId: string,
  toStatus: RenderJobRecord['status'],
  patch: Partial<RenderJobRecord> = {}
): Promise<RenderJobRecord> {
  const db = await getDb();
  const ref = db.doc(`users/${uid}/renderJobs/${jobId}`);
  let updated!: RenderJobRecord;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Job not found');
    const job = snap.data() as RenderJobRecord;
    assertRenderTransition(job.status, toStatus);
    updated = {
      ...job,
      ...patch,
      status: toStatus,
      updatedAt: new Date().toISOString(),
      revision: job.revision + 1,
    };
    tx.set(ref, firestoreDocumentData(updated));
  });

  return updated;
}

export async function claimNextJob(
  uid: string,
  deviceId: string
): Promise<RenderJobRecord | null> {
  const db = await getDb();
  const snap = await db
    .collection(`users/${uid}/renderJobs`)
    .where('status', '==', 'queued')
    .orderBy('createdAt', 'asc')
    .limit(5)
    .get();

  for (const doc of snap.docs) {
    const job = doc.data() as RenderJobRecord;
    if (job.route !== 'local') continue;
    if (job.deviceId && job.deviceId !== deviceId) continue;
    try {
      return await transitionRenderJob(uid, job.id, 'claimed', {
        deviceId,
        claimedAt: new Date().toISOString(),
      });
    } catch {
      continue;
    }
  }
  return null;
}

export async function failJobWithRefund(
  uid: string,
  job: RenderJobRecord,
  failureCode: string,
  failureMessage: string
): Promise<void> {
  if (job.reservation) {
    await refundRenderInk(uid, job.reservation);
  }
  if (!['failed', 'canceled', 'ready'].includes(job.status)) {
    await decrementRenderUsage(uid, job.route, job.route === 'cloud');
  }
  await transitionRenderJob(uid, job.id, 'failed', {
    failureCode,
    failureMessage,
    reservation: null,
  });
}

export async function completeRenderJob(
  uid: string,
  jobId: string,
  output: {
    durationSec: number;
    streamByteSize?: number;
    modelFamily?: string;
    modelRevision?: string;
    audio?: Buffer;
    mime?: string;
  }
): Promise<GeneratedTakeRecord> {
  if (!output.audio?.length) {
    throw new Error('Cannot mark a take ready without ACE audio.');
  }

  const job = await getRenderJob(uid, jobId);
  if (!job) throw new Error('Job not found');

  if (job.status === 'queued' || job.status === 'claimed') {
    if (job.status === 'queued') {
      await transitionRenderJob(uid, jobId, 'claimed', { progressPct: 10 });
    }
    await transitionRenderJob(uid, jobId, 'generating', { progressPct: 50 });
  }
  const afterGen = await getRenderJob(uid, jobId);
  if (afterGen?.status === 'generating') {
    await transitionRenderJob(uid, jobId, 'uploading', { progressPct: 80 });
  }
  const afterUp = await getRenderJob(uid, jobId);
  if (afterUp?.status === 'uploading') {
    await transitionRenderJob(uid, jobId, 'processing', { progressPct: 90 });
  }

  const takeId = randomBytes(10).toString('hex');
  const now = new Date().toISOString();
  const wavExpires = new Date(Date.now() + 7 * 86400_000).toISOString();
  const mime = output.mime || 'audio/wav';
  const streamStoragePath = generatedTakeStreamPath(uid, takeId, mime);

  const take: GeneratedTakeRecord = {
    id: takeId,
    ownerId: uid,
    albumId: job.albumId,
    trackId: job.trackId,
    jobId: job.id,
    workKind: job.workKind,
    recipeHash: job.recipeHash,
    parentTakeId: job.parentTakeId ?? null,
    streamStoragePath,
    masterStoragePath: null,
    wavArtifactExpiresAt: wavExpires,
    durationSec: output.durationSec,
    modelFamily: output.modelFamily || ACE_MODEL_FAMILY,
    modelRevision: output.modelRevision || ACE_MODEL_REVISION,
    seed: job.recipe.seed ?? null,
    createdAt: now,
    provenance: buildTakeProvenance({
      recipeHash: job.recipeHash,
      compilerVersion: job.recipe.compilerVersion,
      modelFamily: output.modelFamily || ACE_MODEL_FAMILY,
      modelRevision: output.modelRevision || ACE_MODEL_REVISION,
    }),
  };

  const uploaded = await uploadTakeAudio(streamStoragePath, output.audio, mime);
  if (!uploaded) throw new Error('Could not store rendered song.');

  const db = await getDb();
  await db.doc(`users/${uid}/generatedTakes/${takeId}`).set(take);
  await transitionRenderJob(uid, jobId, 'ready', {
    progressPct: 100,
    completedAt: now,
  });

  void import('@/lib/server/render-analytics').then(({ recordRenderEvent }) =>
    recordRenderEvent(uid, 'render_complete', {
      workKind: job.workKind,
      route: job.route,
      jobId: job.id,
      takeId,
    })
  );
  void import('@/lib/server/gamification').then(({ noteRenderAchievement }) =>
    noteRenderAchievement(uid, 'first_playback')
  );

  return take;
}

export async function cancelRenderJob(uid: string, jobId: string): Promise<void> {
  const job = await getRenderJob(uid, jobId);
  if (!job) throw new Error('Job not found');
  if (['ready', 'failed', 'canceled', 'expired'].includes(job.status)) return;
  if (job.reservation && job.status !== 'ready') {
    await refundRenderInk(uid, job.reservation);
  }
  await transitionRenderJob(uid, jobId, 'canceled', { reservation: null });
}

export function placeholderWavPath(uid: string, takeId: string): string {
  return generatedTakeWavPath(uid, takeId);
}
