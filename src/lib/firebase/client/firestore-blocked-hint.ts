const HINT_STORAGE_KEY = 'b4b-firestore-block-hint-shown';

/**
 * When ad blockers block Firestore channel teardown (TYPE=terminate), the SDK still works
 * but Chrome logs net::ERR_BLOCKED_BY_CLIENT. Explain once per session.
 */
export function registerFirestoreBlockedClientHint(): void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return;
  }
  if (sessionStorage.getItem(HINT_STORAGE_KEY)) return;

  let debounce: ReturnType<typeof setTimeout> | undefined;

  const showHint = () => {
    if (sessionStorage.getItem(HINT_STORAGE_KEY)) return;
    sessionStorage.setItem(HINT_STORAGE_KEY, '1');
    console.info(
      '[AKAsheet] Firestore cleanup requests were blocked (ERR_BLOCKED_BY_CLIENT). This is usually an ad blocker or Brave Shields — allow firestore.googleapis.com for this site. Your vault can still load; ignore the red "terminate" lines if everything works.'
    );
  };

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntriesByType('resource')) {
        const timing = entry as PerformanceResourceTiming;
        if (
          !timing.name.includes('firestore.googleapis.com') ||
          !timing.name.includes('TYPE=terminate')
        ) {
          continue;
        }
        if (timing.transferSize === 0 && timing.duration < 2000) {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(showHint, 400);
        }
      }
    });
    observer.observe({ type: 'resource', buffered: true });
  } catch {
    // PerformanceObserver not fully supported — skip
  }
}
