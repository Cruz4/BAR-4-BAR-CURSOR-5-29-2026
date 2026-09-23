'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { describeRenderJobStatus } from '@/lib/render-job-status-copy';
import type { RenderJobRecord } from '@/lib/song-generation/types';
import { cn } from '@/lib/utils';

export function RenderJobLiveStatus({
  jobId,
  albumId,
  trackId,
  studioAutoRender = false,
  onRenderStudioPage = false,
  onStatusChange,
  onJobReady,
}: {
  jobId: string | null;
  albumId: string;
  trackId: string;
  studioAutoRender?: boolean;
  /** When true, do not link back to Render Studio (avoids loop). */
  onRenderStudioPage?: boolean;
  onStatusChange?: (status: string | null) => void;
  onJobReady?: () => void;
}) {
  const { user } = useAuth();
  const [job, setJob] = useState<RenderJobRecord | null>(null);
  useEffect(() => {
    if (!jobId || !user) {
      setJob(null);
      return;
    }

    let cancelled = false;
    let readyNotified = false;
    let terminal = false;
    const poll = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token || cancelled) return;
        const res = await fetch(`/api/render/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          const next = data.job as RenderJobRecord;
          setJob(next);
          onStatusChange?.(next?.status ?? null);
          if (next?.status === 'ready' && !readyNotified) {
            readyNotified = true;
            onJobReady?.();
          }
          if (['ready', 'failed', 'canceled', 'expired'].includes(next?.status)) {
            terminal = true;
          }
        }
      } catch {
        // ignore
      }
    };

    void poll();
    const timer = setInterval(() => {
      if (readyNotified || terminal || cancelled) {
        clearInterval(timer);
        return;
      }
      void poll();
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, user]);

  const copy = useMemo(
    () => describeRenderJobStatus(job, 0, studioAutoRender, onRenderStudioPage),
    [job, studioAutoRender, onRenderStudioPage]
  );

  if (!jobId) return null;

  const scrollToTakes = () => {
    document.getElementById('render-takes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-lg border px-3 py-2.5 text-[11px] leading-snug',
          copy.tone === 'warn' && 'border-amber-500/35 bg-amber-500/10 text-amber-50/95',
          copy.tone === 'ok' && 'border-green-500/30 bg-green-500/10 text-green-50/95',
          copy.tone === 'error' && 'border-red-500/35 bg-red-500/10 text-red-100/95',
          copy.tone === 'muted' && 'border-white/10 bg-muted/20 text-muted-foreground'
        )}
      >
        <p className="font-bold uppercase tracking-wide flex items-center gap-2">
          {(job?.status === 'queued' ||
            job?.status === 'claimed' ||
            job?.status === 'generating' ||
            job?.status === 'uploading' ||
            job?.status === 'processing') && (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          )}
          {copy.title}
          <span className="font-code font-normal normal-case text-muted-foreground">
            · {job?.status ?? '…'}
          </span>
        </p>
        <p className="mt-1">{copy.detail}</p>
        {job?.status === 'ready' && onRenderStudioPage && (
          <button
            type="button"
            className="mt-2 inline-block text-[10px] font-bold uppercase text-primary underline"
            onClick={scrollToTakes}
          >
            Go to takes
          </button>
        )}
        {job?.status === 'ready' && !onRenderStudioPage && (
          <Link
            href={`/albums/${albumId}/tracks/${trackId}/render`}
            className="mt-2 inline-block text-[10px] font-bold uppercase text-primary underline"
          >
            Open Render Studio
          </Link>
        )}
      </div>
    </div>
  );
}
