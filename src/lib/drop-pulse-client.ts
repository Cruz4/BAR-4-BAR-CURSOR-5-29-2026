'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { DropPulseKind } from '@/lib/drop-pulse';
import type { DropListenMilestone, DropListenSource } from '@/lib/drop-listen-analytics';

const SESSION_PREFIX = 'b4b.dropSpin.';

function sessionKey(shareId: string, kind: string): string {
  return `${SESSION_PREFIX}${shareId}.${kind}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;
  if (!user) return headers;
  try {
    const token = await user.getIdToken();
    return { ...headers, Authorization: `Bearer ${token}` };
  } catch {
    return headers;
  }
}

/** Fire-and-forget spin count. Client session + server 6h dedupe. */
export function recordDropSpinClient(shareId: string, kind: DropPulseKind): void {
  const id = shareId.trim();
  if (!id) return;
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey(id, kind))) return;
    sessionStorage.setItem(sessionKey(id, kind), '1');
  } catch {
    /* continue — server still dedupes signed-in users */
  }
  void (async () => {
    try {
      const headers = await authHeaders();
      await fetch('/api/drops/pulse', {
        method: 'POST',
        headers,
        body: JSON.stringify({ shareId: id, kind }),
      });
    } catch {
      /* ignore */
    }
  })();
}

/** Report a signed playback milestone; the server decides whether it qualifies. */
export async function recordDropListenProgressClient(input: {
  shareId: string;
  listenProof: string;
  milestone: DropListenMilestone;
  source: DropListenSource;
}): Promise<boolean> {
  const shareId = input.shareId.trim();
  if (!shareId || !input.listenProof) return false;
  const key = sessionKey(shareId, `proof2.${input.listenProof.slice(-12)}.${input.milestone}`);
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return true;
  } catch {
    /* server dedupe remains authoritative */
  }
  try {
    const headers = await authHeaders();
    const response = await fetch('/api/drops/pulse', {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    if (!response.ok) return false;
    try {
      if (typeof window !== 'undefined') sessionStorage.setItem(key, '1');
    } catch {
      /* server dedupe remains authoritative */
    }
    return true;
  } catch {
    /* analytics must never interrupt playback */
    return false;
  }
}
