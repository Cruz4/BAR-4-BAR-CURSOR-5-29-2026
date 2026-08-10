'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildSceneSkyState,
  defaultSceneSkyState,
  type SceneSkyState,
} from '@/lib/scene/scene-sky';

const GEO_KEY = 'b4b-scene-geo';
const GEO_TTL_MS = 6 * 60 * 60 * 1000;
const WEATHER_POLL_MS = 35 * 60 * 1000;
const PHASE_TICK_MS = 2 * 60 * 1000;

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

async function requestGeo(): Promise<GeoCache> {
  const cached = readGeoCache();
  if (cached?.denied) return cached;
  if (geoFresh(cached)) return cached!;

  if (typeof navigator === 'undefined' || !navigator.geolocation || !isGeolocationAllowedByPolicy()) {
    const denied: GeoCache = { lat: 0, lon: 0, savedAt: Date.now(), denied: true };
    writeGeoCache(denied);
    return denied;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: GeoCache = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          savedAt: Date.now(),
        };
        writeGeoCache(next);
        resolve(next);
      },
      () => {
        const denied: GeoCache = { lat: 0, lon: 0, savedAt: Date.now(), denied: true };
        writeGeoCache(denied);
        resolve(denied);
      },
      { enableHighAccuracy: false, maximumAge: GEO_TTL_MS, timeout: 12_000 }
    );
  });
}

/** Avoid calling getCurrentPosition when Permissions-Policy has geolocation=() (console spam). */
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
  // next.config sets geolocation=() — treat unknown as blocked to skip the call.
  return false;
}

type WeatherApiPayload = {
  sky?: SceneSkyState;
  raw?: {
    wmoCode: number | null;
    windspeedKmh: number | null;
    sunriseIso: string | null;
    sunsetIso: string | null;
  };
};

/**
 * Local day/night + optional live weather for The Scene skyline.
 * Falls back to clock-only phase when geolocation is denied.
 */
export function useSceneSky() {
  const [sky, setSky] = useState<SceneSkyState>(() => defaultSceneSkyState());
  const [ready, setReady] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const bitsRef = useRef<WeatherBits>({});
  const deniedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let weatherTimer = 0;
    let phaseTimer = 0;

    const applyFromBits = () => {
      if (deniedRef.current) {
        setSky(defaultSceneSkyState());
        return;
      }
      const b = bitsRef.current;
      setSky(
        buildSceneSkyState({
          wmoCode: b.wmoCode,
          windspeedKmh: b.windspeedKmh,
          sunriseIso: b.sunriseIso,
          sunsetIso: b.sunsetIso,
        })
      );
    };

    const loadWeather = async (lat: number, lon: number) => {
      const res = await fetch(
        `/api/scene/weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
      );
      if (!res.ok) throw new Error('weather failed');
      const data = (await res.json()) as WeatherApiPayload;
      const raw = data.raw;
      bitsRef.current = {
        wmoCode: raw?.wmoCode ?? null,
        windspeedKmh: raw?.windspeedKmh ?? null,
        sunriseIso: raw?.sunriseIso ?? undefined,
        sunsetIso: raw?.sunsetIso ?? undefined,
      };
      if (data.sky) setSky(data.sky);
      else applyFromBits();
    };

    (async () => {
      const geo = await requestGeo();
      if (cancelled) return;

      if (geo.denied) {
        deniedRef.current = true;
        setLocationDenied(true);
        setSky(defaultSceneSkyState());
        setReady(true);
        phaseTimer = window.setInterval(() => {
          setSky(defaultSceneSkyState());
        }, PHASE_TICK_MS);
        return;
      }

      deniedRef.current = false;
      setLocationDenied(false);
      try {
        await loadWeather(geo.lat, geo.lon);
      } catch {
        setSky(defaultSceneSkyState());
      }
      if (cancelled) return;
      setReady(true);

      weatherTimer = window.setInterval(() => {
        void loadWeather(geo.lat, geo.lon).catch(() => undefined);
      }, WEATHER_POLL_MS);

      phaseTimer = window.setInterval(() => {
        applyFromBits();
      }, PHASE_TICK_MS);
    })();

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
    sky,
    ready,
    locationDenied,
  };
}
