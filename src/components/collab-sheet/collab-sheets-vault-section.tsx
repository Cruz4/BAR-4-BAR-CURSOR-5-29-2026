'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { listCollabSheetsClient } from '@/lib/collab-sheet/client';
import type { CollabSheetDoc } from '@/lib/collab-sheet/types';
import { useCollabSheetFeature } from '@/hooks/use-collab-sheet-feature';

export function CollabSheetsVaultSection() {
  const { user } = useAuth();
  const { enabled } = useCollabSheetFeature();
  const [sheets, setSheets] = useState<CollabSheetDoc[]>([]);

  useEffect(() => {
    if (!user?.id || !enabled) {
      setSheets([]);
      return;
    }
    let cancelled = false;
    void listCollabSheetsClient(user.id)
      .then((rows) => {
        if (!cancelled) setSheets(rows);
      })
      .catch((err) => {
        console.warn('[collab-sheets-vault]', err);
        if (!cancelled) setSheets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, enabled]);

  if (!enabled || !user || sheets.length === 0) return null;

  const owned = sheets.filter((s) => s.ownerId === user.id);
  const shared = sheets.filter((s) => s.ownerId !== user.id);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-violet-400" />
        <h2 className="font-headline text-lg uppercase tracking-tight text-violet-200">Collab Sheets</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[...owned, ...shared].map((s) => (
          <Card key={s.id} className="border-violet-500/25 bg-violet-500/5 p-3">
            <Link
              href={`/albums/${s.albumId}/tracks/${s.trackId}`}
              className="block space-y-1 hover:opacity-90"
            >
              <p className="text-sm font-bold truncate">{s.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {s.ownerId === user.id ? 'You shared' : `With ${s.members[s.ownerId]?.name || 'owner'}`}
                {s.albumTitle ? ` · ${s.albumTitle}` : ''}
              </p>
              <p className="font-code text-[9px] uppercase tracking-widest text-violet-300/80">
                {s.memberIds.filter((id) => !s.revoked[id]).length} on sheet · live
              </p>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
