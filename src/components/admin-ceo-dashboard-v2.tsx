'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { adminApiFetch } from '@/lib/admin-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudioLoader } from '@/components/studio-loader';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  Droplets,
  HardDrive,
  Music2,
  RefreshCw,
  Share2,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import type {
  AudioStorageUsage,
  CeoDashboardSnapshot,
  CeoDashboardTabId,
  CeoMetricCell,
} from '@/lib/ceo-dashboard-types';
import { AdminMetricsTab } from '@/components/admin-metrics-tab';

const TAB_META: Array<{ id: CeoDashboardTabId; label: string; icon: React.ElementType }> = [
  { id: 'activation', label: 'Activation', icon: Target },
  { id: 'retention', label: 'Retention', icon: Users },
  { id: 'referral', label: 'Referral', icon: Share2 },
  { id: 'subscriptions', label: 'Subs', icon: Wallet },
  { id: 'ink', label: 'Ink', icon: Droplets },
  { id: 'music', label: 'Music', icon: Music2 },
];

function formatUsd(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatStoredSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (bytes < 1024 * 1024) return `${Math.max(0, bytes / 1024).toFixed(0)} KB`;
  if (gb < 0.01) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (gb < 1) return `${gb.toFixed(3)} GB`;
  return `${gb.toFixed(2)} GB`;
}

function formatMetricValue(cell: CeoMetricCell): string {
  if (cell.value === null || cell.value === undefined) return '—';
  if (typeof cell.value === 'number') {
    if (cell.unit === '%' || cell.unit?.includes('%')) {
      return `${cell.value}`;
    }
    if (cell.unit?.includes('USD') || /revenue|receipts|gross|storage_usd/i.test(cell.id)) {
      const abs = Math.abs(cell.value);
      const digits = abs > 0 && abs < 100 ? 2 : 0;
      return formatUsd(cell.value, digits);
    }
    return cell.value.toLocaleString();
  }
  return String(cell.value);
}

function statusTone(status: CeoMetricCell['status']): string {
  if (status === 'live') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200';
  if (status === 'pending') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-white/10 bg-white/5 text-muted-foreground';
}

function ExecCell({ cell }: { cell: CeoMetricCell }) {
  return (
    <div className="min-w-[7.5rem] flex-1 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/20 px-3 py-3 sm:min-w-[8.5rem]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {cell.label}
        </p>
        <Badge
          variant="outline"
          className={cn('shrink-0 px-1.5 py-0 text-[7px] uppercase tracking-wider', statusTone(cell.status))}
        >
          {cell.status}
        </Badge>
      </div>
      <p className="mt-2 font-headline text-xl font-bold tabular-nums text-white sm:text-2xl">
        {formatMetricValue(cell)}
        {cell.unit === '%' && cell.value != null ? (
          <span className="ml-0.5 text-sm text-muted-foreground">%</span>
        ) : null}
      </p>
      {(cell.unit && cell.unit !== '%') || cell.note ? (
        <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">
          {[cell.unit && cell.unit !== '%' ? cell.unit : null, cell.note].filter(Boolean).join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

function MetricRow({ cell }: { cell: CeoMetricCell }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{cell.label}</p>
        {cell.note ? (
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{cell.note}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-code text-lg font-bold tabular-nums text-sky-200">{formatMetricValue(cell)}</p>
        <Badge
          variant="outline"
          className={cn('mt-1 px-1.5 py-0 text-[7px] uppercase tracking-wider', statusTone(cell.status))}
        >
          {cell.status}
        </Badge>
      </div>
    </div>
  );
}

function SongStorageBill({ usage }: { usage: AudioStorageUsage }) {
  return (
    <section
      aria-label="Song storage bill"
      className="rounded-xl border border-white/10 bg-gradient-to-b from-sky-500/[0.08] to-black/20 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <div>
            <p className="font-code text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">
              Song storage bill
            </p>
            <h3 className="mt-1 font-headline text-xl font-bold uppercase tracking-tight text-white">
              GB stored vs $
            </h3>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn('w-fit px-1.5 py-0 text-[7px] uppercase tracking-wider', statusTone(usage.status))}
        >
          {usage.truncated ? 'partial' : usage.status}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-3">
          <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Stored now
          </p>
          <p className="mt-1 font-headline text-2xl font-bold tabular-nums text-white">
            {formatStoredSize(usage.totalBytes)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {usage.songCount.toLocaleString()} songs · {usage.previewCount.toLocaleString()} previews
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-3">
          <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Storage / month
          </p>
          <p className="mt-1 font-headline text-2xl font-bold tabular-nums text-emerald-200">
            {formatUsd(usage.storageUsdPerMonth)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            GCS Standard ~{formatUsd(usage.storageRateUsdPerGbMonth, 3)}/GB-mo · not an invoice
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-3">
          <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Avg per song
          </p>
          <p className="mt-1 font-headline text-2xl font-bold tabular-nums text-white">
            {usage.avgMbPerSong || 0} MB
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Full + 30s preview · max 40 MB upload
          </p>
        </div>
      </div>

      {usage.projections.length ? (
        <div className="mt-4">
          <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Catalog projection at current avg size
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {usage.projections.map((row) => (
              <div key={row.songs} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{row.songs.toLocaleString()} songs</p>
                <p className="font-code text-sm font-bold tabular-nums text-sky-200">
                  {row.gb.toLocaleString()} GB
                </p>
                <p className="text-[10px] text-muted-foreground">{formatUsd(row.usdPerMonth)}/mo</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {usage.streamScenarios.length ? (
        <div className="mt-4">
          <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Streaming egress if each play pulls the full file (~{formatUsd(usage.egressRateUsdPerGb)}/GB)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {usage.streamScenarios.map((row) => (
              <div key={row.plays} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{row.plays.toLocaleString()} plays</p>
                <p className="font-code text-sm font-bold tabular-nums text-amber-200">
                  {formatUsd(row.usd)}
                </p>
                <p className="text-[10px] text-muted-foreground">{row.gb.toLocaleString()} GB egress</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{usage.note}</p>
    </section>
  );
}

export function AdminCeoDashboardV2() {
  const [snapshot, setSnapshot] = useState<CeoDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CeoDashboardTabId>('activation');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiFetch('/api/admin/ceo-dashboard');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load CEO dashboard');
      setSnapshot(data as CeoDashboardSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load CEO dashboard');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !snapshot) {
    return (
      <div className="py-16">
        <StudioLoader size="md" message="Spinning up the command deck…" />
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100">
        <p className="font-bold uppercase tracking-wider">CEO deck unavailable</p>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-code text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">
            CEO command deck · V2
          </p>
          <h2 className="mt-1 font-headline text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            Bar4Bar Pulse
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Dense funnel view for activation, retention, referral, and commerce. Placeholders stay honest until Phase 0
            aggregates are accepted.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </header>

      <div className="rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-card/40 to-sky-500/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0 space-y-1">
            <p className="font-code text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              Data health · Phase 0 aggregates pending acceptance
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{snapshot.dataHealth.note}</p>
            <p className="font-code text-[9px] uppercase tracking-wider text-muted-foreground/80">
              Cache:{' '}
              {snapshot.dataHealth.lastAdminMetricsAt
                ? new Date(snapshot.dataHealth.lastAdminMetricsAt).toLocaleString()
                : 'none'}
              {' · '}
              {snapshot.dataHealth.fromAdminMetricsCache ? 'from cache' : 'no live cache'}
              {' · '}
              schema v{snapshot.dataHealth.schemaVersion}
            </p>
          </div>
        </div>
      </div>

      <section aria-label="Executive strip">
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-300" />
          <p className="font-code text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Executive strip
          </p>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5 xl:grid-cols-5">
          {snapshot.executive.map((metric) => (
            <ExecCell key={metric.id} cell={metric} />
          ))}
        </div>
      </section>

      {snapshot.audioStorage ? <SongStorageBill usage={snapshot.audioStorage} /> : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as CeoDashboardTabId)} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1.5">
          {TAB_META.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:text-emerald-300"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {snapshot.tabs.map((panel) => (
          <TabsContent key={panel.id} value={panel.id} className="mt-0">
            <div className="rounded-xl border border-white/10 bg-card/50 p-4 sm:p-5">
              <h3 className="font-headline text-xl font-bold uppercase text-white">{panel.label}</h3>
              {panel.stages?.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {panel.stages.map((stage) => (
                    <div
                      key={stage.id}
                      className="rounded-lg border border-white/10 bg-black/20 px-3 py-3"
                    >
                      <p className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {stage.label}
                      </p>
                      <p className="mt-1 font-code text-xl font-bold tabular-nums text-sky-200">
                        {stage.value == null ? '—' : stage.value.toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-2 px-1.5 py-0 text-[7px] uppercase tracking-wider',
                          statusTone(stage.status)
                        )}
                      >
                        {stage.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-2">
                {panel.metrics.map((metric) => (
                  <MetricRow key={metric.id} cell={metric} />
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <section className="border-t border-white/10 pt-10" aria-label="Full growth metrics">
        <AdminMetricsTab embedded />
      </section>
    </div>
  );
}
