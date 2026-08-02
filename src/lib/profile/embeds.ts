/**
 * Embed whitelist + URL parsing for Artist Home playable media.
 *
 * Embeds-only strategy: the provider hosts and streams the media, so profile
 * plays cost Bar 4 Bar nothing. Unsupported URLs fall back to a link card.
 */

export type EmbedProvider = 'youtube' | 'soundcloud' | 'spotify' | 'suno';

export type ParsedEmbed = {
  provider: EmbedProvider;
  /** iframe src */
  src: string;
  /** Fixed iframe height in px (video providers use aspect ratio instead). */
  height?: number;
  /** True when the embed is 16:9 video. */
  isVideo: boolean;
};

function safeUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;

function parseYouTube(url: URL): ParsedEmbed | null {
  const host = url.hostname.replace(/^www\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') id = parts[1] ?? null;
    }
  } else {
    return null;
  }
  if (!id || !YT_ID.test(id)) return null;
  return {
    provider: 'youtube',
    src: `https://www.youtube-nocookie.com/embed/${id}`,
    isVideo: true,
  };
}

function parseSoundCloud(url: URL): ParsedEmbed | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'soundcloud.com' && host !== 'on.soundcloud.com') return null;
  const clean = `https://soundcloud.com${url.pathname}`;
  return {
    provider: 'soundcloud',
    src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&visual=false`,
    height: 166,
    isVideo: false,
  };
}

function parseSpotify(url: URL): ParsedEmbed | null {
  if (url.hostname.replace(/^www\./, '') !== 'open.spotify.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  // Support /intl-xx/track/... paths
  const offset = parts[0]?.startsWith('intl-') ? 1 : 0;
  const kind = parts[offset];
  const id = parts[offset + 1];
  if (!kind || !id || !['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(kind)) {
    return null;
  }
  return {
    provider: 'spotify',
    src: `https://open.spotify.com/embed/${kind}/${id}`,
    height: kind === 'track' || kind === 'episode' ? 152 : 352,
    isVideo: false,
  };
}

function parseSuno(url: URL): ParsedEmbed | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'suno.com' && host !== 'app.suno.ai' && host !== 'suno.ai') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => p === 'song' || p === 'embed');
  const id = idx >= 0 ? parts[idx + 1] : null;
  if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) return null;
  return {
    provider: 'suno',
    src: `https://suno.com/embed/${id}`,
    height: 240,
    isVideo: false,
  };
}

/** Parse a pasted URL into a playable embed; null means "show a link card". */
export function parseEmbedUrl(raw: string | undefined | null): ParsedEmbed | null {
  if (!raw || !raw.trim()) return null;
  const url = safeUrl(raw);
  if (!url) return null;
  return parseYouTube(url) ?? parseSoundCloud(url) ?? parseSpotify(url) ?? parseSuno(url);
}

export const EMBED_PROVIDER_LABELS: Record<EmbedProvider, string> = {
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  suno: 'Suno',
};

export const EMBED_HELP_TEXT =
  'Paste a YouTube, SoundCloud, Spotify, or Suno link — it plays right on your page. Other links show as a card.';
