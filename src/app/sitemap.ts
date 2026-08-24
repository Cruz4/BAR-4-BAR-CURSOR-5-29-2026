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
    const profiles = await db.collection('publicProfiles').limit(1000).get();
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
    return [...staticEntries, ...profileEntries];
  } catch (error) {
    console.warn('[sitemap] public profiles unavailable; serving static routes only', error);
    return staticEntries;
  }
}
