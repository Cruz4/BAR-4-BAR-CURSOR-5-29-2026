'use client';

import React from 'react';
import { DataProvider } from '@/context/data-context';
import { UsageProvider } from '@/context/usage-context';
import { ArtistHomeEngagementProvider } from '@/context/artist-home-engagement-context';
import { ActivityAlertsProvider } from '@/context/activity-alerts-context';
import { FoldInboxProvider } from '@/components/folds/fold-inbox-provider';

export function StudioProviders({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <UsageProvider>
        <ArtistHomeEngagementProvider>
          <ActivityAlertsProvider>
            <FoldInboxProvider>{children}</FoldInboxProvider>
          </ActivityAlertsProvider>
        </ArtistHomeEngagementProvider>
      </UsageProvider>
    </DataProvider>
  );
}
