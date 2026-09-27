'use client';

import {
  ARTIST_HOME_PROSPECT_CLAIM_SESSION_KEY,
  type ArtistHomeProspectClaimIntent,
} from '@/lib/artist-home-prospect';

export function persistArtistHomeProspectClaim(intent: ArtistHomeProspectClaimIntent): void {
  try {
    sessionStorage.setItem(ARTIST_HOME_PROSPECT_CLAIM_SESSION_KEY, JSON.stringify(intent));
  } catch {
    /* ignore */
  }
}

export function readArtistHomeProspectClaim(): ArtistHomeProspectClaimIntent | null {
  try {
    const raw = sessionStorage.getItem(ARTIST_HOME_PROSPECT_CLAIM_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArtistHomeProspectClaimIntent;
    if (!parsed?.prospectId || !parsed?.slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearArtistHomeProspectClaim(): void {
  try {
    sessionStorage.removeItem(ARTIST_HOME_PROSPECT_CLAIM_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
