import { auth } from '@/lib/firebase/client/firebase';
import type { DiscoverySearchResponse } from '@/lib/discovery-search';

export async function fetchDiscoverySearch(
  query: string,
  limit: number
): Promise<DiscoverySearchResponse> {
  const headers: HeadersInit = {};
  const user = auth.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`/api/discover/search?${params.toString()}`, { headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Search failed');
  return {
    hits: Array.isArray(data.hits) ? data.hits : [],
    total: Number(data.total) || 0,
    hasMore: Boolean(data.hasMore),
  };
}
