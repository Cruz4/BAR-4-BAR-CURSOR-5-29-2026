'use client';

import React, { useEffect, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpandableImage } from '@/components/profile/expandable-image';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import type { PendingPostImage } from '@/lib/profile/post-images';
import type { PendingWallClip } from '@/lib/profile/wall-clips';
import type { RecordedVoiceClip } from '@/lib/profile/voice-notes';

export function composerHasAttachedMedia(
  image: PendingPostImage | null | undefined,
  clip: PendingWallClip | null | undefined,
  voice: RecordedVoiceClip | null | undefined
): boolean {
  return Boolean(clip || image || voice);
}

type ComposerAttachedMediaPreviewProps = {
  variant?: 'post' | 'comment';
  image?: PendingPostImage | null;
  clip?: PendingWallClip | null;
  voice?: RecordedVoiceClip | null;
  /** Wall post caption — sizes goal/standing share cards like the live post. */
  captionText?: string;
  disabled?: boolean;
  onRemoveImage?: () => void;
  onRemoveClip?: () => void;
  onRemoveVoice?: () => void;
  className?: string;
};

function isStudioGoalShare(text?: string): boolean {
  const t = (text || '').trim();
  if (!t) return false;
  return /🎯|🎤 Studio Standing|🏆 Unlocked/i.test(t);
}

export function ComposerAttachedMediaPreview({
  variant = 'post',
  image = null,
  clip = null,
  voice = null,
  captionText = '',
  disabled = false,
  onRemoveImage,
  onRemoveClip,
  onRemoveVoice,
  className,
}: ComposerAttachedMediaPreviewProps) {
  const posterFromClip = useMemo(() => {
    if (!clip?.posterBlob) return null;
    return URL.createObjectURL(clip.posterBlob);
  }, [clip?.posterBlob]);

  useEffect(() => {
    return () => {
      if (posterFromClip) URL.revokeObjectURL(posterFromClip);
    };
  }, [posterFromClip]);

  if (!composerHasAttachedMedia(image, clip, voice)) return null;

  const poster = image?.previewUrl || posterFromClip || undefined;
  const goalShare = variant === 'post' && isStudioGoalShare(captionText);

  const imageClassName =
    variant === 'comment'
      ? 'max-h-56 w-auto max-w-full rounded-lg'
      : goalShare
        ? 'block h-auto w-full max-w-[30rem] max-h-[24rem] rounded-xl object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)]'
        : 'block h-auto w-auto max-w-full max-h-[min(68dvh,46rem)] rounded-xl object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)]';

  const videoClassName =
    variant === 'comment' ? 'max-h-56' : goalShare ? 'max-h-[24rem]' : undefined;

  return (
    <div className={cn('space-y-3', className)} data-composer-media-preview>
      {voice ? (
        <div className="relative">
          <VoiceNotePlayer
            src={voice.objectUrl}
            contentType={voice.contentType}
            transcript={voice.transcript}
            durationSec={voice.durationSec}
            compact={variant === 'comment'}
          />
          {onRemoveVoice ? (
            <RemoveMediaButton disabled={disabled} onClick={onRemoveVoice} label="Remove voice note" />
          ) : null}
        </div>
      ) : null}
      {clip ? (
        <div className="relative flex justify-center overflow-visible">
          <video
            src={clip.previewUrl}
            poster={poster}
            controls
            playsInline
            preload="metadata"
            className={cn(
              'block w-full rounded-xl bg-black object-contain shadow-[0_8px_28px_rgba(0,0,0,0.45)]',
              variant === 'comment' ? 'max-h-56' : 'max-h-[min(68dvh,46rem)]',
              videoClassName
            )}
          />
          {onRemoveClip ? (
            <RemoveMediaButton disabled={disabled} onClick={onRemoveClip} label="Remove clip" />
          ) : null}
        </div>
      ) : image ? (
        <div className="relative flex justify-center overflow-visible">
          <ExpandableImage src={image.previewUrl} alt="Attached photo" thumbClassName={imageClassName} />
          {onRemoveImage ? (
            <RemoveMediaButton disabled={disabled} onClick={onRemoveImage} label="Remove photo" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RemoveMediaButton({
  disabled,
  onClick,
  label,
}: {
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/75 text-white/85 shadow-lg hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
