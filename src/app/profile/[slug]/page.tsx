import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { PublicProfilePageClient } from '@/components/profile/public-profile-page-client';
import {
  ProfilePostCrawlIndex,
  ProfilePostStructuredData,
} from '@/components/profile/profile-post-seo';
import { getPublicProfile } from '@/lib/server/gamification';
import { rankFromXp } from '@/lib/gamification/ranks';
import { absoluteUrl, SEO } from '@/lib/seo';
import { legacyProfileAppRedirect } from '@/lib/profile/profile-slug';
import { publicIdentityLabel, type PublicIdentityKind } from '@/lib/profile/sound-identity';
import { normalizeArtistHomeConfig } from '@/lib/profile/modules';
import {
  getPublicProfileImprintPosts,
  getPublicProfileWallPosts,
  postsSeoSnippet,
  type PublicWallPostsPage,
} from '@/lib/server/public-post';
import type { ProfilePost } from '@/lib/profile/social-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };
const getCachedPublicProfile = cache(getPublicProfile);

type ProfileSeoPosts = {
  initialWallPosts: PublicWallPostsPage | null;
  initialImprintPosts: ProfilePost[];
  crawlPosts: ProfilePost[];
};

const getCachedProfileSeoPosts = cache(async (userId: string, artistHome: unknown): Promise<ProfileSeoPosts> => {
  const config = normalizeArtistHomeConfig(artistHome);
  const imprintIds = config.featured.imprintShelfPostIds || [];
  const [initialWallPosts, initialImprintPosts] = await Promise.all([
    getPublicProfileWallPosts(userId, 0),
    imprintIds.length ? getPublicProfileImprintPosts(userId, imprintIds) : Promise.resolve([]),
  ]);
  const crawlById = new Map<string, ProfilePost>();
  for (const post of initialWallPosts?.posts || []) crawlById.set(post.id, post);
  for (const post of initialImprintPosts) crawlById.set(post.id, post);
  return {
    initialWallPosts,
    initialImprintPosts,
    crawlPosts: [...crawlById.values()],
  };
});

function profileShareCopy(
  data: Record<string, unknown>,
  slug: string,
  postSnippet = ''
) {
  const displayName =
    typeof data.displayName === 'string' && data.displayName.trim()
      ? data.displayName.trim()
      : slug;
  const xp = Number(data.xp || 0);
  const rank = rankFromXp(xp, true);
  const rankLabel =
    typeof data.rankLabel === 'string' && data.rankLabel.trim()
      ? data.rankLabel.trim()
      : rank.label;
  const title = `${displayName} · ${rankLabel}`;
  const artistHome = data.artistHome && typeof data.artistHome === 'object'
    ? data.artistHome as Record<string, unknown>
    : {};
  const featured = artistHome.featured && typeof artistHome.featured === 'object'
    ? artistHome.featured as Record<string, unknown>
    : {};
  const soundIdentity = featured.soundIdentity && typeof featured.soundIdentity === 'object'
    ? featured.soundIdentity as Record<string, unknown>
    : {};
  const kinds = Array.isArray(soundIdentity.kinds)
    ? soundIdentity.kinds
        .filter((kind): kind is PublicIdentityKind => typeof kind === 'string')
        .slice(0, 3)
        .map(publicIdentityLabel)
    : [];
  const genres = Array.isArray(soundIdentity.genres)
    ? soundIdentity.genres.filter((genre): genre is string => typeof genre === 'string').slice(0, 3)
    : [];
  const featuredTrack = featured.featuredTrack && typeof featured.featuredTrack === 'object'
    ? featured.featuredTrack as Record<string, unknown>
    : {};
  const featuredTitle = typeof featuredTrack.title === 'string' ? featuredTrack.title.trim() : '';
  const highlights = [
    kinds.length ? kinds.join(', ') : 'public music profile',
    genres.length ? genres.join(', ') : '',
    featuredTitle ? `featuring ${featuredTitle}` : '',
    rankLabel,
  ].filter(Boolean);
  const description = `${displayName} on AKAsheet—${highlights.join(' · ')}. Discover their public music home, releases, and creative work.${
    postSnippet ? ` Recent posts: ${postSnippet}` : ''
  }`;
  return { displayName, rankLabel, title, description };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.trim() || '';
  const appRedirect = legacyProfileAppRedirect(slug);
  if (appRedirect) {
    return {
      title: appRedirect === '/insights' ? 'Listener Insights' : 'Support Circle',
      robots: { index: false, follow: false },
    };
  }
  if (!slug) {
    return {
      title: 'Public Music Home',
      description: SEO.description,
    };
  }

  try {
    const profile = await getCachedPublicProfile(slug);
    if (!profile) {
      return {
        title: 'Public Music Home',
        description: 'This AKAsheet public music home is not available.',
        robots: { index: false, follow: false },
      };
    }

    const data = profile as Record<string, unknown>;
    const liveSlug =
      typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : slug;
    const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
    const seoPosts = userId
      ? await getCachedProfileSeoPosts(userId, data.artistHome)
      : { initialWallPosts: null, initialImprintPosts: [], crawlPosts: [] };
    const postSnippet = postsSeoSnippet(seoPosts.crawlPosts);
    const { displayName, title, description } = profileShareCopy(data, liveSlug, postSnippet);
    const canonical = absoluteUrl(`/${liveSlug}`);
    const ogTitle = `${displayName} on AKAsheet`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: 'profile',
        locale: 'en_US',
        url: canonical,
        siteName: SEO.siteName,
        title: ogTitle,
        description,
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description,
      },
    };
  } catch (err) {
    console.error('[profile/slug metadata]', err);
    return {
      title: 'Public Music Home',
      description: SEO.description,
    };
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const appRedirect = legacyProfileAppRedirect(slug);
  if (appRedirect) redirect(appRedirect);
  const profile = await getCachedPublicProfile(slug);
  if (!profile) {
    return <PublicProfilePageClient slug={slug} initialData={null} />;
  }

  const data = profile as Record<string, unknown>;
  const liveSlug =
    typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : slug;
  const displayName =
    typeof data.displayName === 'string' && data.displayName.trim()
      ? data.displayName.trim()
      : liveSlug;
  const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
  const seoPosts = userId
    ? await getCachedProfileSeoPosts(userId, data.artistHome)
    : { initialWallPosts: null, initialImprintPosts: [], crawlPosts: [] };

  return (
    <>
      {seoPosts.crawlPosts.length > 0 ? (
        <>
          <ProfilePostStructuredData
            ownerName={displayName}
            ownerSlug={liveSlug}
            posts={seoPosts.crawlPosts}
          />
          <ProfilePostCrawlIndex
            ownerName={displayName}
            ownerSlug={liveSlug}
            posts={seoPosts.crawlPosts}
          />
        </>
      ) : null}
      <PublicProfilePageClient
        slug={slug}
        initialData={profile}
        initialWallPosts={seoPosts.initialWallPosts}
        initialImprintPosts={seoPosts.initialImprintPosts}
      />
    </>
  );
}
