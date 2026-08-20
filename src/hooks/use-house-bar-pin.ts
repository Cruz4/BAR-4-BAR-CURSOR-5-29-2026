'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  HOUSE_BAR_PIN_CHANGED_EVENT,
  getHouseBarPinPlacement,
  setHouseBarPinPlacement,
  type HouseBarPinPlacement,
} from '@/lib/scene/house-bar-pin';

export function useHouseBarPin(seed: string, houseBarOn: boolean) {
  const [placement, setPlacement] = useState<HouseBarPinPlacement>('hero');

  useEffect(() => {
    if (!houseBarOn || !seed) {
      setPlacement('hero');
      return;
    }
    const sync = () => setPlacement(getHouseBarPinPlacement(seed));
    sync();
    window.addEventListener(HOUSE_BAR_PIN_CHANGED_EVENT, sync);
    return () => window.removeEventListener(HOUSE_BAR_PIN_CHANGED_EVENT, sync);
  }, [houseBarOn, seed]);

  const dock = useCallback(() => {
    if (!seed) return;
    setHouseBarPinPlacement(seed, 'dock');
  }, [seed]);

  const restore = useCallback(() => {
    if (!seed) return;
    setHouseBarPinPlacement(seed, 'hero');
  }, [seed]);

  return {
    placement: houseBarOn ? placement : 'hero',
    docked: houseBarOn && placement === 'dock',
    dock,
    restore,
  };
}
