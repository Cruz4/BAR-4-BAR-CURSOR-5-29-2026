const KIND_PREFIX = /^(Song|Album|Original|Lyrics DNA Drop) · /;

/** Collapse legacy multi-line drop/reverb captions into `Title | Artist | Album`. */
export function formatDropShareCaption(text: string): string {
  const raw = text.trim();
  if (!raw) return raw;
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || !lines.every((line) => KIND_PREFIX.test(line))) {
    return raw;
  }
  const value = (label: string) => {
    const line = lines.find((entry) => entry.startsWith(`${label} · `));
    return line ? line.replace(`${label} · `, '').trim() : '';
  };
  const song = value('Song') || value('Lyrics DNA Drop');
  const album = value('Album');
  const artist = value('Original');
  const parts = [song, artist, album].filter(Boolean);
  return parts.length ? parts.join(' | ') : raw;
}

/** One-line caption for new Reverb / share posts. */
export function buildDropShareCaption(opts: {
  title: string;
  ownerName?: string;
  albumTitle?: string;
  isAlbum?: boolean;
  hasAudio?: boolean;
}): string {
  const title = opts.title.trim();
  const artist = opts.ownerName?.trim() || '';
  const album = opts.albumTitle?.trim() || '';
  if (opts.isAlbum && !opts.hasAudio) {
    return [title, artist].filter(Boolean).join(' | ');
  }
  return [title, artist, album].filter(Boolean).join(' | ');
}
