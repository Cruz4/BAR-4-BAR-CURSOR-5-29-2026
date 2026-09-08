'use client';

import { useEffect, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { getClientStorage } from '@/lib/firebase/client/firebase';
import { isInlineDataImageUrl } from '@/lib/profile/post-media';

/**
 * Resolve wall post images from Storage when inline data URLs were stripped for egress.
 */
export function usePostImageUrl(
  imageUrl?: string | null,
  imageStoragePath?: string | null
): string | undefined {
  const direct =
    typeof imageUrl === 'string' && imageUrl.trim() && !isInlineDataImageUrl(imageUrl)
      ? imageUrl.trim()
      : undefined;
  const [resolved, setResolved] = useState<string | undefined>(direct);

  useEffect(() => {
    if (direct) {
      setResolved(direct);
      return;
    }
    const path = imageStoragePath?.trim();
    if (!path) {
      setResolved(isInlineDataImageUrl(imageUrl) ? imageUrl ?? undefined : undefined);
      return;
    }
    let cancelled = false;
    void getDownloadURL(ref(getClientStorage(), path))
      .then((url) => {
        if (!cancelled) setResolved(url);
      })
      .catch(() => {
        if (!cancelled) setResolved(isInlineDataImageUrl(imageUrl) ? imageUrl ?? undefined : undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [direct, imageStoragePath, imageUrl]);

  return resolved;
}
