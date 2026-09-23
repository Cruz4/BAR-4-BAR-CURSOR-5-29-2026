'use client';

import { usePathname } from 'next/navigation';

/** SSR-safe current path for public post `?from=` back links. */
export function useActivityFromPath(override?: string | null): string {
  const pathname = usePathname() || '/activity';
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  return pathname;
}
