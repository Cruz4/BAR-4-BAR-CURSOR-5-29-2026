import { auth } from '@/lib/firebase/client/firebase';

export type ImprintCollectionEntry = {
  postId: string;
  savedAt: string;
  postOwnerId: string;
  postOwnerName: string;
  postOwnerSlug?: string;
};

async function authHeaders(): Promise<Record<string, string> | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchImprintCollection(): Promise<ImprintCollectionEntry[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const headers = await authHeaders();
  if (!headers) return [];
  const res = await fetch(`/api/posts/imprint-collection?userId=${encodeURIComponent(user.uid)}`, {
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as { entries?: ImprintCollectionEntry[] };
  if (!res.ok || !Array.isArray(data.entries)) return [];
  return data.entries;
}

export async function isImprintSaved(postId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !postId.trim()) return false;
  const headers = await authHeaders();
  if (!headers) return false;
  const params = new URLSearchParams({ userId: user.uid, postId });
  const res = await fetch(`/api/posts/imprint-collection?${params}`, { headers });
  const data = (await res.json().catch(() => ({}))) as { saved?: boolean };
  return res.ok && data.saved === true;
}

export async function saveImprintToCollection(
  postId: string,
  options?: { hostProfileUserId?: string }
): Promise<{ saved: boolean; imprintSaveCount: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to save imprints.');
  const headers = await authHeaders();
  if (!headers) throw new Error('Sign in to save imprints.');
  const hostProfileUserId = options?.hostProfileUserId?.trim();
  const res = await fetch('/api/posts/imprint-collection', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId: user.uid,
      postId,
      action: 'save',
      ...(hostProfileUserId ? { hostProfileUserId } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    saved?: boolean;
    imprintSaveCount?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || 'Could not save to collection.');
  return {
    saved: data.saved === true,
    imprintSaveCount: typeof data.imprintSaveCount === 'number' ? data.imprintSaveCount : 0,
  };
}

export async function unsaveImprintFromCollection(
  postId: string
): Promise<{ saved: boolean; imprintSaveCount: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to update your collection.');
  const headers = await authHeaders();
  if (!headers) throw new Error('Sign in to update your collection.');
  const res = await fetch('/api/posts/imprint-collection', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.uid, postId, action: 'unsave' }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    saved?: boolean;
    imprintSaveCount?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || 'Could not remove from collection.');
  return {
    saved: data.saved === true,
    imprintSaveCount: typeof data.imprintSaveCount === 'number' ? data.imprintSaveCount : 0,
  };
}
