'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { DropPulseKind } from '@/lib/drop-pulse';

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
