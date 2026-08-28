/** Client-safe CEO command deck snapshot types (Analytics V2). */

export type CeoMetricStatus = 'live' | 'placeholder' | 'pending';

export type CeoMetricCell = {
  id: string;
  label: string;
  value: number | string | null;
  unit?: string;
  status: CeoMetricStatus;
  note?: string;
};

export type CeoDashboardTabId =
  | 'activation'
  | 'retention'
  | 'referral'
  | 'subscriptions'
  | 'ink'
  | 'music';

export type CeoDashboardTabSnapshot = {
  id: CeoDashboardTabId;
  label: string;
  metrics: CeoMetricCell[];
  stages?: Array<{ id: string; label: string; value: number | null; status: CeoMetricStatus }>;
};

export type AudioStorageProjection = {
  songs: number;
  gb: number;
  usdPerMonth: number;
};

export type AudioStorageStreamScenario = {
  plays: number;
  gb: number;
  usd: number;
};

/** Live GCS scan of drop audio + list-rate $ estimates (not an invoice). */
export type AudioStorageUsage = {
  scannedAt: string;
  status: CeoMetricStatus;
  note: string;
  fileCount: number;
  songCount: number;
  previewCount: number;
  fullBytes: number;
  previewBytes: number;
  totalBytes: number;
  totalGb: number;
  avgMbPerSong: number;
  storageUsdPerMonth: number;
  storageRateUsdPerGbMonth: number;
  egressRateUsdPerGb: number;
  truncated: boolean;
  projections: AudioStorageProjection[];
  streamScenarios: AudioStorageStreamScenario[];
};

export type CeoDashboardSnapshot = {
  generatedAt: string;
  mode: 'v2';
  dataHealth: {
    phase0AggregatesAccepted: false;
    note: string;
    lastAdminMetricsAt: string | null;
    fromAdminMetricsCache: boolean;
    schemaVersion: 1;
  };
  executive: CeoMetricCell[];
  tabs: CeoDashboardTabSnapshot[];
  audioStorage: AudioStorageUsage;
};
