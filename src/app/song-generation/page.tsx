import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getProductSurfacesPublicStatus } from '@/lib/server/product-surfaces';
import { isSongGenerationSurfaceLive } from '@/lib/product-surface-modes';

export async function generateMetadata(): Promise<Metadata> {
  const surfaces = await getProductSurfacesPublicStatus();
  if (!isSongGenerationSurfaceLive(surfaces.songGeneration)) {
    return { title: 'Not Found — AKAsheet', robots: { index: false, follow: false } };
  }
  return {
    title: 'Song Generation — AKAsheet',
    description:
      'Local-first sheet-to-song and Vault-to-instrumental rendering on Studio Max with private library, edits, and releases.',
  };
}

export default async function SongGenerationLandingPage() {
  const surfaces = await getProductSurfacesPublicStatus();
  if (!isSongGenerationSurfaceLive(surfaces.songGeneration)) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 space-y-8">
      <h1 className="font-headline text-4xl font-bold uppercase">Song Generation</h1>
      <p className="text-muted-foreground leading-relaxed">
        Studio Max adds optional ACE-Step rendering: approve lyrics in the Generation Workstation, then
        Generate Song on your paired PC — or start an instrumental from The Vault. Cloud passes cover
        fallback GPU; four-minute songs are the default.
      </p>
      <ul className="list-disc space-y-2 pl-6 text-sm">
        <li>Sheet → Full Studio Draft → Generate Song → private Approved Studio library</li>
        <li>The Vault → Generate Instrumental → Render Studio → share or press live</li>
        <li>Artist Signature LoRA for consistent style bias (not identity cloning)</li>
      </ul>
      <Button asChild>
        <Link href="/try">Compare Studio Max pricing</Link>
      </Button>
    </main>
  );
}
