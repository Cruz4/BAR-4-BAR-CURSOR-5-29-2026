import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { needsVanitySlugUpgrade } from '@/lib/profile/profile-slug';
import { isHouseReleaseDocument } from '@/lib/release-management';

export type ShareArtistCredit = {
  name: string;
  slug?: string;
  userId: string;
};

export async function resolveShareArtistCredit(
  db: Firestore,
  shareRaw: Record<string, unknown>
): Promise<ShareArtistCredit> {
  const ownerId = typeof shareRaw.ownerId === 'string' ? shareRaw.ownerId.trim() : '';
  const ownerName =
    typeof shareRaw.ownerName === 'string' && shareRaw.ownerName.trim()
      ? shareRaw.ownerName.trim()
      : 'Artist';
  const houseArtistId =
    isHouseReleaseDocument(shareRaw) &&
    typeof shareRaw.houseArtistId === 'string' &&
    shareRaw.houseArtistId.trim()
      ? shareRaw.houseArtistId.trim()
      : ownerId;
  const creditedUserId = houseArtistId || ownerId;
  if (!creditedUserId) return { name: ownerName, userId: ownerId || '' };

  const snap = await db
    .collection('publicProfiles')
    .where('userId', '==', creditedUserId)
    .limit(5)
    .get();
  const profile = snap.docs
    .filter((doc) => !needsVanitySlugUpgrade(doc.id, creditedUserId))
    .sort(
      (a, b) =>
        String(b.data().updatedAt || '').localeCompare(String(a.data().updatedAt || ''))
    )[0];
  const data = profile?.data() || {};
  const name =
    typeof data.displayName === 'string' && data.displayName.trim()
      ? data.displayName.trim()
      : ownerName;
  const slug = profile && !needsVanitySlugUpgrade(profile.id, creditedUserId) ? profile.id : undefined;
  return { name: name.slice(0, 80), ...(slug ? { slug } : {}), userId: creditedUserId };
}
