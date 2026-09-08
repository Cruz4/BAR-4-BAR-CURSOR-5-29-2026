import Link from 'next/link';
import { absoluteUrl, SEO } from '@/lib/seo';
import { publicScenePostHref } from '@/lib/activity/href';
import type { ProfilePost } from '@/lib/profile/social-client';
import { publicPostText } from '@/lib/server/public-post';

type ProfilePostSeoProps = {
  ownerName: string;
  ownerSlug: string;
  posts: ProfilePost[];
};

function crawlablePosts(posts: ProfilePost[]): Array<{ post: ProfilePost; text: string }> {
  return posts
    .map((post) => {
      const text = publicPostText(post);
      return text ? { post, text } : null;
    })
    .filter((row): row is { post: ProfilePost; text: string } => Boolean(row));
}

export function ProfilePostStructuredData({ ownerName, ownerSlug, posts }: ProfilePostSeoProps) {
  const rows = crawlablePosts(posts);
  if (!rows.length) return null;

  const authorUrl = absoluteUrl(`/${ownerSlug}`);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${ownerName} public posts on AKAsheet`,
    itemListElement: rows.map(({ post, text }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'SocialMediaPosting',
        headline: text.slice(0, 120),
        articleBody: text,
        url: absoluteUrl(publicScenePostHref(post.id)),
        ...(post.createdAt ? { datePublished: post.createdAt } : {}),
        author: {
          '@type': 'Person',
          name: ownerName,
          url: authorUrl,
        },
        publisher: {
          '@type': 'Organization',
          name: SEO.siteName,
          url: SEO.url,
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
      }}
    />
  );
}

/** Server-rendered crawl index — plain text + permalinks for imprints and wall posts. */
export function ProfilePostCrawlIndex({ ownerName, ownerSlug, posts }: ProfilePostSeoProps) {
  const rows = crawlablePosts(posts);
  if (!rows.length) return null;

  return (
    <section
      aria-label={`${ownerName} public posts`}
      className="sr-only"
      data-profile-post-crawl
    >
      <h2>{ownerName} public posts</h2>
      <ul>
        {rows.map(({ post, text }) => (
          <li key={post.id}>
            <Link href={publicScenePostHref(post.id)}>
              {text.slice(0, 500)}
              {text.length > 500 ? '…' : ''}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
