'use client';

import React, { useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileVoiceMemoBadge } from '@/components/profile/profile-voice-memo-badge';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { useToast } from '@/hooks/use-toast';
import {
  PROFILE_VOICE_MEMO_MAX_BYTES,
  PROFILE_VOICE_MEMO_MAX_SECONDS,
  deleteVoiceStorage,
  uploadVoiceClip,
  voiceProfileMemoStoragePath,
  type VoiceNote,
} from '@/lib/profile/voice-notes';

export function ProfileVoiceMemoEditor({
  note,
  committedStoragePath,
  userId,
  disabled = false,
  onChange,
}: {
  note?: VoiceNote;
  committedStoragePath?: string;
  userId?: string;
  disabled?: boolean;
  onChange: (note?: VoiceNote) => void;
}) {
  const { toast } = useToast();
  const recorder = useVoiceRecorder({
    maxSeconds: PROFILE_VOICE_MEMO_MAX_SECONDS,
    transcribe: false,
  });
  const [busy, setBusy] = useState(false);
  const remaining = Math.max(0, PROFILE_VOICE_MEMO_MAX_SECONDS - recorder.elapsedMs / 1000);
  const canRecord = Boolean(userId) && !disabled && !busy && recorder.supported;

  const dropUnpublished = (path: string | undefined) => {
    if (path && path !== committedStoragePath) void deleteVoiceStorage(path);
  };

  const keepTake = async () => {
    if (!userId || !recorder.clip) return;
    setBusy(true);
    try {
      const uploaded = await uploadVoiceClip({
        storagePath: voiceProfileMemoStoragePath(userId, recorder.clip.contentType),
        clip: recorder.clip,
        maxSeconds: PROFILE_VOICE_MEMO_MAX_SECONDS,
        maxBytes: PROFILE_VOICE_MEMO_MAX_BYTES,
      });
      dropUnpublished(note?.storagePath);
      onChange(uploaded);
      recorder.discard();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not attach voice memo',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    dropUnpublished(note?.storagePath);
    recorder.discard();
    onChange(undefined);
  };

  if (!userId) {
    return <p className="text-xs text-muted-foreground">Sign in to add a voice memo.</p>;
  }

  if (!recorder.supported) {
    return (
      <p className="text-xs text-muted-foreground">
        This browser can’t record a voice memo. Try Chrome or Safari on your phone.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Voice memo</p>
        <p className="font-code text-[9px] uppercase tracking-widest text-muted-foreground">
          {PROFILE_VOICE_MEMO_MAX_SECONDS}s max · first under your photo
        </p>
      </div>

      {note && recorder.status !== 'recording' && !recorder.clip ? (
        <div className="flex flex-wrap items-center gap-2">
          <ProfileVoiceMemoBadge memo={note} />
          <p className="text-[11px] text-muted-foreground">Ready — tap the mic on your page to play it.</p>
          <button
            type="button"
            onClick={remove}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      ) : null}

      {recorder.status === 'recording' ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
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
            {remaining.toFixed(1)}s left
          </span>
        </div>
      ) : recorder.clip ? (
        <div className="space-y-2">
          <audio
            src={recorder.clip.objectUrl}
            controls
            playsInline
            className="h-9 w-full"
            preload="metadata"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 font-bold uppercase"
              disabled={disabled || busy}
              onClick={() => void keepTake()}
            >
              {busy ? 'Attaching…' : 'Use this take'}
            </Button>
            <button
              type="button"
              onClick={() => recorder.discard()}
              disabled={disabled || busy}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant={note ? 'outline' : 'secondary'}
          size="sm"
          className="h-8 gap-1.5 font-bold uppercase"
          disabled={!canRecord}
          onClick={() => void recorder.start()}
        >
          <Mic className="h-3.5 w-3.5" />
          {note ? 'Replace' : 'Record 3s hello'}
        </Button>
      )}

      {recorder.error ? (
        <p className="text-[11px] text-red-300">{recorder.error}</p>
      ) : null}
    </div>
  );
}
