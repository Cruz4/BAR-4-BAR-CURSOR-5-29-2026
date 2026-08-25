import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';

/** A public profile is Music Fan-only when it explicitly selects Music Fan and no creator identity. */
export async function isLiveMusicFanOnly(db: Firestore, userId: string): Promise<boolean> {
  if (!userId) return false;
  const snapshot = await db.collection('publicProfiles').where('userId', '==', userId).limit(1).get();
  const profile = snapshot.docs[0];
  if (!profile) return false;
  const identity = normalizeArtistHomeConfig(profile.data().artistHome).featured.soundIdentity;
  const kinds = identity?.kinds || [];
  return kinds.includes('music_fan') && kinds.every((kind) => kind === 'music_fan');
}
