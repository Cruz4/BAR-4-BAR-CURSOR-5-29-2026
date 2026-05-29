
'use client';

import { useContext } from 'react';
import { UIStateContext } from '@/context/ui-state-context';

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};
