/**
 * Embed whitelist + URL parsing for Artist Home / Scene playable media.
 *
 * Embeds-only strategy: the provider hosts and streams the media, so profile
 * plays cost Bar 4 Bar nothing. Unsupported URLs fall back to a link card.
 */

export type EmbedProvider =
  | 'youtube'
  | 'soundcloud'
  | 'spotify'
  | 'suno'
  | 'tiktok'
  | 'instagram'
  | 'facebook';

export type ParsedEmbed = {
  provider: EmbedProvider;
  /** iframe src */
  src: string;
  /** Canonical watch/listen URL for "open on provider" links. */
  watchUrl: string;
  /** Fixed iframe height in px (video providers use aspect ratio instead). */
  height?: number;
  /** True when the embed is video-like (uses aspect box). */
  isVideo: boolean;
  /**
   * Padding-bottom % for the aspect box (default 56.25 = 16:9).
   * Portrait social video uses ~125–140.
   */
  aspectPaddingPercent?: number;
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
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
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
    watchUrl: clean,
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
    watchUrl: `https://open.spotify.com/${kind}/${id}`,
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
    watchUrl: `https://suno.com/song/${id}`,
    height: 240,
    isVideo: false,
  };
}

/** TikTok — official iframe player (full /@user/video/{id} URLs). */
function parseTikTok(url: URL): ParsedEmbed | null {
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host !== 'tiktok.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  // /@handle/video/7650249614154599694
  const videoIdx = parts.findIndex((p) => p === 'video' || p === 'photo');
  const id = videoIdx >= 0 ? parts[videoIdx + 1] : null;
  if (!id || !/^\d{5,25}$/.test(id)) return null;
  const handle = parts[0]?.startsWith('@') ? parts[0] : null;
  const watchUrl = handle
    ? `https://www.tiktok.com/${handle}/video/${id}`
    : `https://www.tiktok.com/video/${id}`;
  return {
    provider: 'tiktok',
    src: `https://www.tiktok.com/player/v1/${id}`,
    watchUrl,
    isVideo: true,
    aspectPaddingPercent: 130,
  };
}

/** Instagram — /p/, /reel/, /reels/, /tv/ → /embed/ iframe. */
function parseInstagram(url: URL): ParsedEmbed | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'instagram.com' && host !== 'instagr.am') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  const kind = parts[0];
  const code = parts[1];
  if (!code || !/^[A-Za-z0-9_-]{5,64}$/.test(code)) return null;
  if (kind !== 'p' && kind !== 'reel' && kind !== 'reels' && kind !== 'tv') return null;
  const pathKind = kind === 'reels' ? 'reel' : kind;
  const watchUrl = `https://www.instagram.com/${pathKind}/${code}/`;
  return {
    provider: 'instagram',
    src: `${watchUrl}embed/captioned/`,
    watchUrl,
    isVideo: true,
    aspectPaddingPercent: 125,
  };
}

/**
 * Facebook — posts + videos via plugins iframe.
 * Supports facebook.com/.../posts|videos|..., /watch/?v=, fb.watch/, /share/v|r/...
 */
function parseFacebook(url: URL): ParsedEmbed | null {
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '').replace(/^web\./, '');
  if (host !== 'facebook.com' && host !== 'fb.com' && host !== 'fb.watch') return null;

  const href = url.toString().split('#')[0];
  const parts = url.pathname.split('/').filter(Boolean);

  let isVideo = false;
  if (host === 'fb.watch' || parts[0] === 'watch' || parts.includes('videos') || parts[0] === 'share') {
    isVideo = parts[0] === 'share' ? parts[1] === 'v' || parts[1] === 'r' : true;
  }
  if (url.searchParams.has('v')) isVideo = true;

  // Need a recognizable content path — avoid bare profile URLs.
  const looksLikeContent =
    host === 'fb.watch' ||
    parts.includes('posts') ||
    parts.includes('videos') ||
    parts.includes('reel') ||
    parts.includes('reels') ||
    parts[0] === 'watch' ||
    parts[0] === 'story.php' ||
    parts[0] === 'permalink.php' ||
    parts[0] === 'photo.php' ||
    parts[0] === 'share' ||
    /^\d+$/.test(parts[0] || '');

  if (!looksLikeContent) return null;

  const encoded = encodeURIComponent(href);
  if (isVideo) {
    return {
      provider: 'facebook',
      src: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=500`,
      watchUrl: href,
      isVideo: true,
      aspectPaddingPercent: 56.25,
    };
  }
  return {
    provider: 'facebook',
    src: `https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500`,
    watchUrl: href,
    height: 480,
    isVideo: false,
  };
}

/** Parse a pasted URL into a playable embed; null means "show a link card". */
export function parseEmbedUrl(raw: string | undefined | null): ParsedEmbed | null {
  if (!raw || !raw.trim()) return null;
  const url = safeUrl(raw);
  if (!url) return null;
  return (
    parseYouTube(url) ??
    parseSoundCloud(url) ??
    parseSpotify(url) ??
    parseSuno(url) ??
    parseTikTok(url) ??
    parseInstagram(url) ??
    parseFacebook(url)
  );
}

export const EMBED_PROVIDER_LABELS: Record<EmbedProvider, string> = {
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  suno: 'Suno',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

export const EMBED_HELP_TEXT =
  'Paste a YouTube, TikTok, Instagram, Facebook, SoundCloud, Spotify, or Suno link — it plays right on your page. Other links show as a card. Use the full post URL (not a truncated short link when possible).';
