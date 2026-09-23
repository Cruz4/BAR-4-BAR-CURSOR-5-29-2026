import { pageMetadata } from '@/lib/seo';
import { getProductSurfacesPublicStatus } from '@/lib/server/product-surfaces';
import { isSongGenerationSurfaceLive } from '@/lib/product-surface-modes';

export async function generateMetadata() {
  const surfaces = await getProductSurfacesPublicStatus();
  const songGenLive = isSongGenerationSurfaceLive(surfaces.songGeneration);
  return pageMetadata({
    title: 'Studio Memberships & Pricing',
    description: songGenLive
      ? 'Compare Visitor, Pro Writer ($7.77/mo), and Studio Max ($9.77/mo) — bar-by-bar lyrics plus optional local-first song rendering. Unlimited vault projects on Pro.'
      : 'Compare Visitor and Pro Writer ($7.77/mo) — bar-by-bar lyrics, vault, DNA, and releases. Unlimited vault projects on Pro.',
    path: '/pricing',
    openGraphTitle: 'Pricing — AKAsheet: Put Your World Within Reach',
  });
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
