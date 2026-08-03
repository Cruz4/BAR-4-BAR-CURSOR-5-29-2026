/**
 * Artist Home social links — optional outbound handles shown under the portrait.
 */

export type SocialProviderId =
  | 'instagram'
  | 'tiktok'
  | 'myspace'
  | 'snapchat'
  | 'suno'
  | 'spotify'
  | 'appleMusic'
  | 'github'
  | 'twitter';

export type ArtistHomeSocials = Partial<Record<SocialProviderId, string>>;

export const SOCIAL_PROVIDERS: Array<{
  id: SocialProviderId;
  label: string;
  short: string;
  placeholder: string;
  /** Build a safe https URL from a raw handle or URL. */
  toUrl: (raw: string) => string | null;
}> = [
  {
    id: 'instagram',
    label: 'Instagram',
    short: 'IG',
    placeholder: '@handle or instagram.com/...',
    toUrl: (raw) => socialUrl(raw, 'instagram.com', (h) => `https://instagram.com/${h}`),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    short: 'TT',
    placeholder: '@handle or tiktok.com/@...',
    toUrl: (raw) =>
      socialUrl(raw, 'tiktok.com', (h) => `https://www.tiktok.com/@${h.replace(/^@/, '')}`),
  },
  {
    id: 'spotify',
    label: 'Spotify',
    short: 'SPOT',
    placeholder: 'open.spotify.com/... or username',
    toUrl: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      if (/^https?:\/\//i.test(trimmed)) {
        try {
          const u = new URL(trimmed);
          if (!u.hostname.toLowerCase().includes('spotify.com')) return null;
          return u.toString();
        } catch {
          return null;
        }
      }
      const handle = trimmed.replace(/^@/, '').split(/[/?#]/)[0];
      if (!handle || handle.length > 64 || /[\s<>"']/.test(handle)) return null;
      return `https://open.spotify.com/user/${encodeURIComponent(handle)}`;
    },
  },
  {
    id: 'appleMusic',
    label: 'Apple Music',
    short: 'AM',
    placeholder: 'music.apple.com/…',
    toUrl: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      if (!/^https?:\/\//i.test(trimmed)) return null;
      try {
        const u = new URL(trimmed);
        if (!u.hostname.toLowerCase().includes('music.apple.com')) return null;
        return u.toString();
      } catch {
        return null;
      }
    },
  },
  {
    id: 'myspace',
    label: 'Myspace',
    short: 'MY',
    placeholder: 'myspace.com/...',
    toUrl: (raw) => socialUrl(raw, 'myspace.com', (h) => `https://myspace.com/${h}`),
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    short: 'SNAP',
    placeholder: 'username or snapchat.com/add/...',
    toUrl: (raw) =>
      socialUrl(raw, 'snapchat.com', (h) => `https://www.snapchat.com/add/${h.replace(/^@/, '')}`),
  },
  {
    id: 'suno',
    label: 'Suno',
    short: 'SUNO',
    placeholder: '@handle or suno.com/@...',
    toUrl: (raw) =>
      socialUrl(raw, 'suno.com', (h) => `https://suno.com/@${h.replace(/^@/, '')}`),
  },
  {
    id: 'github',
    label: 'GitHub',
    short: 'GH',
    placeholder: 'username or github.com/...',
    toUrl: (raw) => socialUrl(raw, 'github.com', (h) => `https://github.com/${h}`),
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    short: 'X',
    placeholder: '@handle or x.com/...',
    toUrl: (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      if (/^https?:\/\//i.test(trimmed)) {
        try {
          const u = new URL(trimmed);
          if (!/(^|\.)(twitter\.com|x\.com)$/i.test(u.hostname)) return null;
          return `https://${u.hostname}${u.pathname}`.replace(/\/$/, '') || null;
        } catch {
          return null;
        }
      }
      const handle = trimmed.replace(/^@/, '').replace(/^https?:\/\//i, '').split(/[/?#]/)[0];
      if (!/^[a-zA-Z0-9_]{1,30}$/.test(handle)) return null;
      return `https://x.com/${handle}`;
    },
  },
];

function socialUrl(
  raw: string,
  hostIncludes: string,
  fromHandle: (handle: string) => string
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (!u.hostname.toLowerCase().includes(hostIncludes)) return null;
      return u.toString();
    } catch {
      return null;
    }
  }
  const handle = trimmed
    .replace(/^@/, '')
    .replace(/^https?:\/\//i, '')
    .split(/[/?#]/)[0]
    .replace(new RegExp(`^(www\\.)?${hostIncludes.replace('.', '\\.')}/`, 'i'), '')
    .replace(/^add\//i, '')
    .replace(/^@/, '');
  if (!handle || handle.length > 64 || /[\s<>"']/.test(handle)) return null;
  return fromHandle(handle);
}

export function normalizeSocials(raw: unknown): ArtistHomeSocials | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const out: ArtistHomeSocials = {};
  for (const provider of SOCIAL_PROVIDERS) {
    const value = obj[provider.id];
    if (typeof value !== 'string') continue;
    const cleaned = value.trim().slice(0, 200);
    if (!cleaned) continue;
    out[provider.id] = cleaned;
  }
  return Object.keys(out).length ? out : undefined;
}

export function resolvedSocialLinks(
  socials?: ArtistHomeSocials | null
): Array<{ id: SocialProviderId; label: string; short: string; href: string }> {
  if (!socials) return [];
  const links: Array<{ id: SocialProviderId; label: string; short: string; href: string }> = [];
  for (const provider of SOCIAL_PROVIDERS) {
    const raw = socials[provider.id];
    if (!raw) continue;
    const href = provider.toUrl(raw);
    if (!href) continue;
    links.push({ id: provider.id, label: provider.label, short: provider.short, href });
  }
  return links;
}
