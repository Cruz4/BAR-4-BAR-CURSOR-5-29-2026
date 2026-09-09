'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function safeDecodePath(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw.trim());
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function PublicPostBackButton({
  label = 'Back',
  fallbackHref = '/discover',
  fromPath,
}: {
  label?: string;
  fallbackHref?: string;
  fromPath?: string | null;
}) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    const from = safeDecodePath(fromPath);
    if (from) {
      router.push(from);
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 gap-1.5 border-fuchsia-400/35 bg-fuchsia-500/10 font-bold uppercase text-fuchsia-200 hover:bg-fuchsia-500/20"
      onClick={goBack}
    >
      <ChevronLeft className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

export function usePublicPostBackNavigation(fromPath?: string | null, fallbackHref = '/discover') {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    const from = safeDecodePath(fromPath);
    if (from) {
      router.push(from);
      return;
    }
    router.push(fallbackHref);
  }, [fallbackHref, fromPath, router]);
}
