import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Library',
  description: 'Stream music releases you unlocked—search, crate, and play them in Bar 4 Bar.',
  robots: { index: false, follow: false },
};

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return children;
}
