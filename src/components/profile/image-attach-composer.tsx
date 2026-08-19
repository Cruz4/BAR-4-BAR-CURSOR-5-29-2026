'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  imageFileFromClipboard,
  processPostImageFile,
  revokePostImagePreview,
  type PendingPostImage,
} from '@/lib/profile/post-images';

type ImageAttachComposerProps = {
  image: PendingPostImage | null;
  onImageChange: (image: PendingPostImage | null) => void;
  disabled?: boolean;
  compact?: boolean;
  maxBytes?: number;
  onError?: (message: string) => void;
};

export function ImageAttachComposer({
  image,
  onImageChange,
  disabled = false,
  compact = false,
  maxBytes,
  onError,
}: ImageAttachComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const applyFile = async (file: File | Blob | null | undefined) => {
    if (!file || disabled || busy) return;
    setBusy(true);
    try {
      const next = await processPostImageFile(file, maxBytes ? { maxBytes } : undefined);
      revokePostImagePreview(image);
      onImageChange(next);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not attach that image.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    revokePostImagePreview(image);
    onImageChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn(compact ? 'flex items-center gap-2' : 'space-y-2')}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void applyFile(file);
        }}
      />
      {image ? (
        <div className={cn('flex items-start gap-2', compact ? 'min-w-0' : '')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.previewUrl}
            alt="Attached"
            className={cn(
              'rounded-md object-cover ring-1 ring-white/15',
              compact ? 'h-12 w-12' : 'h-16 w-16'
            )}
          />
          <button
            type="button"
            onClick={remove}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.5))] hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" /> Remove photo
          </button>
        </div>
      ) : (
        <Button
          type="button"
          size={compact ? 'icon' : 'sm'}
          variant="ghost"
          disabled={disabled || busy}
          className={cn(
            compact
              ? 'h-8 w-8 shrink-0 text-[var(--ph-accent,#7dd3fc)]'
              : 'h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.7))] hover:text-[var(--ph-accent,#7dd3fc)]'
          )}
          onClick={() => inputRef.current?.click()}
          title="Attach a photo"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {compact ? null : busy ? 'Adding…' : 'Photo'}
        </Button>
      )}
    </div>
  );
}

export async function attachPastedImage(
  e: React.ClipboardEvent,
  opts: {
    disabled?: boolean;
    image: PendingPostImage | null;
    onImageChange: (image: PendingPostImage | null) => void;
    maxBytes?: number;
    onError?: (message: string) => void;
  }
): Promise<boolean> {
  const file = imageFileFromClipboard(e.nativeEvent);
  if (!file || opts.disabled) return false;
  e.preventDefault();
  try {
    const next = await processPostImageFile(file, opts.maxBytes ? { maxBytes: opts.maxBytes } : undefined);
    revokePostImagePreview(opts.image);
    opts.onImageChange(next);
    return true;
  } catch (err) {
    opts.onError?.(err instanceof Error ? err.message : 'Could not attach that image.');
    return false;
  }
}
