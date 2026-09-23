import type { Album, StyleProfile, Track } from '@/lib/types';

export const RENDER_COMPILER_VERSION = '2026.09.20.1';

export type RenderWorkKind = 'song' | 'instrumental';

export type RenderRoute = 'local' | 'cloud';

export type RenderDeviceCapability = 'compatible' | 'degraded' | 'cloud_only';

export type RenderJobStatus =
  | 'draft'
  | 'queued'
  | 'claimed'
  | 'generating'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'canceled'
  | 'expired';

export type RenderJobKind =
  | 'full_song'
  | 'instrumental'
  | 'repaint'
  | 'stem_bundle'
  | 'midi_stem'
  | 'voice_match'
  | 'artist_signature_train';

export type RenderInkReservation = {
  inkAmount: number;
  inkBreakdown: Array<{ pool: 'residency' | 'trial' | 'permanent'; amount: number }>;
  cloudPassConsumed?: boolean;
  reservedAt: string;
};

export type RenderRecipeRails = {
  vibe: boolean;
  styleDna: boolean;
  dnaSuite: boolean;
  intents: boolean;
  guardrails: boolean;
  specialInstructions: boolean;
};

export type CompiledRenderRecipe = {
  compilerVersion: string;
  workKind: RenderWorkKind;
  rails: RenderRecipeRails;
  lyricsText: string;
  caption: string;
  negativeCaption: string;
  durationSec: number;
  bpm?: number;
  musicalKey?: string;
  seed?: number;
  artistSignatureId?: string | null;
  voiceMatchId?: string | null;
  fieldHashes: Record<string, string>;
  rawSnapshot: Record<string, unknown>;
};

export type RenderJobRecord = {
  id: string;
  ownerId: string;
  albumId: string;
  trackId: string;
  kind: RenderJobKind;
  workKind: RenderWorkKind;
  status: RenderJobStatus;
  route: RenderRoute;
  recipe: CompiledRenderRecipe;
  recipeHash: string;
  reservation?: RenderInkReservation | null;
  deviceId?: string | null;
  parentTakeId?: string | null;
  variantMode?: 'same_recipe' | 'variation' | 'refresh_sheet';
  progressPct?: number;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string | null;
  completedAt?: string | null;
  revision: number;
};

export type GeneratedTakeRecord = {
  id: string;
  ownerId: string;
  albumId: string;
  trackId: string;
  jobId: string;
  workKind: RenderWorkKind;
  recipeHash: string;
  parentTakeId?: string | null;
  approvedAt?: string | null;
  streamStoragePath?: string | null;
  masterStoragePath?: string | null;
  wavArtifactExpiresAt?: string | null;
  durationSec: number;
  modelFamily: string;
  modelRevision: string;
  seed?: number | null;
  createdAt: string;
  provenance: GeneratedTakeProvenance;
};

export type GeneratedTakeProvenance = {
  generatedInApp: true;
  compilerVersion: string;
  recipeHash: string;
  modelFamily: string;
  modelRevision: string;
  disclosedAt?: string | null;
};

export type RenderDeviceRecord = {
  id: string;
  label: string;
  capability: RenderDeviceCapability;
  companionVersion: string;
  modelRevisions: Record<string, string>;
  lastHeartbeatAt: string;
  revokedAt?: string | null;
  createdAt: string;
};

export type CompileSongInput = {
  track: Track;
  album: Album;
  styleProfile?: StyleProfile | null;
  durationSec?: number;
  seed?: number;
  artistSignatureId?: string | null;
};

export type CompileInstrumentalInput = {
  track: Track;
  album: Album;
  durationSec?: number;
  seed?: number;
  musicStyleSignatureId?: string | null;
};
