import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import type { AnalyticsEventName } from '@/lib/analytics-events';

export async function recordStudioEvent(
  userId: string,
  event: AnalyticsEventName,
  metadata: Record<string, string | number | boolean | null> = {},
  userName?: string
): Promise<void> {
  if (!hasAdminFirestoreCredentials()) return;

  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();

    await db.collection('analytics_events').add({
      userId,
      userName: userName || null,
      event,
      metadata,
      timestamp,
    });

    const summaryRef = db.doc(`users/${userId}/analytics/summary`);
    const summarySnap = await summaryRef.get();
    const existing = summarySnap.data() || {};

    const updates: Record<string, unknown> = {
      lastActiveAt: timestamp,
      updatedAt: timestamp,
    };

    if (event === 'session_start') {
      const dates: string[] = existing.sessionDates || [];
      const day = timestamp.slice(0, 10);
      if (!dates.includes(day)) {
        updates.sessionDates = FieldValue.arrayUnion(day);
      }
    }

    if (event === 'pricing_view') {
      updates.pricingViews = (existing.pricingViews || 0) + 1;
      updates.lastPricingViewAt = timestamp;
    }

    if (event === 'checkout_started') {
      updates.checkoutStarts = (existing.checkoutStarts || 0) + 1;
      updates.lastCheckoutStartAt = timestamp;
    }

    if (event === 'checkout_completed') {
      updates.checkoutCompletions = (existing.checkoutCompletions || 0) + 1;
      updates.lastCheckoutCompletedAt = timestamp;
    }

    if (event === 'track_editor_open' && !existing.firstTrackEditorAt) {
      updates.firstTrackEditorAt = timestamp;
    }

    if (event === 'ai_action') {
      if (!existing.firstAiAt) updates.firstAiAt = timestamp;
      const action = String(metadata.actionName || '');
      if (action === 'generateNextLine' && !existing.firstGenerateNextLineAt) {
        updates.firstGenerateNextLineAt = timestamp;
      }
      if (action === 'analyzeStructure' && !existing.firstAnalyzeStructureAt) {
        updates.firstAnalyzeStructureAt = timestamp;
      }
      if (action === 'findRhymes' && !existing.firstRhymePulseAt) {
        updates.firstRhymePulseAt = timestamp;
      }
      updates.totalAiActions = (existing.totalAiActions || 0) + 1;
    }

    if (event === 'free_limit_hit') {
      updates.freeLimitHits = (existing.freeLimitHits || 0) + 1;
      updates.lastFreeLimitHitAt = timestamp;
      const limitType = String(metadata.limitType || 'unknown');
      updates[`freeLimitHits_${limitType}`] =
        (Number(existing[`freeLimitHits_${limitType}`]) || 0) + 1;
    }

    if (event === 'low_ink_hit') {
      updates.lowInkHits = (existing.lowInkHits || 0) + 1;
      updates.lastLowInkHitAt = timestamp;
    }

    if (event === 'ink_depletion') {
      updates.inkDepletions = (existing.inkDepletions || 0) + 1;
      if (!existing.inkDepletedAt) updates.inkDepletedAt = timestamp;
      updates.lastInkDepletedAt = timestamp;
    }

    if (event === 'trial_quest_complete') {
      updates.trialQuestCompletes = (existing.trialQuestCompletes || 0) + 1;
      if (!existing.trialQuestCompletedAt) updates.trialQuestCompletedAt = timestamp;
    }

    if (event === 'upgrade_click') {
      updates.upgradeClicks = (existing.upgradeClicks || 0) + 1;
      const trigger = String(metadata.trigger || 'other');
      updates[`upgradeClicks_${trigger}`] =
        (Number(existing[`upgradeClicks_${trigger}`]) || 0) + 1;
      updates.lastUpgradeClickAt = timestamp;
      updates.lastUpgradeClickTrigger = trigger;
    }

    if (event === 'signup' && !existing.signupAt) {
      updates.signupAt = timestamp;
    }

    await summaryRef.set(updates, { merge: true });

    const { processGamificationFromAnalytics } = await import('@/lib/server/gamification');
    await processGamificationFromAnalytics(userId, event, metadata, userName);
  } catch (error) {
    console.warn('[recordStudioEvent] skipped:', (error as Error).message);
  }
}
