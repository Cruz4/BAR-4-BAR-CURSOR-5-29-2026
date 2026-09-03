import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';
import { dropArtistShareLabel } from '@/lib/drop-commerce';

export const metadata: Metadata = pageMetadata({
  title: 'Release Earnings',
  description:
    `Connect Stripe payouts, see release sales, and cash out your ${dropArtistShareLabel()} artist share in AKAsheet.`,
  path: '/earnings',
  index: false,
});

export default function EarningsLayout({ children }: { children: ReactNode }) {
  return children;
}
