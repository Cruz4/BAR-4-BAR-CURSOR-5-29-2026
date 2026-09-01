'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          overlayClassName="bg-black/92"
          className="max-h-[96vh] max-w-[min(96vw,920px)] border-none bg-transparent p-2 shadow-none sm:rounded-xl"
        >
          <DialogTitle className="sr-only">{alt || 'Media preview'}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex max-h-[88vh] items-center justify-center overflow-hidden">
            {kind === 'video' ? (
              <video
                src={src}
                controls
                autoPlay
                playsInline
                className="max-h-[88vh] w-auto max-w-full rounded-lg bg-black object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt}
                className="max-h-[88vh] w-auto max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Tap to expand in-place — no raw Storage URL navigation. */
export function ExpandableImage({ src, alt, className, thumbClassName }: ExpandableImageProps) {
  return <ExpandableMedia src={src} alt={alt} className={className} thumbClassName={thumbClassName} kind="image" />;
}
