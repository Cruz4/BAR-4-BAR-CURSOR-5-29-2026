import type { Metadata } from 'next';
import { SEO } from '@/lib/studio-tiers';

export const metadata: Metadata = {
  title: 'Studio Memberships & Pricing',
  description: `Compare Visitor (free, 300 signup + 200/mo Ink) vs Studio Pro ($7.77/mo or $4.44/mo yearly). Lyric workstation—not full-song AI. Unlimited projects on Pro.`,
  openGraph: {
    title: `Pricing | ${SEO.siteName}`,
    description: SEO.description,
    url: `${SEO.url}/pricing`,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
