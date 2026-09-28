'use client';

/**
 * Social-style media expand — tap a profile photo or Album Room cover
 * to view it large. Escape / backdrop / X to close.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ProfileMediaLightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Single image URL (custom photo or room/cover art). */
  src?: string | null;
  /** When set, shows a video player instead of `src`. */
  videoSrc?: string | null;
  /** Custom body when there is no single `src` (e.g. album collage). */
  children?: React.ReactNode;
  /** object-fit for `src` images. */
  fit?: 'contain' | 'cover';
  /** Raise above full-screen Scene feed and other z-50 chrome. */
  elevated?: boolean;
  className?: string;
  /** Width cap for custom children. Defaults to a compact card; pass `max-w-none` for a large review. */
  stageClassName?: string;
};

export function ProfileMediaLightbox({
  open,
  onOpenChange,
  title,
  src,
  videoSrc,
  children,
  fit = 'contain',
  elevated = false,
  className,
  stageClassName,
}: ProfileMediaLightboxProps) {
  const hasVideo = Boolean(videoSrc?.trim());
  const hasSrc = Boolean(src?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[92vh] w-[min(96vw,42rem)] max-w-none gap-0 overflow-hidden border-white/15 bg-black/95 p-0 shadow-[0_32px_100px_rgba(0,0,0,0.75)] sm:rounded-2xl',
          elevated && '!z-[200]',
          className
        )}
        overlayClassName={cn(
          'bg-black/85 backdrop-blur-[2px]',
          elevated && '!z-[200]'
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Expanded media. Press Escape or click close to dismiss.
        </DialogDescription>
        <div className="flex max-h-[92vh] flex-col">
          <div className="border-b border-white/10 px-4 py-3 pr-12">
            <p className="truncate font-headline text-sm font-bold uppercase tracking-tight text-white">
              {title}
            </p>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-3 sm:p-5">
            {hasVideo ? (
              <video
                src={videoSrc!}
                controls
                playsInline
                preload="metadata"
                className="max-h-[min(78vh,52rem)] w-full rounded-lg bg-black object-contain"
              />
            ) : hasSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src!}
                alt={title}
                className={cn(
                  'max-h-[min(78vh,52rem)] w-full rounded-lg',
                  fit === 'cover' ? 'object-cover' : 'object-contain'
                )}
              />
            ) : (
              <div className={cn('w-full', stageClassName ?? 'max-w-md')}>{children}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
