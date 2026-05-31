/** Compute consecutive-day streak ending today from YYYY-MM-DD session dates. */
export function computeStreakFromSessionDates(sessionDates: string[], today = new Date()): number {
  if (!sessionDates.length) return 0;
  const set = new Set(sessionDates);
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
