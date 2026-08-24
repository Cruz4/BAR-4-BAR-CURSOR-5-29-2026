import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PublicProfilePageClient } from '@/components/profile/public-profile-page-client';
import { getPublicProfile } from '@/lib/server/gamification';
import { rankFromXp } from '@/lib/gamification/ranks';
import { absoluteUrl, SEO } from '@/lib/seo';
import { legacyProfileAppRedirect } from '@/lib/profile/profile-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

function profileShareCopy(data: Record<string, unknown>, slug: string) {
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
  const description = `${displayName}'s Artist Home on Bar 4 Bar — ${rankLabel}, studio trophies, and live DNA Drops. Open their page on bar4bar.ink.`;
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
      title: 'Artist Home',
      description: SEO.description,
    };
  }

  try {
    const profile = await getPublicProfile(slug);
    if (!profile) {
      return {
        title: 'Artist Home',
        description: 'This Bar 4 Bar Artist Home is not available.',
        robots: { index: false, follow: false },
      };
    }

    const data = profile as Record<string, unknown>;
    const liveSlug =
      typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : slug;
    const { displayName, title, description } = profileShareCopy(data, liveSlug);
    const canonical = absoluteUrl(`/${liveSlug}`);
    const ogTitle = `${displayName} on Bar 4 Bar`;

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
      title: 'Artist Home',
      description: SEO.description,
    };
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const appRedirect = legacyProfileAppRedirect(slug);
  if (appRedirect) redirect(appRedirect);
  return <PublicProfilePageClient slug={slug} />;
}
