
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAJX5uEhA_8SFvXGEnboud6i3VETJcfWVg",
  authDomain: "lyricai-studio-otgxn.firebaseapp.com",
  projectId: "lyricai-studio-otgxn",
  storageBucket: "lyricai-studio-otgxn.firebasestorage.app",
  messagingSenderId: "603155091344",
  appId: "1:603155091344:web:3662234090b291129aad15"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

let db: Firestore;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

export { app, auth, db };
