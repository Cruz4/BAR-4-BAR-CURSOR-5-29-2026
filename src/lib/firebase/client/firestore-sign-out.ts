'use client';

import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { getClientFirestore } from '@/lib/firebase/client/firebase';

/**
 * Stop Firestore watch streams before Firebase Auth sign-out.
 * Prevents ca9/b815 internal assertion loops when listeners retry after auth clears.
 */
export async function prepareFirestoreForSignOut(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await disableNetwork(getClientFirestore());
  } catch {
    /* already disabled or tearing down */
  }
}

export async function restoreFirestoreNetwork(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await enableNetwork(getClientFirestore());
  } catch {
    /* ignore */
  }
}
