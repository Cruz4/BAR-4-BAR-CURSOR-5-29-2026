const PREFIX = 'b4b:lastRenderJob:';

export function rememberRenderJobForTrack(albumId: string, trackId: string, jobId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${PREFIX}${albumId}:${trackId}`, jobId);
  } catch {
    /* private mode */
  }
}

export function readRememberedRenderJob(albumId: string, trackId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(`${PREFIX}${albumId}:${trackId}`);
  } catch {
    return null;
  }
}
