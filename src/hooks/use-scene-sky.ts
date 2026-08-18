'use client';

import { useEffect, useState } from 'react';
import {
  buildSceneSkyState,
  defaultSceneSkyState,
  SCENE_HOUSE_CITY,
  type SceneSkyState,
} from '@/lib/scene/scene-sky';

const WEATHER_POLL_MS = 35 * 60 * 1000;
const PHASE_TICK_MS = 2 * 60 * 1000;
const GEO_KEY = 'b4b-scene-geo';
const GEO_TTL_MS = 6 * 60 * 60 * 1000;

type GeoCache = {
  lat: number;
  lon: number;
  savedAt: number;
  denied?: boolean;
};

type WeatherBits = {
  wmoCode?: number | null;
  windspeedKmh?: number | null;
  sunriseIso?: string;
  sunsetIso?: string;
};

type WeatherApiPayload = {
  sky?: SceneSkyState;
  city?: string;
  tempF?: number | null;
  lat?: number;
  lon?: number;
  source?: 'gps' | 'ip' | 'house';
  raw?: {
    wmoCode: number | null;
    windspeedKmh: number | null;
    tempF?: number | null;
    sunriseIso: string | null;
    sunsetIso: string | null;
  };
};

let sharedSky: SceneSkyState = defaultSceneSkyState();
let sharedBits: WeatherBits = {};
let sharedCity: string = SCENE_HOUSE_CITY.shortName;
let sharedTempF: number | null = null;
let sharedLat: number | null = SCENE_HOUSE_CITY.lat;
let sharedLon: number | null = SCENE_HOUSE_CITY.lon;
let inFlight: Promise<void> | null = null;
let lastFetchAt = 0;
let lastFetchKey = '';

function readGeoCache(): GeoCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCache;
    if (typeof parsed.savedAt !== 'number') return null;
    if (parsed.denied) return parsed;
    if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeGeoCache(cache: GeoCache) {
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

function geoFresh(cache: GeoCache | null): boolean {
  if (!cache || cache.denied) return false;
  return Date.now() - cache.savedAt < GEO_TTL_MS;
}

/** Policy used to block GPS entirely (geolocation=()). Unknown is allowed now. */
function isGeolocationAllowedByPolicy(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const policy =
      (document as Document & {
        permissionsPolicy?: { allowsFeature: (f: string) => boolean };
        featurePolicy?: { allowsFeature: (f: string) => boolean };
      }).permissionsPolicy ??
      (document as Document & { featurePolicy?: { allowsFeature: (f: string) => boolean } })
        .featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      return policy.allowsFeature('geolocation');
    }
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * GPS only if the browser already granted it — never pop a permission dialog.
 * Scene weather uses IP on the server when this returns null.
 */
async function resolveGrantedGps(): Promise<{ lat: number; lon: number } | null> {
  const cached = readGeoCache();
  if (cached && !cached.denied && geoFresh(cached)) {
    return { lat: cached.lat, lon: cached.lon };
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation || !isGeolocationAllowedByPolicy()) {
    return null;
  }

  let permission: PermissionState | 'unknown' = 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    permission = status.state;
  } catch {
    /* Safari / older browsers — skip GPS rather than prompt. */
    return null;
  }

  if (permission === 'denied') {
    return null;
  }
  if (permission !== 'granted') return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: GeoCache = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          savedAt: Date.now(),
        };
        writeGeoCache(next);
        resolve({ lat: next.lat, lon: next.lon });
      },
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: GEO_TTL_MS, timeout: 8000 }
    );
  });
}

async function fetchSceneWeather(): Promise<void> {
  if (inFlight) {
    await inFlight;
    return;
  }
  inFlight = (async () => {
    const gps = await resolveGrantedGps();
    const key = gps ? `${gps.lat.toFixed(3)},${gps.lon.toFixed(3)}` : 'auto';
    if (lastFetchAt > 0 && lastFetchKey === key && Date.now() - lastFetchAt < 60_000) return;

    const qs = gps
      ? `?lat=${encodeURIComponent(String(gps.lat))}&lon=${encodeURIComponent(String(gps.lon))}`
      : '';
    const res = await fetch(`/api/scene/weather${qs}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('weather failed');
    const data = (await res.json()) as WeatherApiPayload;
    const raw = data.raw;
    sharedBits = {
      wmoCode: raw?.wmoCode ?? null,
      windspeedKmh: raw?.windspeedKmh ?? null,
      sunriseIso: raw?.sunriseIso ?? undefined,
      sunsetIso: raw?.sunsetIso ?? undefined,
    };
    sharedSky =
      data.sky ??
      buildSceneSkyState({
        wmoCode: sharedBits.wmoCode,
        windspeedKmh: sharedBits.windspeedKmh,
        sunriseIso: sharedBits.sunriseIso,
        sunsetIso: sharedBits.sunsetIso,
      });
    if (typeof data.city === 'string' && data.city.trim()) {
      sharedCity = data.city.trim();
    } else if (data.source === 'house') {
      sharedCity = SCENE_HOUSE_CITY.shortName;
    }
    const nextTemp =
      typeof data.tempF === 'number' && Number.isFinite(data.tempF)
        ? Math.round(data.tempF)
        : typeof data.raw?.tempF === 'number' && Number.isFinite(data.raw.tempF)
          ? Math.round(data.raw.tempF)
          : null;
    sharedTempF = nextTemp;
    if (typeof data.lat === 'number' && Number.isFinite(data.lat)) sharedLat = data.lat;
    if (typeof data.lon === 'number' && Number.isFinite(data.lon)) sharedLon = data.lon;
    lastFetchAt = Date.now();
    lastFetchKey = key;
  })().finally(() => {
    inFlight = null;
  });
  await inFlight;
}

function tickPhaseFromBits(): SceneSkyState {
  const b = sharedBits;
  if (typeof b.wmoCode !== 'number') {
    return defaultSceneSkyState();
  }
  return buildSceneSkyState({
    wmoCode: b.wmoCode,
    windspeedKmh: b.windspeedKmh,
    sunriseIso: b.sunriseIso,
    sunsetIso: b.sunsetIso,
  });
}

/**
 * Scene skyline weather. No location popup.
 * GPS if already granted → else IP city on the server → NYC only if both fail.
 */
export function useSceneSky() {
  const [sky, setSky] = useState<SceneSkyState>(() => sharedSky);
  const [city, setCity] = useState(sharedCity);
  const [tempF, setTempF] = useState<number | null>(sharedTempF);
  const [lat, setLat] = useState<number | null>(sharedLat);
  const [lon, setLon] = useState<number | null>(sharedLon);
  const [ready, setReady] = useState(lastFetchAt > 0);

  useEffect(() => {
    let cancelled = false;
    let weatherTimer = 0;
    let phaseTimer = 0;

    const apply = (next: SceneSkyState) => {
      sharedSky = next;
      if (!cancelled) {
        setSky(next);
        setCity(sharedCity);
        setTempF(sharedTempF);
        setLat(sharedLat);
        setLon(sharedLon);
      }
    };

    (async () => {
      try {
        await fetchSceneWeather();
        if (!cancelled) apply(sharedSky);
      } catch {
        if (!cancelled) apply(defaultSceneSkyState());
      }
      if (!cancelled) setReady(true);
    })();

    weatherTimer = window.setInterval(() => {
      void fetchSceneWeather()
        .then(() => {
          if (!cancelled) apply(sharedSky);
        })
        .catch(() => undefined);
    }, WEATHER_POLL_MS);

    phaseTimer = window.setInterval(() => {
      if (!cancelled) apply(tickPhaseFromBits());
    }, PHASE_TICK_MS);

    return () => {
      cancelled = true;
      if (weatherTimer) window.clearInterval(weatherTimer);
      if (phaseTimer) window.clearInterval(phaseTimer);
    };
  }, []);

  return {
    phase: sky.phase,
    weather: sky.weather,
    hasWeather: sky.hasWeather,
    windy: sky.windy,
    updatedAt: sky.updatedAt,
    city,
    tempF,
    lat,
    lon,
    sky,
    ready,
    locationDenied: false,
  };
}
