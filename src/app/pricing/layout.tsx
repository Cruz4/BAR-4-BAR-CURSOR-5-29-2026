import type { Metadata } from 'next';
import { SEO } from '@/lib/studio-tiers';

export const metadata: Metadata = {
  title: 'Studio Memberships & Pricing',
  description: `Compare Visitor (free, 300 Ink + 150/mo) vs Studio Pro ($7.77/mo or $4.44/mo yearly). Unlimited projects, custom vault saves, and yearly roadmap input.`,
  openGraph: {
    title: `Pricing | ${SEO.siteName}`,
    description: SEO.description,
    url: `${SEO.url}/pricing`,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
