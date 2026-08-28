/**
 * Scene sky model — day/night phase + weather condition for the skyline.
 * Weather codes follow Open-Meteo / WMO interpretation.
 *
 * Live weather prefers the viewer's place (IP, or GPS if already granted).
 * House city (NYC) is last resort when location cannot be resolved.
 */

/** Fallback city when IP / GPS cannot be resolved. */
export const SCENE_HOUSE_CITY = {
  name: 'New York',
  shortName: 'NYC',
  lat: 40.7128,
  lon: -74.006,
} as const;

export type SceneSkyPhase = 'day' | 'dusk' | 'night' | 'dawn';

export type SceneWeather =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'snow'
  | 'heavy_snow'
  | 'hail'
  | 'windy';

export type SceneSkyState = {
  phase: SceneSkyPhase;
  weather: SceneWeather;
  /** True when weather came from Open-Meteo (vs clock-only fallback). */
  hasWeather: boolean;
  windy: boolean;
  updatedAt: string;
  /** Peak gusts (km/h) — falls back from sustained wind when unknown. */
  gustsKmh?: number | null;
  /** Meteorological wind from-direction in degrees (0 = N, 90 = E). */
  windDirectionDeg?: number | null;
  /** 0–100 sky cover fraction. */
  cloudCoverPct?: number | null;
  /** Horizontal visibility in km. */
  visibilityKm?: number | null;
};

/** Optional Open-Meteo extras used by Weather V2 (gusts, direction, cover, visibility). */
export type SceneWeatherExtras = {
  gustsKmh?: number | null;
  windDirectionDeg?: number | null;
  cloudCoverPct?: number | null;
  visibilityKm?: number | null;
  windspeedKmh?: number | null;
};

/** Windspeed (km/h) at which we treat the sky as windy overlay. */
export const SCENE_WINDY_KMH = 35;

/**
 * Map Open-Meteo WMO weathercode → SceneWeather (before wind overlay).
 * @see https://open-meteo.com/en/docs
 */
export function weatherFromWmoCode(code: number): SceneWeather {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return 'drizzle';
  if (code === 61 || code === 63 || code === 66 || code === 80 || code === 81) return 'rain';
  if (code === 65 || code === 67 || code === 82) return 'heavy_rain';
  if (code === 71 || code === 73 || code === 77 || code === 85) return 'snow';
  if (code === 75 || code === 86) return 'heavy_snow';
  if (code === 95) return 'thunderstorm';
  if (code === 96 || code === 99) return 'hail';
  return 'cloudy';
}

/** Apply wind overlay: clear/partly/cloudy become `windy` when gusty. */
export function applyWindOverlay(
  weather: SceneWeather,
  windspeedKmh: number | null | undefined
): { weather: SceneWeather; windy: boolean } {
  const windy = typeof windspeedKmh === 'number' && windspeedKmh >= SCENE_WINDY_KMH;
  if (!windy) return { weather, windy: false };
  if (weather === 'clear' || weather === 'partly_cloudy' || weather === 'cloudy') {
    return { weather: 'windy', windy: true };
  }
  return { weather, windy: true };
}

function parseIsoLocal(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Phase from sunrise/sunset ISO timestamps (Open-Meteo daily), or null if unusable.
 * Dawn/dusk ≈ 45 minutes around sunrise/sunset.
 */
export function phaseFromSunTimes(
  now: Date,
  sunriseIso: string | undefined,
  sunsetIso: string | undefined
): SceneSkyPhase | null {
  const sunrise = sunriseIso ? parseIsoLocal(sunriseIso) : null;
  const sunset = sunsetIso ? parseIsoLocal(sunsetIso) : null;
  if (!sunrise || !sunset) return null;

  const t = now.getTime();
  const rise = sunrise.getTime();
  const set = sunset.getTime();
  const twilightMs = 45 * 60 * 1000;

  if (t >= rise - twilightMs && t < rise + twilightMs) return 'dawn';
  if (t >= set - twilightMs && t < set + twilightMs) return 'dusk';
  if (t >= rise + twilightMs && t < set - twilightMs) return 'day';
  return 'night';
}

/** Clock-only fallback when location/weather unavailable. */
export function phaseFromLocalClock(now: Date = new Date()): SceneSkyPhase {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 18) return 'day';
  if (h >= 18 && h < 20) return 'dusk';
  return 'night';
}

export function resolveSceneSkyPhase(
  now: Date,
  sunriseIso?: string,
  sunsetIso?: string
): SceneSkyPhase {
  return phaseFromSunTimes(now, sunriseIso, sunsetIso) ?? phaseFromLocalClock(now);
}

export function defaultSceneSkyState(now: Date = new Date()): SceneSkyState {
  return {
    phase: phaseFromLocalClock(now),
    weather: 'clear',
    hasWeather: false,
    windy: false,
    updatedAt: now.toISOString(),
    gustsKmh: null,
    windDirectionDeg: null,
    cloudCoverPct: 0,
    visibilityKm: 16,
  };
}

/** Sensible cover % when Open-Meteo omits `cloud_cover`. */
export function cloudCoverPctFromWeather(weather: SceneWeather): number {
  switch (weather) {
    case 'clear':
      return 5;
    case 'partly_cloudy':
    case 'windy':
      return 35;
    case 'drizzle':
    case 'rain':
      return 70;
    case 'cloudy':
    case 'fog':
    case 'snow':
      return 85;
    case 'heavy_rain':
    case 'heavy_snow':
    case 'hail':
    case 'thunderstorm':
      return 95;
    default:
      return 40;
  }
}

/** Visibility (km) when Open-Meteo omits `visibility`. */
export function visibilityKmFromWeather(weather: SceneWeather): number {
  switch (weather) {
    case 'fog':
      return 0.8;
    case 'heavy_rain':
    case 'thunderstorm':
    case 'hail':
      return 2.5;
    case 'rain':
    case 'heavy_snow':
      return 4;
    case 'drizzle':
    case 'snow':
      return 6;
    case 'cloudy':
      return 10;
    default:
      return 16;
  }
}

/**
 * Fill gusts / direction / cover / visibility from API fields, or derive from
 * condition + sustained wind when upstream omits them.
 */
export function resolveWeatherExtras(
  weather: SceneWeather,
  extras: SceneWeatherExtras = {}
): Required<Pick<SceneSkyState, 'gustsKmh' | 'windDirectionDeg' | 'cloudCoverPct' | 'visibilityKm'>> {
  const wind =
    typeof extras.windspeedKmh === 'number' && Number.isFinite(extras.windspeedKmh)
      ? Math.max(0, extras.windspeedKmh)
      : null;

  const gusts =
    typeof extras.gustsKmh === 'number' && Number.isFinite(extras.gustsKmh)
      ? Math.max(0, extras.gustsKmh)
      : wind != null
        ? Math.round(wind * 1.35)
        : null;

  let direction: number | null =
    typeof extras.windDirectionDeg === 'number' && Number.isFinite(extras.windDirectionDeg)
      ? ((extras.windDirectionDeg % 360) + 360) % 360
      : null;
  if (direction == null && wind != null && wind >= 8) {
    // Mild default westerly flow when we know it's breezy but lack a bearing.
    direction = 270;
  }

  const cover =
    typeof extras.cloudCoverPct === 'number' && Number.isFinite(extras.cloudCoverPct)
      ? Math.max(0, Math.min(100, extras.cloudCoverPct))
      : cloudCoverPctFromWeather(weather);

  const visibility =
    typeof extras.visibilityKm === 'number' && Number.isFinite(extras.visibilityKm)
      ? Math.max(0.05, extras.visibilityKm)
      : visibilityKmFromWeather(weather);

  return {
    gustsKmh: gusts,
    windDirectionDeg: direction,
    cloudCoverPct: cover,
    visibilityKm: visibility,
  };
}

/** Clamp display intensity for V2 layers (0–1). */
export function clampWeatherIntensity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Drift vector for cloud layers.
 * Meteorological "from" degrees → CSS translate direction the air moves toward.
 */
export function windDriftVector(
  windDirectionDeg: number | null | undefined,
  gustsKmh: number | null | undefined,
  windspeedKmh: number | null | undefined
): { dx: number; dy: number; speedFactor: number } {
  const speed = Math.max(gustsKmh ?? 0, windspeedKmh ?? 0, 0);
  const speedFactor = clampWeatherIntensity(0.35 + speed / 55);
  const fromDeg = typeof windDirectionDeg === 'number' ? windDirectionDeg : 270;
  const towardRad = ((fromDeg + 180) * Math.PI) / 180;
  return {
    dx: Math.sin(towardRad),
    dy: -Math.cos(towardRad) * 0.22,
    speedFactor,
  };
}

export function buildSceneSkyState(opts: {
  now?: Date;
  wmoCode?: number | null;
  windspeedKmh?: number | null;
  sunriseIso?: string;
  sunsetIso?: string;
  gustsKmh?: number | null;
  windDirectionDeg?: number | null;
  cloudCoverPct?: number | null;
  visibilityKm?: number | null;
}): SceneSkyState {
  const now = opts.now ?? new Date();
  const phase = resolveSceneSkyPhase(now, opts.sunriseIso, opts.sunsetIso);
  const hasWeather = typeof opts.wmoCode === 'number';
  const base = hasWeather ? weatherFromWmoCode(opts.wmoCode!) : 'clear';
  const { weather, windy } = hasWeather
    ? applyWindOverlay(base, opts.windspeedKmh)
    : { weather: 'clear' as SceneWeather, windy: false };

  const extras = resolveWeatherExtras(weather, {
    gustsKmh: opts.gustsKmh,
    windDirectionDeg: opts.windDirectionDeg,
    cloudCoverPct: opts.cloudCoverPct,
    visibilityKm: opts.visibilityKm,
    windspeedKmh: opts.windspeedKmh,
  });

  return {
    phase,
    weather,
    hasWeather,
    windy,
    updatedAt: now.toISOString(),
    ...extras,
  };
}

export function showsStars(phase: SceneSkyPhase): boolean {
  return phase === 'night' || phase === 'dusk';
}

export function showsSun(phase: SceneSkyPhase, weather: SceneWeather): boolean {
  if (phase !== 'day' && phase !== 'dawn') return false;
  return (
    weather === 'clear' ||
    weather === 'partly_cloudy' ||
    weather === 'windy'
  );
}

export function cloudIntensity(weather: SceneWeather): number {
  switch (weather) {
    case 'clear':
      return 0;
    case 'partly_cloudy':
    case 'windy':
      return 0.35;
    case 'drizzle':
    case 'rain':
      return 0.55;
    case 'cloudy':
    case 'fog':
    case 'snow':
      return 0.7;
    case 'heavy_rain':
    case 'heavy_snow':
    case 'hail':
    case 'thunderstorm':
      return 0.9;
    default:
      return 0.4;
  }
}

export function precipKind(
  weather: SceneWeather
): 'none' | 'drizzle' | 'rain' | 'heavy_rain' | 'snow' | 'heavy_snow' | 'hail' {
  switch (weather) {
    case 'drizzle':
      return 'drizzle';
    case 'rain':
      return 'rain';
    case 'heavy_rain':
    case 'thunderstorm':
      return 'heavy_rain';
    case 'snow':
      return 'snow';
    case 'heavy_snow':
      return 'heavy_snow';
    case 'hail':
      return 'hail';
    default:
      return 'none';
  }
}

const PHASE_CHIP: Record<SceneSkyPhase, string> = {
  dawn: 'dawn',
  day: 'day',
  dusk: 'dusk',
  night: 'night',
};

const WEATHER_ON_THE_BLOCK: Record<SceneWeather, string> = {
  clear: 'Clear',
  partly_cloudy: 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog on the block',
  drizzle: 'Drizzle on the block',
  rain: 'Rain on the block',
  heavy_rain: 'Heavy rain on the block',
  thunderstorm: 'Storm on the block',
  snow: 'Snow on the block',
  heavy_snow: 'Heavy snow on the block',
  hail: 'Hail on the block',
  windy: 'Windy',
};

/** Short Scene chip: "Rain on the block · night" / "Clear · day". */
export function sceneWeatherChipLabel(
  weather: SceneWeather,
  phase: SceneSkyPhase
): string {
  const sky = WEATHER_ON_THE_BLOCK[weather] ?? 'On the block';
  return `${sky} · ${PHASE_CHIP[phase]}`;
}

/** Compact Fahrenheit for the Scene weather chip — `72°`. */
export function formatSceneTempF(tempF: number | null | undefined): string | null {
  if (typeof tempF !== 'number' || !Number.isFinite(tempF)) return null;
  return `${Math.round(tempF)}°`;
}
