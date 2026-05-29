import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client/firebase';

/** Ensure Firebase Auth token is attached before Firestore reads/writes. */
export async function waitForAuthUser(): Promise<User | null> {
  const current = auth.currentUser;
  if (current) {
    await current.getIdToken();
    return current;
  }

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        try {
          await user.getIdToken();
        } catch {
          resolve(null);
          return;
        }
      }
      resolve(user);
    });
  });
}
