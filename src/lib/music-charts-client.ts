import type { MusicChartsResponse } from '@/lib/music-charts';

export async function fetchMusicCharts(options: {
  trackLimit?: number;
  artistLimit?: number;
} = {}): Promise<MusicChartsResponse> {
  const params = new URLSearchParams({
    trackLimit: String(options.trackLimit || 100),
    artistLimit: String(options.artistLimit || 50),
  });
  const response = await fetch(`/api/charts?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load the music charts.');
  return data as MusicChartsResponse;
}
