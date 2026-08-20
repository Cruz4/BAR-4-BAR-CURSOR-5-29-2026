'use client';

import { auth } from '@/lib/firebase/client/firebase';

async function createCatalogDocument(body: Record<string, unknown>): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Sign in required');
  const idToken = await firebaseUser.getIdToken();
  const response = await fetch('/api/catalog/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ ...body, userId: firebaseUser.uid }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error || 'Catalog creation failed');
  }
}

export async function createCatalogAlbum(
  albumId: string,
  document: Record<string, unknown>
): Promise<void> {
  await createCatalogDocument({ kind: 'album', albumId, document });
}

export async function createCatalogTrack(
  albumId: string,
  trackId: string,
  document: Record<string, unknown>
): Promise<void> {
  await createCatalogDocument({ kind: 'track', albumId, trackId, document });
}
