import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TonightsFormSheet } from '@/components/scene/tonights-form-sheet';
import { formatTonightsFormLabel } from '@/lib/tonights-form';
import { getTonightsFormByNightKey } from '@/lib/server/tonights-form';
import { absoluteUrl, SEO } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ nightKey: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nightKey } = await params;
  const label = formatTonightsFormLabel(nightKey);
  const canonical = absoluteUrl(`/form/${nightKey}`);
  return {
    title: label,
    description: `Read the communal 16-bar ${label} on AKAsheet — one bar per writer that night.`,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      siteName: SEO.siteName,
      title: `${label} | ${SEO.siteName}`,
      description: `Frozen communal lyric form from one night on The Scene.`,
    },
  };
}

export default async function TonightsFormNightPage({ params }: PageProps) {
  const { nightKey } = await params;
  const key = (nightKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) notFound();

  const form = await getTonightsFormByNightKey(key);
  if (!form) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 font-bold uppercase tracking-wider">
          <Link href="/">
            <ChevronLeft className="mr-1 h-4 w-4" />
            The Scene
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8 font-bold uppercase tracking-wider">
          <Link href="/form">
            <Moon className="mr-1 h-4 w-4" />
            Past forms
          </Link>
        </Button>
      </div>
      <TonightsFormSheet form={form} />
    </main>
  );
}
