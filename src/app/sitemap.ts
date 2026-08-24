import type { MetadataRoute } from 'next';
import { absoluteUrl, PUBLIC_SITEMAP_PATHS } from '@/lib/seo';
import { getDb } from '@/lib/firebase/server';
import { isValidProfileSlug } from '@/lib/profile/profile-slug';

export const revalidate = 3600;

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
      db.collection('publicProfiles').limit(1000).get(),
      db.collection('posts').limit(1000).get(),
    ]);
    const profileEntries: MetadataRoute.Sitemap = profiles.docs
      .filter((doc) => isValidProfileSlug(doc.id))
      .map((doc) => {
        const updatedAt = doc.data().updatedAt;
        const updated = typeof updatedAt === 'string' ? new Date(updatedAt) : lastModified;
        return {
          url: absoluteUrl(`/${doc.id}`),
          lastModified: Number.isNaN(updated.getTime()) ? lastModified : updated,
          changeFrequency: 'weekly' as const,
          priority: 0.65,
        };
      });
    const liveUserIds = new Set(
      profiles.docs
        .map((doc) => doc.data().userId)
        .filter((userId): userId is string => typeof userId === 'string' && Boolean(userId))
    );
    const postEntries: MetadataRoute.Sitemap = posts.docs
      .filter((doc) => {
        const ownerId = doc.data().ownerId;
        return /^[a-zA-Z0-9_-]{1,100}$/.test(doc.id)
          && typeof ownerId === 'string'
          && liveUserIds.has(ownerId);
      })
      .map((doc) => {
        const createdAt = doc.data().createdAt;
        const created = typeof createdAt === 'string' ? new Date(createdAt) : lastModified;
        return {
          url: absoluteUrl(`/p/${doc.id}`),
          lastModified: Number.isNaN(created.getTime()) ? lastModified : created,
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
