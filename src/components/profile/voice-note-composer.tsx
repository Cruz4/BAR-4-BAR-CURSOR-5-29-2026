'use client';

import React from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceNotePlayer } from '@/components/profile/voice-note-player';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { formatVoiceTime, VOICE_MAX_SECONDS, type RecordedVoiceClip } from '@/lib/profile/voice-notes';
import { cn } from '@/lib/utils';

type VoiceNoteComposerProps = {
  clip: RecordedVoiceClip | null;
  onClipChange: (clip: RecordedVoiceClip | null) => void;
  disabled?: boolean;
  compact?: boolean;
  railPreview?: boolean;
  hidePreview?: boolean;
};

export function VoiceNoteComposer({
  clip,
  onClipChange,
  disabled = false,
  compact = false,
  railPreview = false,
  hidePreview = false,
}: VoiceNoteComposerProps) {
  const recorder = useVoiceRecorder();
  const activeClip = clip || recorder.clip;
  const appliedFromRef = React.useRef<RecordedVoiceClip | null>(null);

  const { discard: discardRecorder } = recorder;
  const hadClipRef = React.useRef(false);

  React.useEffect(() => {
    if (!recorder.clip) return;
    const prev = appliedFromRef.current;
    if (prev?.objectUrl === recorder.clip.objectUrl) {
      if (prev.transcript !== recorder.clip.transcript) {
        appliedFromRef.current = recorder.clip;
        if (clip && clip.objectUrl === recorder.clip.objectUrl) {
          onClipChange({ ...clip, transcript: recorder.clip.transcript });
        } else {
          onClipChange(recorder.clip);
        }
      }
      return;
    }
    appliedFromRef.current = recorder.clip;
    onClipChange(recorder.clip);
  }, [clip, onClipChange, recorder.clip]);

  React.useEffect(() => {
    if (clip) {
      hadClipRef.current = true;
      return;
    }
    if (hadClipRef.current) {
      hadClipRef.current = false;
      appliedFromRef.current = null;
      discardRecorder();
    }
  }, [clip, discardRecorder]);

  const removeClip = () => {
    discardRecorder();
    appliedFromRef.current = null;
    onClipChange(null);
  };

  if (!recorder.supported) return null;

  if (activeClip && recorder.status !== 'recording') {
    if (railPreview) {
      return (
        <div className="relative flex h-14 w-14 shrink-0 flex-col self-center overflow-hidden rounded-lg border border-white/10 bg-black/30 p-1">
          <VoiceNotePlayer
            src={activeClip.objectUrl}
            contentType={activeClip.contentType}
            transcript={activeClip.transcript}
            durationSec={activeClip.durationSec}
            compact
            showTranscriptToggle={false}
            className="min-h-0 flex-1"
          />
          <button
            type="button"
            onClick={removeClip}
            disabled={disabled}
            title="Remove voice"
            aria-label="Remove voice"
            className="absolute right-0.5 top-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white/80 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      );
    }
    if (hidePreview) {
      return null;
    }
    return (
      <div className={cn('space-y-1.5', compact ? '' : 'pt-1')}>
        <VoiceNotePlayer
          src={activeClip.objectUrl}
          contentType={activeClip.contentType}
          transcript={activeClip.transcript}
          durationSec={activeClip.durationSec}
          compact={compact}
          showTranscriptToggle={recorder.status !== 'transcribing'}
        />
        {recorder.status === 'transcribing' ? (
          <p className="text-[11px] text-[var(--ph-muted,rgba(255,255,255,0.65))]">Writing transcript…</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={removeClip}
            disabled={disabled}
            title="Remove voice"
            aria-label="Remove voice"
            className={cn(
              'inline-flex items-center gap-1 text-[var(--ph-muted,rgba(255,255,255,0.5))] hover:text-red-400',
              compact
                ? 'h-8 w-8 justify-center rounded-md'
                : 'text-[10px] font-bold uppercase tracking-widest'
            )}
          >
            <Trash2 className="h-3 w-3" />
            {compact ? null : 'Remove voice'}
          </button>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, VOICE_MAX_SECONDS - recorder.elapsedMs / 1000);
  const live = recorder.liveTranscript;

  return (
    <div className={cn(compact ? 'flex items-center gap-2' : 'space-y-2')}>
      {recorder.status === 'recording' ? (
        <div className={cn('flex min-w-0 flex-1 items-center gap-2', !compact && 'rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2')}>
          <button
            type="button"
            onClick={() => recorder.stop()}
            disabled={disabled}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
            aria-label="Stop recording"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-400" />
          <span className="font-code text-[11px] tabular-nums text-red-200">
            {formatVoiceTime(recorder.elapsedMs / 1000)} · {formatVoiceTime(remaining)} left
          </span>
        </div>
      ) : (
        <Button
          type="button"
          size={compact ? 'icon' : 'sm'}
          variant="ghost"
          disabled={disabled}
          className={cn(
            compact
              ? 'h-8 w-8 shrink-0 text-[var(--ph-accent,#7dd3fc)]'
              : 'h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.7))] hover:text-[var(--ph-accent,#7dd3fc)]'
          )}
          onClick={() => void recorder.start()}
          title="Record a voice note"
        >
          <Mic className="h-3.5 w-3.5" />
          {compact ? null : 'Voice'}
        </Button>
      )}
      {recorder.status === 'recording' && live ? (
        <p className="min-w-0 flex-1 text-xs italic text-[var(--ph-muted,rgba(255,255,255,0.7))]">
          {live}
        </p>
      ) : null}
      {recorder.error ? (
        <p className="text-[11px] text-red-300">{recorder.error}</p>
      ) : null}
    </div>
  );
}
