import type { MetadataRoute } from 'next';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { absoluteUrl, PUBLIC_SITEMAP_PATHS } from '@/lib/seo';
import { getDb } from '@/lib/firebase/server';
import { isIndexablePublicProfileSlug } from '@/lib/profile/profile-slug';
import { publicScenePostHref } from '@/lib/activity/href';

export const revalidate = 3600;
// Public profile/post entries require Firebase Admin credentials. Generate the
// sitemap in the deployed runtime instead of freezing the credential-less build
// fallback into the production artifact.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000;
const MAX_PROFILE_DOCS = 5000;
const MAX_POST_DOCS = 5000;

function toLastModified(value: unknown, fallback: Date): Date {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      const parsed = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(parsed.getTime()) ? fallback : parsed;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function collectOrderedDocs(
  db: Firestore,
  collectionName: string,
  orderField: string,
  maxDocs: number
): Promise<QueryDocumentSnapshot[]> {
  const collection = db.collection(collectionName);
  try {
    const out: QueryDocumentSnapshot[] = [];
    let last: QueryDocumentSnapshot | undefined;
    while (out.length < maxDocs) {
      const take = Math.min(PAGE_SIZE, maxDocs - out.length);
      let query = collection.orderBy(orderField, 'desc').limit(take);
      if (last) query = query.startAfter(last);
      const snap = await query.get();
      if (snap.empty) break;
      out.push(...snap.docs);
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < take) break;
    }
    return out;
  } catch (error) {
    console.warn(
      `[sitemap] ${collectionName} orderBy ${orderField} unavailable; using unordered sample`,
      error
    );
    const snap = await collection.limit(Math.min(PAGE_SIZE, maxDocs)).get();
    return snap.docs;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_SITEMAP_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path || '/'),
    lastModified,
    changeFrequency,
    priority,
  }));

  try {
    const db = await getDb();
    const [profiles, posts] = await Promise.all([
      collectOrderedDocs(db, 'publicProfiles', 'updatedAt', MAX_PROFILE_DOCS),
      collectOrderedDocs(db, 'posts', 'createdAt', MAX_POST_DOCS),
    ]);
    const profileEntries: MetadataRoute.Sitemap = profiles
      .filter((doc) => isIndexablePublicProfileSlug(doc.id))
      .map((doc) => {
        const updated = toLastModified(doc.data().updatedAt, lastModified);
        return {
          url: absoluteUrl(`/${doc.id}`),
          lastModified: updated,
          changeFrequency: 'weekly' as const,
          priority: 0.65,
        };
      });
    const liveUserIds = new Set(
      profiles
        .map((doc) => doc.data().userId)
        .filter((userId): userId is string => typeof userId === 'string' && Boolean(userId))
    );
    const postEntries: MetadataRoute.Sitemap = posts
      .filter((doc) => {
        const ownerId = doc.data().ownerId;
        return /^[a-zA-Z0-9_-]{1,100}$/.test(doc.id)
          && typeof ownerId === 'string'
          && liveUserIds.has(ownerId);
      })
      .map((doc) => {
        const created = toLastModified(doc.data().createdAt, lastModified);
        return {
          url: absoluteUrl(publicScenePostHref(doc.id)),
          lastModified: created,
          changeFrequency: 'monthly' as const,
          priority: 0.55,
        };
      });
    return [...staticEntries, ...profileEntries, ...postEntries];
  } catch (error) {
    console.warn('[sitemap] public profiles unavailable; serving static routes only', error);
    return staticEntries;
  }
}
