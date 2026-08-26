import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Listener Insights',
  description: 'Qualified release listeners, supporters, conversions, and discovery sources.',
  robots: { index: false, follow: false },
};

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return children;
}
