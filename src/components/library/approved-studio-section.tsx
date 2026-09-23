'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { GENERATED_IN_APP_LABEL } from '@/lib/song-generation/provenance';

type StudioTake = {
  id: string;
  trackId: string;
  albumId: string;
  workKind?: string;
  durationSec?: number;
  approvedAt?: string;
};

export function ApprovedStudioSection() {
  const { user } = useAuth();
  const [takes, setTakes] = useState<StudioTake[]>([]);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch('/api/render/library?approved=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTakes(data.takes || []);
    })();
  }, [user]);

  if (!takes.length) return null;

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="font-headline text-sm uppercase tracking-widest text-amber-200/90">
        Approved Studio
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Private generated songs and instrumentals — {GENERATED_IN_APP_LABEL}.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {takes.map((take) => (
          <li key={take.id} className="flex justify-between gap-2">
            <span>
              {take.workKind === 'instrumental' ? 'Instrumental' : 'Song'} · {take.id.slice(0, 8)}
            </span>
            <span className="text-muted-foreground">
              {take.durationSec ? `${Math.round(take.durationSec / 60)}m` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
