import { SCENE_HOUSE_CITY } from '@/lib/scene/scene-sky';

export type SceneWeatherSource = 'gps' | 'ip' | 'house';

export type SceneWeatherPlace = {
  lat: number;
  lon: number;
  city: string;
  source: SceneWeatherSource;
};

function isPrivateIp(ip: string): boolean {
  const v = ip.trim().replace(/^::ffff:/i, '');
  if (!v || v === '::1' || v === '127.0.0.1') return true;
  if (v.startsWith('10.') || v.startsWith('192.168.') || v.startsWith('127.')) return true;
  const m = v.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

export function clientIpFromRequest(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',') ?? [];
  const headers = [
    req.headers.get('cf-connecting-ip'),
    req.headers.get('x-real-ip'),
    req.headers.get('x-appengine-user-ip'),
    req.headers.get('fastly-client-ip'),
    ...forwarded,
  ];
  for (const raw of headers) {
    const ip = raw?.trim();
    if (ip && !isPrivateIp(ip)) return ip;
  }
  return null;
}

export function chipCityName(name: string | null | undefined, fallback = SCENE_HOUSE_CITY.shortName): string {
  const t = String(name || '').trim();
  if (!t) return fallback;
  if (/^new york/i.test(t)) return SCENE_HOUSE_CITY.shortName;
  return t.length > 18 ? `${t.slice(0, 17)}…` : t;
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** City-level place from IP. No browser prompt. NYC if lookup fails. */
export async function placeFromIp(ip: string | null): Promise<SceneWeatherPlace | null> {
  if (!ip) return null;

  const who = (await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`, 2500)) as {
    success?: boolean;
    city?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  if (who?.success !== false) {
    const lat = num(who?.latitude);
    const lon = num(who?.longitude);
    if (lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon, city: chipCityName(who?.city), source: 'ip' };
    }
  }

  const geojs = (await fetchJson(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`, 2500)) as {
    city?: string;
    latitude?: string | number;
    longitude?: string | number;
  } | null;
  const lat = num(geojs?.latitude);
  const lon = num(geojs?.longitude);
  if (lat != null && lon != null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return { lat, lon, city: chipCityName(geojs?.city), source: 'ip' };
  }

  return null;
}

/** Name the GPS pin so the chip isn't stuck on "Local". */
export async function cityFromCoords(lat: number, lon: number): Promise<string> {
  const data = (await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&language=en&format=json`,
    2000
  )) as { results?: Array<{ name?: string; admin1?: string }> } | null;
  const hit = data?.results?.[0];
  const named = hit?.name || hit?.admin1;
  return named ? chipCityName(named) : 'Local';
}

export function housePlace(): SceneWeatherPlace {
  return {
    lat: SCENE_HOUSE_CITY.lat,
    lon: SCENE_HOUSE_CITY.lon,
    city: SCENE_HOUSE_CITY.shortName,
    source: 'house',
  };
}
