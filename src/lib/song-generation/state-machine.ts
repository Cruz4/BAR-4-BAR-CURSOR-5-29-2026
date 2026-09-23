import type { RenderJobStatus } from '@/lib/song-generation/types';

const TRANSITIONS: Record<RenderJobStatus, RenderJobStatus[]> = {
  draft: ['queued', 'canceled'],
  queued: ['claimed', 'canceled', 'expired'],
  claimed: ['generating', 'queued', 'canceled', 'expired', 'failed'],
  generating: ['uploading', 'failed', 'canceled'],
  uploading: ['processing', 'failed', 'canceled'],
  processing: ['ready', 'failed'],
  ready: [],
  failed: [],
  canceled: [],
  expired: [],
};

export function canTransitionRenderJob(from: RenderJobStatus, to: RenderJobStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertRenderTransition(from: RenderJobStatus, to: RenderJobStatus): void {
  if (!canTransitionRenderJob(from, to)) {
    throw new Error(`Invalid render job transition ${from} → ${to}`);
  }
}
