export function renderJobArtifactPrefix(uid: string, jobId: string): string {
  return `render/${uid}/jobs/${jobId}`;
}

export function generatedTakeStreamPath(uid: string, takeId: string, mime?: string): string {
  const ext = mime?.includes('mpeg') ? 'mp3' : mime?.includes('mp4') ? 'm4a' : 'wav';
  return `render/${uid}/takes/${takeId}/stream.${ext}`;
}

export function generatedTakeMasterPath(uid: string, takeId: string): string {
  return `render/${uid}/takes/${takeId}/master.flac`;
}

export function generatedTakeWavPath(uid: string, takeId: string): string {
  return `render/${uid}/takes/${takeId}/processing.wav`;
}

export function artistSignatureAdapterPath(uid: string, modelId: string, version: number): string {
  return `render/${uid}/signatures/${modelId}/v${version}.adapter`;
}
