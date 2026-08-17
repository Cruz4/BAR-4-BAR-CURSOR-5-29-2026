/** Optional Artist Home contact line — public, or visible after a request is accepted. */

export const CONTACT_MAX_CHARS = 120;

export type ArtistHomeContactMode = 'public' | 'request';

export type ArtistHomeContact = {
  mode: ArtistHomeContactMode;
  /** Omitted on the public profile when mode is `request`. */
  value?: string;
};

export type ContactRequestStatus = 'none' | 'pending' | 'accepted' | 'declined';

export function normalizeContact(raw: unknown): ArtistHomeContact | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const mode: ArtistHomeContactMode | undefined =
    data.mode === 'request' ? 'request' : data.mode === 'public' ? 'public' : undefined;
  const value = typeof data.value === 'string' ? data.value.trim().slice(0, CONTACT_MAX_CHARS) : '';
  if (!mode) return undefined;
  // Public mirror of request-mode strips the secret. Keep the chip so visitors can request.
  if (!value) return mode === 'request' ? { mode: 'request' } : undefined;
  return { mode, value };
}

/** Public profile mirror — never publish the line when visitors must request it. */
export function contactForPublicProfile(contact: ArtistHomeContact | undefined): ArtistHomeContact | undefined {
  if (!contact) return undefined;
  if (contact.mode === 'public' && contact.value) return contact;
  if (contact.mode === 'request') return { mode: 'request' };
  return undefined;
}

export function contactHref(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  const digits = v.replace(/[^\d+]/g, '');
  if (/^\+?\d{7,15}$/.test(digits) && /[\d\s()+.-]{7,}/.test(v)) {
    return `tel:${digits}`;
  }
  return undefined;
}
