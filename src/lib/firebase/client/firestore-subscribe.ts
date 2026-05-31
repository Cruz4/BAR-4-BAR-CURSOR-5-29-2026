import {
  getDoc,
  getDocs,
  onSnapshot,
  type DocumentReference,
  type DocumentData,
  type Query,
} from 'firebase/firestore';

/**
 * Real-time listeners desync under Turbopack HMR (Firestore ca9/b815).
 * Poll in local dev instead of opening watch streams.
 */
function usePollingSubscriptions(): boolean {
  return typeof window !== 'undefined' && process.env.NODE_ENV === 'development';
}

export function subscribeDocument<T extends DocumentData>(
  ref: DocumentReference<T>,
  onNext: (data: T | undefined) => void,
  onError?: (err: unknown) => void,
  pollIntervalMs = 15000
): () => void {
  if (usePollingSubscriptions()) {
    let active = true;
    let inFlight = false;

    const pull = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const snap = await getDoc(ref);
        if (active) onNext(snap.exists() ? snap.data() : undefined);
      } catch (err) {
        onError?.(err);
      } finally {
        inFlight = false;
      }
    };

    void pull();
    const timer = window.setInterval(pull, pollIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }

  return onSnapshot(
    ref,
    (snap) => onNext(snap.exists() ? snap.data() : undefined),
    (err) => onError?.(err)
  );
}

export function subscribeQuery<T extends DocumentData>(
  q: Query<T>,
  onNext: (rows: Array<T & { id: string }>) => void,
  onError?: (err: unknown) => void,
  pollIntervalMs = 20000
): () => void {
  if (usePollingSubscriptions()) {
    let active = true;
    let inFlight = false;

    const pull = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const snap = await getDocs(q);
        if (active) {
          onNext(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
        }
      } catch (err) {
        onError?.(err);
      } finally {
        inFlight = false;
      }
    };

    void pull();
    const timer = window.setInterval(pull, pollIntervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }

  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
    (err) => onError?.(err)
  );
}
