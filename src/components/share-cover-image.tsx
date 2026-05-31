'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { isDataUrl } from '@/lib/cover-art';

type ShareCoverImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function ShareCoverImage({ src, alt, className, priority }: ShareCoverImageProps) {
  const url = src?.trim() || '/Logo.png';
  const data = isDataUrl(url);

  if (data) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className={cn('absolute inset-0 h-full w-full object-cover', className)}
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 1024px) 100vw, 480px"
      className={cn('object-cover', className)}
    />
  );
}
