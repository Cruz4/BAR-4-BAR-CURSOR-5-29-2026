'use client';

import { auth } from '@/lib/firebase/client/firebase';
import { normalizeArtistHomeConfig, type ArtistHomeConfig } from '@/lib/profile/modules';
import {
  applyHouseReleaseHomeVisibility,
  HOUSE_RELEASE_HOME_CHANGED,
} from '@/lib/profile/house-release-home';

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  return { user, token };
}

export async function fetchArtistHomeConfig(): Promise<ArtistHomeConfig> {
  const { user, token } = await authHeaders();
  const res = await fetch(`/api/profile/config?userId=${encodeURIComponent(user.uid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load profile config');
  const data = await res.json();
  return normalizeArtistHomeConfig(data.config);
}

/** Whether this user already has a saved Artist Home config doc. */
export async function fetchArtistHomePersisted(): Promise<boolean> {
  const { user, token } = await authHeaders();
  const res = await fetch(`/api/profile/config?userId=${encodeURIComponent(user.uid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load profile config');
  const data = await res.json();
  return Boolean(data.persisted);
}

export async function saveArtistHomeConfigClient(
  config: ArtistHomeConfig
): Promise<ArtistHomeConfig> {
  const { user, token } = await authHeaders();
  const res = await fetch('/api/profile/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: user.uid, config }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Failed to save profile config');
  }
  const data = await res.json();
  return normalizeArtistHomeConfig(data.config);
}

/** Persist On your page / Hidden on page and notify Release Catalog + Module Deck. */
export async function setHouseReleaseOnHome(shareId: string, visible: boolean): Promise<string[]> {
  const config = await fetchArtistHomeConfig();
  const next = applyHouseReleaseHomeVisibility(config.featured.hiddenHouseReleaseShareIds, shareId, visible);
  if (!next.length) delete config.featured.hiddenHouseReleaseShareIds;
  else config.featured.hiddenHouseReleaseShareIds = next;
  const saved = await saveArtistHomeConfigClient(config);
  const hidden = saved.featured.hiddenHouseReleaseShareIds || [];
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HOUSE_RELEASE_HOME_CHANGED, { detail: { hiddenShareIds: hidden } }));
  }
  return hidden;
}

export function subscribeHouseReleaseHome(onChange: (hiddenShareIds: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const hidden = (event as CustomEvent<{ hiddenShareIds?: string[] }>).detail?.hiddenShareIds;
    if (Array.isArray(hidden)) onChange(hidden);
  };
  window.addEventListener(HOUSE_RELEASE_HOME_CHANGED, handler);
  return () => window.removeEventListener(HOUSE_RELEASE_HOME_CHANGED, handler);
}
