import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Studio Memberships & Pricing',
  description:
    'Compare Visitor (free Ink) vs Studio Pro ($7.77/mo or $4.44/mo yearly). AI bar-by-bar lyric workstation—not full-song generation. Unlimited vault projects on Pro.',
  path: '/pricing',
  openGraphTitle: 'Pricing — Bar 4 Bar Studio',
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
