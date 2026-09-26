import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';

export async function artistHomeLiveForUser(db: Firestore, userId: string): Promise<boolean> {
  const snap = await db.doc(`users/${userId}/gamification/summary`).get();
  const data = snap.data() || {};
  return (
    data.publicProfile === true &&
    typeof data.profileSlug === 'string' &&
    data.profileSlug.trim().length > 0
  );
}

export async function assertArtistHomeLiveForMessaging(db: Firestore, userId: string): Promise<void> {
  if (!(await artistHomeLiveForUser(db, userId))) {
    throw new Error('Make your Artist Home public before sending messages.');
  }
}
