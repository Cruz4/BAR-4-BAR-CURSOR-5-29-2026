/** Strip codec parameters so <audio> and Storage Content-Type stay playable. */
export function normalizeAudioContentType(raw: string | undefined | null): string {
  const type = (raw || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'audio/mp4';
  if (type.includes('mpeg') || type.includes('mp3')) return 'audio/mpeg';
  if (type.includes('ogg')) return 'audio/ogg';
  if (type.includes('wav')) return 'audio/wav';
  return 'audio/webm';
}

export function isSafeVoiceStoragePath(path: string): boolean {
  const clean = path.trim();
  if (!clean || clean.length > 400) return false;
  if (clean.includes('..') || clean.includes('\\') || clean.includes('\0')) return false;
  return /^(voice|sheet-takes)\/[A-Za-z0-9_-]+\//.test(clean);
}

export function headerAudioContentType(raw: string | undefined | null): string {
  const type = (raw || '').trim();
  if (!type) return 'application/octet-stream';
  if (type.includes(';')) return normalizeAudioContentType(type);
  return type;
}

export function voiceFileApiUrl(
  storagePath: string,
  extra?: { token?: string; contentType?: string }
): string {
  const params = new URLSearchParams({ path: storagePath });
  if (extra?.token) params.set('token', extra.token);
  if (extra?.contentType) params.set('ctype', normalizeAudioContentType(extra.contentType));
  return `/api/voice/file?${params.toString()}`;
}
