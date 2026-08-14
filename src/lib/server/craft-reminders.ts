import 'server-only';

import { getDb } from '@/lib/firebase/server';
import { getDayKey } from '@/lib/gamification/challenges';
import {
  DEFAULT_ACTIVITY_PREFS,
  SYSTEM_ACTOR_ID,
  SYSTEM_ACTOR_NAME,
  type ActivityPrefs,
} from '@/lib/activity/types';
import { emitActivityEvent } from '@/lib/server/activity';

const USER_SCAN_LIMIT = 400;

function isTrackEditorPath(pathname: string): boolean {
  return /^\/albums\/[^/]+\/tracks\/[^/]+$/.test(pathname);
}

function loadPrefs(data: Record<string, unknown> | undefined): ActivityPrefs {
  if (!data) return { ...DEFAULT_ACTIVITY_PREFS };
  return {
    ...DEFAULT_ACTIVITY_PREFS,
    pushEnabled: data.pushEnabled === true,
    friendRequests: data.friendRequests !== false,
    friendAccepted: data.friendAccepted !== false,
    postLoves: data.postLoves !== false,
    postReplies: data.postReplies !== false,
    dnaImports: data.dnaImports !== false,
    lockCasts: data.lockCasts !== false,
    craftReminders: data.craftReminders !== false,
  };
}

function streakEndingOn(sessionDates: string[], endDayKey: string): number {
  const set = new Set(sessionDates);
  let streak = 0;
  const cursor = new Date(`${endDayKey}T12:00:00.000Z`);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export type CraftReminderRunResult = {
  scanned: number;
  verseOpen: number;
  streakRisk: number;
  skipped: number;
};

/**
 * Daily craft pings: unfinished sheet + streak that dies if they don't write today.
 * Writes Activity inbox for everyone with craftReminders on; push follows prefs.
 */
export async function runCraftReminders(now = new Date()): Promise<CraftReminderRunResult> {
  const db = await getDb();
  const today = getDayKey(now);
  const ydayDate = new Date(now);
  ydayDate.setUTCDate(ydayDate.getUTCDate() - 1);
  const yday = getDayKey(ydayDate);

  const usersSnap = await db.collection('users').limit(USER_SCAN_LIMIT).get();
  let verseOpen = 0;
  let streakRisk = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    try {
      const [prefsSnap, craftSnap, analyticsSnap] = await Promise.all([
        db.doc(`users/${userId}/activityMeta/prefs`).get(),
        db.doc(`users/${userId}/activityMeta/craft`).get(),
        db.doc(`users/${userId}/analytics/summary`).get(),
      ]);
      const prefs = loadPrefs(prefsSnap.data() as Record<string, unknown> | undefined);
      if (prefs.craftReminders === false) {
        skipped += 1;
        continue;
      }

      const analytics = (analyticsSnap.data() || {}) as { sessionDates?: string[] };
      const sessionDates = Array.isArray(analytics.sessionDates) ? analytics.sessionDates : [];
      const wroteToday = sessionDates.includes(today);

      const craft = (craftSnap.data() || {}) as {
        lastTrackPath?: string;
        lastTrackTitle?: string;
        lastVerseReminderDay?: string;
        lastStreakReminderDay?: string;
      };
      const lastPath =
        typeof craft.lastTrackPath === 'string' && isTrackEditorPath(craft.lastTrackPath)
          ? craft.lastTrackPath
          : null;
      const lastTitle =
        typeof craft.lastTrackTitle === 'string' && craft.lastTrackTitle.trim()
          ? craft.lastTrackTitle.trim().slice(0, 80)
          : undefined;

      const streakEndingYesterday = streakEndingOn(sessionDates, yday);
      const streakAtRisk = !wroteToday && streakEndingYesterday >= 1;

      const patches: Record<string, string> = {};

      if (lastPath && !wroteToday && craft.lastVerseReminderDay !== today) {
        await emitActivityEvent({
          type: 'verse_open',
          actorId: SYSTEM_ACTOR_ID,
          actorName: SYSTEM_ACTOR_NAME,
          recipientId: userId,
          preview: lastTitle || 'Pick up the sheet you left hanging.',
          href: lastPath,
        });
        patches.lastVerseReminderDay = today;
        verseOpen += 1;
      }

      if (streakAtRisk && craft.lastStreakReminderDay !== today) {
        const n = streakEndingYesterday;
        await emitActivityEvent({
          type: 'streak_risk',
          actorId: SYSTEM_ACTOR_ID,
          actorName: SYSTEM_ACTOR_NAME,
          recipientId: userId,
          preview:
            n === 1
              ? 'Your 1-day streak dies at midnight — write one bar today.'
              : `Your ${n}-day streak dies at midnight — write one bar today.`,
          href: lastPath || '/vault',
        });
        patches.lastStreakReminderDay = today;
        streakRisk += 1;
      }

      if (Object.keys(patches).length > 0) {
        await db.doc(`users/${userId}/activityMeta/craft`).set(
          { ...patches, updatedAt: now.toISOString() },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('[craft-reminders]', userId, err);
      skipped += 1;
    }
  }

  return {
    scanned: usersSnap.size,
    verseOpen,
    streakRisk,
    skipped,
  };
}
