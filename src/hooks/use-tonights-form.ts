'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TonightsFormPublic } from '@/lib/tonights-form';

export function fetchTonightsForm(userId?: string): Promise<TonightsFormPublic> {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return fetch(`/api/tonights-form${qs}`, { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) throw new Error('load failed');
    return (await res.json()) as TonightsFormPublic;
  });
}

export function useTonightsForm(userId?: string) {
  const [form, setForm] = useState<TonightsFormPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await fetchTonightsForm(userId);
      setForm(data);
    } catch {
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return {
    form,
    loading,
    reload,
    on: Boolean(form?.enabled),
  };
}
