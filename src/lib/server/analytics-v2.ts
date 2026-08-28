import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { readCachedAdminMetrics } from '@/lib/server/admin-metrics-cache';
import { getAudioStorageUsage } from '@/lib/server/audio-storage-usage';
import type { AnalyticsEventV2 } from '@/lib/analytics-event-v2';
import { isAnalyticsEventV2 } from '@/lib/analytics-event-v2';
import type {
  CeoDashboardSnapshot,
  CeoDashboardTabSnapshot,
  CeoMetricCell,
  CeoMetricStatus,
} from '@/lib/ceo-dashboard-types';

export type {
  CeoDashboardSnapshot,
  CeoDashboardTabId,
  CeoDashboardTabSnapshot,
  CeoMetricCell,
  CeoMetricStatus,
} from '@/lib/ceo-dashboard-types';

const RAW_COLLECTION = 'analytics_events_v2';

function cell(
  id: string,
  label: string,
  value: number | string | null,
  status: CeoMetricStatus,
  extras?: Partial<Pick<CeoMetricCell, 'unit' | 'note'>>
): CeoMetricCell {
  return { id, label, value, status, ...extras };
}

function pending(id: string, label: string, note?: string): CeoMetricCell {
  return cell(id, label, null, 'pending', {
    note: note || 'Phase 0 aggregates pending acceptance',
  });
}

function sanitizeMeta(
  meta: AnalyticsEventV2['meta'] | undefined
): Record<string, string | number | boolean | null> | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Append-only write for AnalyticsEventV2.
 * Uses eventId as document id (idempotent). Never mutates an existing event.
 */
export async function appendAnalyticsEvent(
  event: AnalyticsEventV2
): Promise<{ ok: true; eventId: string; created: boolean } | { ok: false; error: string }> {
  if (!isAnalyticsEventV2(event)) {
    return { ok: false, error: 'Invalid AnalyticsEventV2' };
  }
  if (!hasAdminFirestoreCredentials()) {
    return { ok: false, error: 'Analytics storage unavailable' };
  }

  try {
    const db = await getDb();
    const ref = db.collection(RAW_COLLECTION).doc(event.eventId);
    const existing = await ref.get();
    if (existing.exists) {
      return { ok: true, eventId: event.eventId, created: false };
    }

    const payload: AnalyticsEventV2 = {
      v: 2,
      eventId: event.eventId,
      name: event.name.trim(),
      at: event.at,
      ...(event.anonId ? { anonId: event.anonId } : {}),
      ...(event.sessionId ? { sessionId: event.sessionId } : {}),
      ...(event.userId ? { userId: event.userId } : {}),
      ...(event.source ? { source: event.source } : {}),
      ...(event.surface ? { surface: event.surface } : {}),
      ...(event.entity?.type && event.entity?.id
        ? { entity: { type: event.entity.type, id: event.entity.id } }
        : {}),
      ...(event.campaignCode ? { campaignCode: event.campaignCode } : {}),
      ...(sanitizeMeta(event.meta) ? { meta: sanitizeMeta(event.meta) } : {}),
    };

    await ref.create(payload);
    return { ok: true, eventId: event.eventId, created: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'append failed';
    // Race: another writer created the same eventId
    if (/already exists|ALREADY_EXISTS/i.test(message)) {
      return { ok: true, eventId: event.eventId, created: false };
    }
    console.warn('[analytics-v2] appendAnalyticsEvent:', message);
    return { ok: false, error: message };
  }
}

/**
 * Safe CEO command-deck snapshot.
 * Uses cheap cached admin-metrics when available; otherwise zeros/nulls with labels.
 * Must not throw or force a full metrics recompute.
 */
export async function getCeoDashboardSnapshot(): Promise<CeoDashboardSnapshot> {
  const generatedAt = new Date().toISOString();
  const healthNote =
    'Phase 0 aggregates pending acceptance — executive strip mixes legacy cache where cheap and placeholders for V2-only metrics.';

  const audioStoragePromise = getAudioStorageUsage();

  let lastAdminMetricsAt: string | null = null;
  let fromCache = false;
  let signups: number | null = null;
  let activationLegacy: number | null = null;
  let activationRate: number | null = null;
  let active7: number | null = null;
  let d7Return: number | null = null;
  let ink30: number | null = null;
  let subRev30: number | null = null;
  let gross30: number | null = null;
  let checkoutStarts: number | null = null;
  let checkoutCompletions: number | null = null;
  let pricingViews: number | null = null;
  let shareCreated: number | null = null;
  let taggedSignups: number | null = null;

  try {
    const cached = await readCachedAdminMetrics('30d');
    if (cached) {
      fromCache = cached.cache.fromCache;
      lastAdminMetricsAt = cached.cache.computedAt || cached.generatedAt || null;
      signups = cached.funnel.signupsLast30Days ?? cached.funnel.totalSignups ?? 0;
      activationLegacy = cached.funnel.activatedUsers ?? 0;
      activationRate = cached.funnel.activationRatePercent ?? null;
      active7 = cached.retention.activeLast7Days ?? 0;
      d7Return = cached.retention.sevenDayReturnRatePercent ?? null;
      ink30 = cached.monetization.inkPackRevenue30d ?? 0;
      subRev30 = cached.monetization.subscriptionRevenue30d ?? 0;
      gross30 = cached.monetization.totalRevenue30d ?? 0;
      checkoutStarts = cached.funnel.checkoutStarts ?? 0;
      checkoutCompletions = cached.funnel.checkoutCompletions ?? 0;
      pricingViews = cached.funnel.pricingPageViews ?? 0;
      shareCreated = cached.gamification.shareCardGenerated ?? 0;
      taggedSignups = cached.signupAttribution.taggedSignups ?? 0;
    }
  } catch (error) {
    console.warn('[analytics-v2] getCeoDashboardSnapshot cache read:', (error as Error).message);
  }

  const liveOrZero = (value: number | null): { value: number; status: CeoMetricStatus } =>
    value === null ? { value: 0, status: 'placeholder' } : { value, status: 'live' };

  const signupsCell = liveOrZero(signups);
  const legacyAct = liveOrZero(activationLegacy);
  const wau = liveOrZero(active7);
  const d7 = liveOrZero(d7Return);
  const gross = liveOrZero(gross30);

  const executive: CeoMetricCell[] = [
    cell('signups', 'Signups', signupsCell.value, signupsCell.status, {
      note: signups === null ? 'No admin-metrics cache yet' : 'Last 30d (legacy cache)',
    }),
    pending('activation_meaningful', 'Meaningful activation', 'Canonical first saved bar — not emitted yet'),
    cell('activation_first_ai_legacy', 'Activation (AI legacy)', legacyAct.value, legacyAct.status, {
      unit: activationRate != null ? `${activationRate}% rate` : undefined,
      note: 'Legacy activatedAt / first AI diagnostic',
    }),
    cell('wau_creators', 'WAU creators', wau.value, wau.status, {
      note: 'Approximated via active last 7d until V2 creation agg',
    }),
    cell('d7_retention', 'D7 retention', d7.value, d7.status, {
      unit: '%',
      note: 'Legacy 7-day return rate — not cohort heatmap',
    }),
    pending('k_factor', 'Referral K', 'Invitee activation / WAU not computed yet'),
    cell('gross_receipts', 'Gross receipts', gross.value, gross.status, {
      unit: 'USD · 30d',
      note: 'Legacy total revenue 30d (mixed sources)',
    }),
    pending('platform_net', 'Platform net', 'Fee − processing estimate not in V2 yet'),
    pending('artist_payout_liability', 'Artist payout liability', 'Held + unpaid artist net pending V2 agg'),
    pending('production_gate_status', 'Production gate', 'Phase 6 on-demand gate'),
  ];

  const audioStorage = await audioStoragePromise;

  const tabs: CeoDashboardTabSnapshot[] = [
    {
      id: 'activation',
      label: 'Activation',
      metrics: [
        cell('signups', 'Signups (30d)', signupsCell.value, signupsCell.status),
        pending('activation_meaningful', 'Meaningful activation'),
        cell('activation_first_ai_legacy', 'First AI (legacy)', legacyAct.value, legacyAct.status),
        cell('activation_rate_legacy', 'Legacy activation rate', activationRate, activationRate == null ? 'placeholder' : 'live', {
          unit: '%',
        }),
      ],
      stages: [
        { id: 'signup', label: 'Signup', value: signupsCell.value, status: signupsCell.status },
        { id: 'meaningful', label: 'Meaningful bar', value: null, status: 'pending' },
        { id: 'first_ai', label: 'First AI (legacy)', value: legacyAct.value, status: legacyAct.status },
      ],
    },
    {
      id: 'retention',
      label: 'Retention',
      metrics: [
        cell('active_7d', 'Active 7d', wau.value, wau.status),
        cell('d7_return', '7d return rate', d7.value, d7.status, { unit: '%' }),
        pending('d1_heatmap', 'D1 / D7 / D30 heatmap'),
        pending('resurrection', 'Resurrection / churn cohorts'),
      ],
    },
    {
      id: 'referral',
      label: 'Referral',
      metrics: [
        cell('tagged_signups', 'Tagged signups', taggedSignups ?? 0, taggedSignups == null ? 'placeholder' : 'live'),
        cell('share_cards', 'Share cards generated', shareCreated ?? 0, shareCreated == null ? 'placeholder' : 'live'),
        pending('k_factor', 'K-factor'),
        pending('referral_paid', 'Referral → paid'),
      ],
    },
    {
      id: 'subscriptions',
      label: 'Subs',
      metrics: [
        cell('pricing_views', 'Offer / pricing views', pricingViews ?? 0, pricingViews == null ? 'placeholder' : 'live'),
        cell('checkout_starts', 'Checkout starts', checkoutStarts ?? 0, checkoutStarts == null ? 'placeholder' : 'live'),
        cell('checkout_complete', 'Checkout complete', checkoutCompletions ?? 0, checkoutCompletions == null ? 'placeholder' : 'live'),
        cell('sub_revenue_30d', 'Sub revenue 30d', subRev30 ?? 0, subRev30 == null ? 'placeholder' : 'live', {
          unit: 'USD',
        }),
        pending('renew_churn', 'Renew / churn'),
      ],
    },
    {
      id: 'ink',
      label: 'Ink',
      metrics: [
        pending('ink_pack_views', 'Pack views'),
        cell('ink_revenue_30d', 'Ink pack revenue 30d', ink30 ?? 0, ink30 == null ? 'placeholder' : 'live', {
          unit: 'USD',
        }),
        pending('ink_checkout_funnel', 'Pack → checkout → paid'),
      ],
    },
    {
      id: 'music',
      label: 'Music',
      metrics: [
        pending('release_view', 'Release views'),
        pending('release_preview', 'Previews'),
        pending('release_purchase', 'Purchases'),
        cell('gross_30d', 'Gross receipts 30d', gross.value, gross.status, { unit: 'USD' }),
        pending('platform_fees', 'Platform fees / held'),
        cell('songs_on_disk', 'Songs on disk', audioStorage.songCount, audioStorage.status, {
          note: audioStorage.truncated
            ? 'Bucket scan hit the file cap — lower bound'
            : `${audioStorage.avgMbPerSong || 0} MB avg · ${audioStorage.totalGb} GB`,
        }),
        cell('audio_storage_usd', 'Audio storage / mo', audioStorage.storageUsdPerMonth, audioStorage.status, {
          unit: 'USD',
          note: `GCS Standard ~$${audioStorage.storageRateUsdPerGbMonth}/GB-mo · not an invoice`,
        }),
      ],
    },
  ];

  return {
    generatedAt,
    mode: 'v2',
    dataHealth: {
      phase0AggregatesAccepted: false,
      note: healthNote,
      lastAdminMetricsAt,
      fromAdminMetricsCache: fromCache,
      schemaVersion: 1,
    },
    executive,
    tabs,
    audioStorage,
  };
}
