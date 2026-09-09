import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicPostPageClient } from '@/components/profile/public-post-page-client';
import { absoluteUrl, SEO } from '@/lib/seo';
import { publicScenePostHref } from '@/lib/activity/href';
import { getPublicPostPageData, publicPostText } from '@/lib/server/public-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ from?: string }>;
};

function descriptionFor(ownerName: string, text: string): string {
  const snippet = text.slice(0, 190);
  return snippet
    ? `${snippet}${text.length > snippet.length ? '…' : ''} — ${ownerName} on AKAsheet`
    : `${ownerName} shared a public music post on AKAsheet.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const data = await getPublicPostPageData(postId);
  if (!data) {
    return {
      title: 'Post unavailable',
      description: 'This public AKAsheet post is not available.',
      robots: { index: false, follow: false },
    };
  }
  const text = publicPostText(data.post);
  const description = descriptionFor(data.ownerName, text);
  const canonical = absoluteUrl(publicScenePostHref(data.post.id));
  return {
    title: `${data.ownerName} on The Scene`,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      type: 'article',
      locale: 'en_US',
      url: canonical,
      siteName: SEO.siteName,
      title: `${data.ownerName} on AKAsheet`,
      description,
      publishedTime: data.post.createdAt || undefined,
      ...(data.post.imageUrl?.startsWith('https://') ? { images: [data.post.imageUrl] } : {}),
    },
    twitter: {
      card: data.post.imageUrl?.startsWith('https://') ? 'summary_large_image' : 'summary',
      title: `${data.ownerName} on AKAsheet`,
      description,
      ...(data.post.imageUrl?.startsWith('https://') ? { images: [data.post.imageUrl] } : {}),
    },
  };
}

export default async function PublicPostPage({ params, searchParams }: PageProps) {
  const { postId } = await params;
  const { from } = await searchParams;
  const data = await getPublicPostPageData(postId);
  if (!data) notFound();
  const text = publicPostText(data.post);
  const canonical = absoluteUrl(publicScenePostHref(data.post.id));
  const authorUrl = absoluteUrl(`/${data.ownerSlug}`);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: `${data.ownerName} on AKAsheet`,
    ...(text ? { articleBody: text } : {}),
    ...(data.post.createdAt ? { datePublished: data.post.createdAt } : {}),
    url: canonical,
    mainEntityOfPage: canonical,
    author: {
      '@type': 'Person',
      name: data.ownerName,
      url: authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: SEO.siteName,
      url: SEO.url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <PublicPostPageClient
        post={data.post}
        ownerName={data.ownerName}
        ownerSlug={data.ownerSlug}
        fromPath={from}
      />
    </>
  );
}
