'use client';

import { auth } from '@/lib/firebase/client/firebase';

export async function recordShareImport(shareId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: user.uid }),
  });

  if (!res.ok) {
    console.warn('[recordShareImport]', await res.text());
  }
}
