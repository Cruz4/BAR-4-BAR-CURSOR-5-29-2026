'use client';

import { useEffect, useMemo, useState } from 'react';
import { AtSign } from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';

type MentionHit = { userId: string; displayName: string; slug: string; studioBadge?: 'pro' | 'free' };

export function MentionSuggestions({
  value,
  onChange,
  excludeUserId,
}: {
  value: string;
  onChange: (value: string) => void;
  excludeUserId?: string;
}) {
  const match = useMemo(() => value.match(/(?:^|\s)@([a-z0-9_-]{2,48})$/i), [value]);
  const query = match?.[1] || '';
  const [hits, setHits] = useState<MentionHit[]>([]);

  useEffect(() => {
    if (!query) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query });
      if (excludeUserId) params.set('excludeUserId', excludeUserId);
      if (excludeUserId) params.set('viewerId', excludeUserId);
      void auth.currentUser?.getIdToken().then((token) => fetch(`/api/profile/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }))
        .then(async (response) => response.ok ? response.json() : { artists: [] })
        .then((data) => {
          if (!cancelled) setHits(Array.isArray(data.artists) ? data.artists.slice(0, 7) : []);
        })
        .catch(() => { if (!cancelled) setHits([]); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [excludeUserId, query]);

  if (!query || !hits.length || !match) return null;
  const start = match.index! + match[0].lastIndexOf('@');
  return (
    <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-sky-400/30 bg-[hsl(216_38%_7%)] shadow-2xl">
      {hits.map((hit) => (
        <button
          key={hit.userId}
          type="button"
          className="flex w-full items-center gap-2 border-b border-white/8 px-3 py-2 text-left last:border-0 hover:bg-white/[0.06]"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(`${value.slice(0, start)}@${hit.slug} ${value.slice(start + query.length + 1)}`);
            setHits([]);
          }}
        >
          <AtSign className="h-3.5 w-3.5 shrink-0 text-sky-300" />
          <span className="min-w-0 flex-1 truncate text-xs font-bold">{hit.displayName}</span>
          <span className="truncate font-code text-[9px] text-muted-foreground">@{hit.slug}</span>
        </button>
      ))}
    </div>
  );
}
