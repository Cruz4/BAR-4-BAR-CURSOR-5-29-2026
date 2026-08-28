import 'server-only';

import { getAdminBucket, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import type { AudioStorageUsage } from '@/lib/ceo-dashboard-types';

/** GCS Standard US list rates used for CEO estimates (not an invoice). */
export const STORAGE_USD_PER_GB_MONTH = 0.023;
export const EGRESS_USD_PER_GB = 0.12;

const CACHE_TTL_MS = 10 * 60 * 1000;
const LIST_TIMEOUT_MS = 8_000;
const MAX_PAGES = 40;
const PAGE_SIZE = 1_000;
const DROP_PREFIX = 'drops/';

type CacheEntry = { at: number; usage: AudioStorageUsage };

let cache: CacheEntry | null = null;
let inflight: Promise<AudioStorageUsage> | null = null;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

function emptyUsage(note: string): AudioStorageUsage {
  return {
    ...buildUsage({
      fullBytes: 0,
      previewBytes: 0,
      songCount: 0,
      previewCount: 0,
      fileCount: 0,
      truncated: false,
    }),
    status: 'placeholder',
    note,
    storageUsdPerMonth: 0,
  };
}

function buildUsage(input: {
  fullBytes: number;
  previewBytes: number;
  songCount: number;
  previewCount: number;
  fileCount: number;
  truncated: boolean;
}): AudioStorageUsage {
  const typicalBytes = 15 * 1024 * 1024;
  const typicalFullBytes = 8 * 1024 * 1024;
  const totalBytes = input.fullBytes + input.previewBytes;
  const totalGb = bytesToGb(totalBytes);
  const avgBytesPerSong = input.songCount > 0 ? totalBytes / input.songCount : typicalBytes;
  const avgMbPerSong = input.songCount > 0 ? avgBytesPerSong / (1024 * 1024) : 0;
  const avgFullBytes = input.songCount > 0 ? input.fullBytes / input.songCount : typicalFullBytes;

  return {
    scannedAt: new Date().toISOString(),
    status: 'live',
    note: input.truncated
      ? 'Scan hit the file cap — totals are a lower bound until the next full pass.'
      : `Live bucket scan of ${DROP_PREFIX} · GCS Standard ~$${STORAGE_USD_PER_GB_MONTH}/GB-mo. Streaming billed separately at ~$${EGRESS_USD_PER_GB}/GB.`,
    fileCount: input.fileCount,
    songCount: input.songCount,
    previewCount: input.previewCount,
    fullBytes: input.fullBytes,
    previewBytes: input.previewBytes,
    totalBytes,
    totalGb: Math.round(totalGb * 1000) / 1000,
    avgMbPerSong: Math.round(avgMbPerSong * 10) / 10,
    storageUsdPerMonth: roundMoney(totalGb * STORAGE_USD_PER_GB_MONTH),
    storageRateUsdPerGbMonth: STORAGE_USD_PER_GB_MONTH,
    egressRateUsdPerGb: EGRESS_USD_PER_GB,
    truncated: input.truncated,
    projections: [100, 1_000, 10_000, 100_000].map((songs) => {
      const gb = bytesToGb(songs * avgBytesPerSong);
      return {
        songs,
        gb: Math.round(gb * 100) / 100,
        usdPerMonth: roundMoney(gb * STORAGE_USD_PER_GB_MONTH),
      };
    }),
    streamScenarios: [1_000, 10_000, 100_000, 1_000_000].map((plays) => {
      const gb = bytesToGb(plays * avgFullBytes);
      return {
        plays,
        gb: Math.round(gb * 10) / 10,
        usd: roundMoney(gb * EGRESS_USD_PER_GB),
      };
    }),
  };
}

async function scanDropBucket(): Promise<AudioStorageUsage> {
  if (!hasAdminFirestoreCredentials()) {
    return emptyUsage('Admin credentials unavailable — cannot list Cloud Storage.');
  }

  const bucket = getAdminBucket();
  let pageToken: string | undefined;
  let pages = 0;
  let fileCount = 0;
  let songCount = 0;
  let previewCount = 0;
  let fullBytes = 0;
  let previewBytes = 0;
  let truncated = false;

  do {
    pages += 1;
    if (pages > MAX_PAGES) {
      truncated = true;
      break;
    }
    const [files, nextQuery] = await bucket.getFiles({
      prefix: DROP_PREFIX,
      autoPaginate: false,
      maxResults: PAGE_SIZE,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const file of files) {
      const size = Number(file.metadata?.size || 0);
      if (!Number.isFinite(size) || size <= 0) continue;
      fileCount += 1;
      const name = file.name.replace(/\\/g, '/');
      if (/\/preview\.[^/]+$/i.test(name)) {
        previewCount += 1;
        previewBytes += size;
      } else {
        songCount += 1;
        fullBytes += size;
      }
    }
    pageToken =
      nextQuery && typeof nextQuery === 'object' && 'pageToken' in nextQuery
        ? String((nextQuery as { pageToken?: string }).pageToken || '') || undefined
        : undefined;
  } while (pageToken);

  return buildUsage({
    fullBytes,
    previewBytes,
    songCount,
    previewCount,
    fileCount,
    truncated,
  });
}

export async function getAudioStorageUsage(): Promise<AudioStorageUsage> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.usage;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const usage = await Promise.race([
        scanDropBucket(),
        new Promise<AudioStorageUsage>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Storage scan timed out')), LIST_TIMEOUT_MS);
        }),
      ]);
      cache = { at: Date.now(), usage };
      return usage;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Storage scan failed';
      console.warn('[audio-storage-usage]', message);
      if (cache) return { ...cache.usage, note: `${cache.usage.note} · last scan reused (${message})` };
      return emptyUsage(message);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      inflight = null;
    }
  })();

  return inflight;
}
