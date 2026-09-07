import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Compass, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/profile/post-card';
import { absoluteUrl, SEO } from '@/lib/seo';
import { publicScenePostHref } from '@/lib/activity/href';
import { getPublicPostPageData, publicPostText } from '@/lib/server/public-post';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ postId: string }> };

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
export default async function PublicPostPage({ params }: PageProps) {
  const { postId } = await params;
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
    <main className="min-h-screen bg-background px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
          <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
            <Link href={`/${data.ownerSlug}`}>
              <ChevronLeft className="h-3.5 w-3.5" /> {data.ownerName}
            </Link>
          </Button>
          <Button size="sm" variant="ghost" className="h-9 gap-1.5 font-bold uppercase text-sky-300" asChild>
            <Link href="/discover">
              <Compass className="h-3.5 w-3.5" /> Discover
            </Link>
          </Button>
        </header>
        <div>
          <p className="mb-2 flex items-center gap-1.5 font-code text-[10px] font-bold uppercase tracking-[0.24em] text-fuchsia-300">
            <Radio className="h-3.5 w-3.5" /> Public Scene post
          </p>
          <PostCard post={data.post} showAuthor />
        </div>
      </div>
    </main>
  );
}
