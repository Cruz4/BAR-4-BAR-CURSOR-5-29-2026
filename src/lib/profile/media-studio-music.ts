import { auth } from '@/lib/firebase/client/firebase';
import { flattenLibraryItems, type DeckPlayable, type DropLibraryItem } from '@/lib/drop-library';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

export async function fetchStudioLibraryTracks(): Promise<{
  library: DeckPlayable[];
  mine: DeckPlayable[];
}> {
  const user = auth.currentUser;
  if (!user) return { library: [], mine: [] };
  const res = await fetch(`/api/drops/library?userId=${encodeURIComponent(user.uid)}`, {
    headers: await authHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as { items?: DropLibraryItem[]; error?: string };
  if (!res.ok) throw new Error(data.error || 'Could not open your library.');
  const library = flattenLibraryItems(Array.isArray(data.items) ? data.items : []);
  return {
    library,
    mine: library.filter((item) => item.own),
  };
}

export async function resolveStudioTrackUrl(shareId: string, trackId?: string): Promise<string> {
  const qs = new URLSearchParams({ shareId });
  if (trackId) qs.set('trackId', trackId);
  const res = await fetch(`/api/drops/audio?${qs}`, { headers: await authHeaders() });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || typeof data.url !== 'string' || !data.url) {
    throw new Error(data.error || 'Could not load that track.');
  }
  return data.url;
}
