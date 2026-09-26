'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ProfileMediaLightbox } from '@/components/profile/profile-media-lightbox';

type ExpandableImageProps = {
  src: string;
  alt: string;
  className?: string;
  thumbClassName?: string;
};

type ExpandableMediaProps = ExpandableImageProps & {
  kind?: 'image' | 'video';
};

/** Tap a photo or clip thumb to review it fullscreen before or after posting. */
export function ExpandableMedia({
  src,
  alt,
  className,
  thumbClassName,
  kind = 'image',
}: ExpandableMediaProps) {
  const [open, setOpen] = useState(false);
  const title = alt?.trim() || (kind === 'video' ? 'Video preview' : 'Photo preview');

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn('block max-w-full cursor-zoom-in text-left', className)}
        aria-label={`Review ${alt}`}
      >
        {kind === 'video' ? (
          <video
            src={src}
            muted
            playsInline
            preload="metadata"
            className={cn('object-cover', thumbClassName)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className={cn('object-contain', thumbClassName)} />
        )}
      </button>
      <ProfileMediaLightbox
        open={open}
        onOpenChange={setOpen}
        title={title}
        src={kind === 'image' ? src : undefined}
        videoSrc={kind === 'video' ? src : undefined}
        elevated
        className="w-[min(96vw,56rem)]"
      />
    </>
  );
}

/** Tap to expand in-place — no raw Storage URL navigation. */
export function ExpandableImage({ src, alt, className, thumbClassName }: ExpandableImageProps) {
  return <ExpandableMedia src={src} alt={alt} className={className} thumbClassName={thumbClassName} kind="image" />;
}
