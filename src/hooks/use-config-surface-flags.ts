'use client';

import { useMemo } from 'react';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { useLockFeature } from '@/hooks/use-lock-feature';
import { useSceneLive } from '@/hooks/use-scene-live';

/** Admin Config toggles that should vanish from tips / landing / manual when off. */
export type ConfigSurfaceFeature = 'first-drops' | 'lock' | 'house-bar' | 'weekly-challenge';

export type ConfigSurfaceFlags = {
  firstDrops: boolean;
  lock: boolean;
  houseBar: boolean;
  weeklyChallenge: boolean;
};

const FEATURE_TO_FLAG: Record<ConfigSurfaceFeature, keyof ConfigSurfaceFlags> = {
  'first-drops': 'firstDrops',
  lock: 'lock',
  'house-bar': 'houseBar',
  'weekly-challenge': 'weeklyChallenge',
};

export function useConfigSurfaceFlags(): ConfigSurfaceFlags {
  const { enabled: firstDrops } = useFirstDropsFeature();
  const { enabled: lock } = useLockFeature();
  const { houseBarOn, weeklyOn } = useSceneLive();
  return useMemo(
    () => ({
      firstDrops,
      lock,
      houseBar: houseBarOn,
      weeklyChallenge: weeklyOn,
    }),
    [firstDrops, lock, houseBarOn, weeklyOn]
  );
}

export function configSurfaceAllows(
  feature: ConfigSurfaceFeature | ConfigSurfaceFeature[] | undefined,
  flags: ConfigSurfaceFlags
): boolean {
  if (!feature) return true;
  const list = Array.isArray(feature) ? feature : [feature];
  return list.every((item) => flags[FEATURE_TO_FLAG[item]]);
}
