import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Library',
  description: 'Stream First Drops you unlocked — search, crate, and play them in Bar 4 Bar.',
};

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return children;
}
