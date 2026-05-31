import type { Firestore } from 'firebase/firestore';

const RELOAD_KEY = 'b4b-fs-assertion-recovery';

export function isFirestoreInternalAssertion(reason: unknown): boolean {
  const text =
    reason instanceof Error
      ? `${reason.message}\n${reason.stack ?? ''}`
      : String(reason ?? '');
  return (
    text.includes('INTERNAL ASSERTION FAILED') ||
    text.includes('Unexpected state') ||
    text.includes('ID: ca9') ||
    text.includes('ID: b815')
  );
}

async function purgeFirestoreIndexedDb(): Promise<void> {
  if (typeof indexedDB.databases !== 'function') return;
  const dbs = await indexedDB.databases();
  await Promise.all(
    dbs
      .filter((entry) => entry.name?.includes('firestore'))
      .map(
        (entry) =>
          new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(entry.name!);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => resolve();
          })
      )
  );
}

/** Auto-recover if Firestore watch stream desyncs during local dev (ca9 / b815). */
export function registerFirestoreDevRecovery(_db: Firestore) {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;

  window.setTimeout(() => {
    sessionStorage.removeItem(RELOAD_KEY);
  }, 30000);

  const maybeRecover = (reason: unknown, preventDefault?: () => void) => {
    if (!isFirestoreInternalAssertion(reason)) return;

    preventDefault?.();

    const attempts = sessionStorage.getItem(RELOAD_KEY);
    if (attempts === '2') {
      console.error(
        '[Bar 4 Bar] Firestore still failing after recovery. Clear site data for this origin, then hard-refresh.'
      );
      return;
    }

    if (attempts === '1') {
      sessionStorage.setItem(RELOAD_KEY, '2');
      console.warn('[Bar 4 Bar] Purging stale Firestore cache and reloading…');
      void purgeFirestoreIndexedDb().finally(() => {
        window.location.reload();
      });
      return;
    }

    sessionStorage.setItem(RELOAD_KEY, '1');
    console.warn('[Bar 4 Bar] Firestore dev desync detected — reloading once to recover.');
    window.location.reload();
  };

  window.addEventListener('unhandledrejection', (event) => {
    maybeRecover(event.reason, () => event.preventDefault());
  });

  window.addEventListener('error', (event) => {
    maybeRecover(event.error ?? event.message);
  });
}
