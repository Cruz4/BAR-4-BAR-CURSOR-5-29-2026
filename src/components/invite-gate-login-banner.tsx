'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { DEFAULT_INVITE_GATE_COPY } from '@/lib/invite-gate';

export function InviteGateLoginBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/invite-gate/status', { cache: 'no-store', credentials: 'include' }).then((r) => r.json()),
      fetch('/api/invite-gate/session', { cache: 'no-store', credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([status, session]) => {
        if (status?.enabled && session?.unlocked) {
          setMessage(status?.copy?.loginBanner || DEFAULT_INVITE_GATE_COPY.loginBanner);
        }
      })
      .catch(() => undefined);
  }, []);

  if (!message) return null;

  return (
    <div className="mx-auto mb-6 max-w-xl animate-in fade-in slide-in-from-top-2 duration-500 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center shadow-[0_0_24px_rgba(245,158,11,0.15)]">
      <p className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-amber-200">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
        {message}
      </p>
    </div>
  );
}
