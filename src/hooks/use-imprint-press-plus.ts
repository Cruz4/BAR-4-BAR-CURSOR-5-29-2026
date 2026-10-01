'use client';

import { useEffect, useState } from 'react';

let cachedEnabled: boolean | null = null;
let inflight: Promise<boolean> | null = null;

async function fetchImprintPressPlus(): Promise<boolean> {
  if (cachedEnabled !== null) return cachedEnabled;
  if (inflight) return inflight;
  inflight = fetch('/api/config/imprint-press-plus', { cache: 'no-store' })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { enabled?: boolean };
      cachedEnabled = Boolean(data.enabled);
      return cachedEnabled;
    })
    .catch(() => {
      cachedEnabled = false;
      return false;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Client flag for expanded imprint variety (admin toggle). */
export function useImprintPressPlus(): boolean {
  const [enabled, setEnabled] = useState(cachedEnabled ?? false);

  useEffect(() => {
    void fetchImprintPressPlus().then(setEnabled);
  }, []);

  return enabled;
}
