import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Listener Insights',
  description: 'Qualified First Drop listeners, supporters, conversions, and discovery sources.',
};

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return children;
}
