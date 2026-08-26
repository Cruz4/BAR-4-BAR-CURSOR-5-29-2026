

'use client';
// This file centralizes data fetching and mutation logic using React Query hooks.
// These hooks are designed to be called from client components.

import type { StyleProfile } from './types';

// This function is now deprecated as style profiles are handled in DataContext.
export function getMockStyleProfile(): Promise<StyleProfile> {
  return Promise.resolve({
    id: 'style-1',
    ownerId: 'user-1',
    history: [
        { timestamp: new Date().toISOString(), analysis: 'Initial style profile created.'}
    ],
    trainingRefs: [],
    updatedAt: new Date().toISOString(),
  });
};
