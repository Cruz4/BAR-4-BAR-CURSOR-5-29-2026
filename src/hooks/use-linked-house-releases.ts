'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/client/firebase';
import type { LinkedHouseRelease } from '@/lib/house-artist-link';

async function waitForAuthUid(expectedUserId: string, attempts = 12, delayMs = 200): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const current = auth.currentUser;
    if (current?.uid === expectedUserId) {
      return current.getIdToken();
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

export async function fetchLinkedHouseReleases(userId: string): Promise<LinkedHouseRelease[]> {
  const token = await waitForAuthUid(userId);
  if (!token) return [];
  const houseRes = await fetch(`/api/profile/house-releases?userId=${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await houseRes.json().catch(() => ({}))) as { releases?: LinkedHouseRelease[] };
  if (!houseRes.ok || !Array.isArray(data.releases)) return [];
  return data.releases;
}

export function useLinkedHouseReleases(userId: string | undefined, enabled = true) {
  const [linkedHouse, setLinkedHouse] = useState<LinkedHouseRelease[]>([]);
  const [loadingHouse, setLoadingHouse] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshLinkedHouse = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !userId) {
      setLinkedHouse([]);
      setLoadingHouse(false);
      return;
    }
    let cancelled = false;
    setLoadingHouse(true);
    void fetchLinkedHouseReleases(userId).then((releases) => {
      if (cancelled) return;
      setLinkedHouse(releases);
      setLoadingHouse(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, enabled, refreshKey]);

  return { linkedHouse, loadingHouse, refreshLinkedHouse };
}
