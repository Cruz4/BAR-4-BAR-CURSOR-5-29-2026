'use client';

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { registerFirestoreDevRecovery } from '@/lib/firebase/client/firestore-dev-recovery';

const firebaseConfig = {
  apiKey: 'AIzaSyAJX5uEhA_8SFvXGEnboud6i3VETJcfWVg',
  authDomain: 'lyricai-studio-otgxn.firebaseapp.com',
  projectId: 'lyricai-studio-otgxn',
  storageBucket: 'lyricai-studio-otgxn.firebasestorage.app',
  messagingSenderId: '603155091344',
  appId: '1:603155091344:web:3662234090b291129aad15',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const globalForFirebase = globalThis as typeof globalThis & {
  __b4bFirestore?: Firestore;
  __b4bFirestoreRecoveryRegistered?: boolean;
};

/** Browser-only singleton — never call getFirestore during SSR (breaks dev settings). */
function getClientFirestore(): Firestore {
  if (typeof window === 'undefined') {
    throw new Error('Firestore client db is only available in the browser.');
  }

  if (globalForFirebase.__b4bFirestore) {
    return globalForFirebase.__b4bFirestore;
  }

  const isDev = process.env.NODE_ENV === 'development';

  try {
    globalForFirebase.__b4bFirestore = initializeFirestore(app, {
      localCache: isDev
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ...(isDev ? { experimentalForceLongPolling: true } : {}),
    });
  } catch {
    globalForFirebase.__b4bFirestore = getFirestore(app);
  }

  if (!globalForFirebase.__b4bFirestoreRecoveryRegistered) {
    globalForFirebase.__b4bFirestoreRecoveryRegistered = true;
    registerFirestoreDevRecovery(globalForFirebase.__b4bFirestore);
  }

  return globalForFirebase.__b4bFirestore;
}

/**
 * Real Firestore instance (not a Proxy — collection()/doc() reject proxies).
 * Initialized only in the browser; SSR imports must not call Firestore APIs.
 */
export const db: Firestore =
  typeof window !== 'undefined' ? getClientFirestore() : (null as unknown as Firestore);

export { app, auth, getClientFirestore };
