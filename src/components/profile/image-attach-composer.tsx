'use client';

import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpandableMedia } from '@/components/profile/expandable-image';
import { MediaStudioDialog, type MediaStudioMode } from '@/components/profile/media-studio-dialog';
import { cn } from '@/lib/utils';
import {
  imageFileFromClipboard,
  processPostImageFile,
  revokePostImagePreview,
  type PendingPostImage,
} from '@/lib/profile/post-images';
import { revokeWallClipPreview, type PendingWallClip } from '@/lib/profile/wall-clips';

type ImageAttachComposerProps = {
  image: PendingPostImage | null;
  onImageChange: (image: PendingPostImage | null) => void;
  clip?: PendingWallClip | null;
  onClipChange?: (clip: PendingWallClip | null) => void;
  disabled?: boolean;
  compact?: boolean;
  maxBytes?: number;
  onError?: (message: string) => void;
};

export function ImageAttachComposer({
  image,
  onImageChange,
  clip = null,
  onClipChange,
  disabled = false,
  compact = false,
  maxBytes,
  onError,
}: ImageAttachComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState<MediaStudioMode>('camera');
  const allowVideo = Boolean(onClipChange);

  const clearMedia = () => {
    revokePostImagePreview(image);
    revokeWallClipPreview(clip);
    onImageChange(null);
    onClipChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const applyFile = async (file: File | Blob | null | undefined) => {
    if (!file || disabled || busy) return;
    setBusy(true);
    try {
      const next = await processPostImageFile(file, maxBytes ? { maxBytes } : undefined);
      revokePostImagePreview(image);
      revokeWallClipPreview(clip);
      onClipChange?.(null);
      onImageChange(next);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Could not attach that image.');
    } finally {
      setBusy(false);
    }
  };

  const openStudio = (nextMode: MediaStudioMode) => {
    if (disabled || busy) return;
    setStudioMode(nextMode);
    setStudioOpen(true);
  };

  const attached = clip || image;

  return (
    <div className={cn(compact ? 'flex items-center gap-2' : 'space-y-2')}>
      <input
        ref={inputRef}
        type="file"
        accept={allowVideo ? 'image/*,video/*' : 'image/*'}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void applyFile(file);
        }}
      />
      {attached ? (
        <div className={cn('flex min-w-0 items-center gap-2', compact && 'w-full')}>
          {clip ? (
            <ExpandableMedia
              kind="video"
              src={clip.previewUrl}
              alt="Clip preview"
              thumbClassName="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-white/15"
            />
          ) : image ? (
            <ExpandableMedia
              kind="image"
              src={image.previewUrl}
              alt="Photo preview"
              thumbClassName="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-white/15"
            />
          ) : null}
          <button
            type="button"
            onClick={clearMedia}
            disabled={disabled || busy}
            className={cn(
              'shrink-0 text-[var(--ph-muted,rgba(255,255,255,0.5))] hover:text-red-400',
              compact
                ? 'inline-flex h-8 w-8 items-center justify-center rounded-md'
                : 'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest'
            )}
            title={clip ? 'Remove clip' : 'Remove photo'}
            aria-label={clip ? 'Remove clip' : 'Remove photo'}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {compact ? null : `Remove ${clip ? 'clip' : 'photo'}`}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {allowVideo ? (
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
              onClick={() => openStudio('camera')}
              data-path="wall-camera"
              title="Open camera"
            >
              <Camera className="h-3.5 w-3.5" />
              {compact ? null : 'Camera'}
            </Button>
          ) : null}
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
            onClick={() => (allowVideo ? openStudio('library') : inputRef.current?.click())}
            data-path="wall-camera"
            title={allowVideo ? 'Photo or clip from files' : 'Attach a photo'}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {compact ? null : busy ? 'Adding…' : 'Photo'}
          </Button>
        </div>
      )}
      {allowVideo ? (
        <MediaStudioDialog
          open={studioOpen}
          mode={studioMode}
          onOpenChange={setStudioOpen}
          onExportImage={(next) => {
            revokePostImagePreview(image);
            revokeWallClipPreview(clip);
            onClipChange?.(null);
            onImageChange(next);
          }}
          onExportClip={(next) => {
            revokePostImagePreview(image);
            revokeWallClipPreview(clip);
            onImageChange(null);
            onClipChange?.(next);
          }}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

export async function attachPastedImage(
  e: React.ClipboardEvent,
  opts: {
    disabled?: boolean;
    image: PendingPostImage | null;
    onImageChange: (image: PendingPostImage | null) => void;
    clip?: PendingWallClip | null;
    onClipChange?: (clip: PendingWallClip | null) => void;
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
    revokeWallClipPreview(opts.clip);
    opts.onClipChange?.(null);
    opts.onImageChange(next);
    return true;
  } catch (err) {
    opts.onError?.(err instanceof Error ? err.message : 'Could not attach that image.');
    return false;
  }
}
