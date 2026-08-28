/**
 * Versioned product-surface modes for Elite Rollout.
 * Live switch: Admin Panel → Config → Product Surfaces (`config/productSurfaces`).
 */

export type ProductSurfaceMode = 'legacy' | 'v2' | 'off';
export type ReleaseRoomMode = 'off' | 'v1';
export type SupportCircleMode = 'legacy' | 'crm' | 'off';
export type ReleaseComposerMode = 'legacy' | 'guided' | 'off';
export type EmergencyMode = 'normal' | 'read_only' | 'maintenance';

export type ProductSurfacesConfig = {
  ceoDashboard: ProductSurfaceMode;
  supportCircle: SupportCircleMode;
  releaseComposer: ReleaseComposerMode;
  discoveryRails: ProductSurfaceMode;
  sharing: ProductSurfaceMode;
  sceneWeather: ProductSurfaceMode;
  releaseRoom: ReleaseRoomMode;
  emergency: EmergencyMode;
};

export type ProductSurfacesAdminConfig = ProductSurfacesConfig & {
  updatedAt: string | null;
  updatedBy: string | null;
  source: 'admin' | 'default';
};

export type ProductSurfacesPublicStatus = ProductSurfacesConfig & {
  updatedAt: string | null;
  source: 'admin' | 'default';
};

/** Safe defaults — new surfaces stay off/legacy until an admin opts in. */
export const PRODUCT_SURFACES_DEFAULTS: ProductSurfacesConfig = {
  ceoDashboard: 'legacy',
  supportCircle: 'legacy',
  releaseComposer: 'legacy',
  discoveryRails: 'legacy',
  sharing: 'legacy',
  sceneWeather: 'legacy',
  releaseRoom: 'off',
  emergency: 'normal',
};

export const PRODUCT_SURFACE_MODES: readonly ProductSurfaceMode[] = [
  'legacy',
  'v2',
  'off',
] as const;

export const SUPPORT_CIRCLE_MODES: readonly SupportCircleMode[] = [
  'legacy',
  'crm',
  'off',
] as const;

export const RELEASE_COMPOSER_MODES: readonly ReleaseComposerMode[] = [
  'legacy',
  'guided',
  'off',
] as const;

export const RELEASE_ROOM_MODES: readonly ReleaseRoomMode[] = ['off', 'v1'] as const;

export const EMERGENCY_MODES: readonly EmergencyMode[] = [
  'normal',
  'read_only',
  'maintenance',
] as const;

export const PRODUCT_SURFACES_CHANGED_EVENT = 'b4b:product-surfaces-changed';

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Normalize a partial/unknown doc into a full config (safe defaults fill gaps). */
export function normalizeProductSurfacesConfig(
  raw: Partial<ProductSurfacesConfig> | Record<string, unknown> | null | undefined
): ProductSurfacesConfig {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    ceoDashboard: isOneOf(data.ceoDashboard, PRODUCT_SURFACE_MODES)
      ? data.ceoDashboard
      : PRODUCT_SURFACES_DEFAULTS.ceoDashboard,
    supportCircle: isOneOf(data.supportCircle, SUPPORT_CIRCLE_MODES)
      ? data.supportCircle
      : PRODUCT_SURFACES_DEFAULTS.supportCircle,
    releaseComposer: isOneOf(data.releaseComposer, RELEASE_COMPOSER_MODES)
      ? data.releaseComposer
      : PRODUCT_SURFACES_DEFAULTS.releaseComposer,
    discoveryRails: isOneOf(data.discoveryRails, PRODUCT_SURFACE_MODES)
      ? data.discoveryRails
      : PRODUCT_SURFACES_DEFAULTS.discoveryRails,
    sharing: isOneOf(data.sharing, PRODUCT_SURFACE_MODES)
      ? data.sharing
      : PRODUCT_SURFACES_DEFAULTS.sharing,
    sceneWeather: isOneOf(data.sceneWeather, PRODUCT_SURFACE_MODES)
      ? data.sceneWeather
      : PRODUCT_SURFACES_DEFAULTS.sceneWeather,
    releaseRoom: isOneOf(data.releaseRoom, RELEASE_ROOM_MODES)
      ? data.releaseRoom
      : PRODUCT_SURFACES_DEFAULTS.releaseRoom,
    emergency: isOneOf(data.emergency, EMERGENCY_MODES)
      ? data.emergency
      : PRODUCT_SURFACES_DEFAULTS.emergency,
  };
}

export type ProductSurfacesPatch = Partial<ProductSurfacesConfig>;

/** Validate and pick only recognized mode fields from a request body. */
export function parseProductSurfacesPatch(
  body: Record<string, unknown> | null | undefined
): { ok: true; patch: ProductSurfacesPatch } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid payload' };
  }

  const patch: ProductSurfacesPatch = {};
  const checks: Array<[keyof ProductSurfacesConfig, readonly string[]]> = [
    ['ceoDashboard', PRODUCT_SURFACE_MODES],
    ['supportCircle', SUPPORT_CIRCLE_MODES],
    ['releaseComposer', RELEASE_COMPOSER_MODES],
    ['discoveryRails', PRODUCT_SURFACE_MODES],
    ['sharing', PRODUCT_SURFACE_MODES],
    ['sceneWeather', PRODUCT_SURFACE_MODES],
    ['releaseRoom', RELEASE_ROOM_MODES],
    ['emergency', EMERGENCY_MODES],
  ];

  for (const [key, allowed] of checks) {
    if (!(key in body)) continue;
    const value = body[key];
    if (!isOneOf(value, allowed)) {
      return { ok: false, error: `${key} must be one of: ${allowed.join(', ')}` };
    }
    (patch as Record<string, string>)[key] = value;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'No mode fields to update' };
  }

  return { ok: true, patch };
}
