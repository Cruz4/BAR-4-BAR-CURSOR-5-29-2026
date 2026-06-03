import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client/firebase';
import { isBrowserOffline } from '@/lib/offline/network';

/** Ensure Firebase Auth token is attached before Firestore reads/writes. */
export async function waitForAuthUser(): Promise<User | null> {
  const current = auth.currentUser;
  if (current) {
    try {
      // Avoid force-refresh; it reconnects Firestore and spams TYPE=terminate in strict blockers
      await current.getIdToken(false);
    } catch (error) {
      if (!isBrowserOffline()) throw error;
    }
    return current;
  }

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        try {
          await user.getIdToken(false);
        } catch {
          if (!isBrowserOffline()) {
            resolve(null);
            return;
          }
        }
      }
      resolve(user);
    });
  });
}
