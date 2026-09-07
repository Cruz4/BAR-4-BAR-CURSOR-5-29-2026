import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listTonightsFormArchive } from '@/lib/server/tonights-form';
import { SEO, absoluteUrl } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Tonight's Form archive",
  description: 'Browse frozen communal 16-bar forms from past nights on The Scene.',
  alternates: { canonical: absoluteUrl('/form') },
};

export default async function TonightsFormArchivePage() {
  const entries = await listTonightsFormArchive(24);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="h-8 font-bold uppercase tracking-wider">
          <Link href="/">
            <ChevronLeft className="mr-1 h-4 w-4" />
            The Scene
          </Link>
        </Button>
      </div>
      <p className="flex items-center gap-2 font-code text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-300">
        <Moon className="h-3.5 w-3.5" />
        Archive
      </p>
      <h1 className="mt-2 font-headline text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Tonight&apos;s Form
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Frozen at sunrise each night. One bar per seat, written together on {SEO.siteName}.
      </p>

      {entries.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No archived forms yet.</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {entries.map((entry) => (
            <li key={entry.nightKey}>
              <Link
                href={`/form/${entry.nightKey}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-indigo-400/40 hover:bg-indigo-500/5"
              >
                <span className="font-headline font-bold uppercase tracking-tight">{entry.label}</span>
                <span className="font-code text-[10px] text-muted-foreground">
                  {entry.filledCount} seats
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
