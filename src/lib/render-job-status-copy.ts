import type { RenderJobRecord } from '@/lib/song-generation/types';

function humanizeRenderFailure(message: string | null | undefined): string {
  const raw = (message || '').trim();
  if (!raw) {
    return 'Ink was refunded if the job failed before delivery. Generate again once ACE-Step is connected.';
  }
  if (/fetch failed|econnrefused|enotfound/i.test(raw)) {
    return 'Local ACE-Step is not running. In a second terminal: npm run render:local-ace — wait for the API to start, then Generate again.';
  }
  return raw;
}

export function describeRenderJobStatus(
  job: Pick<RenderJobRecord, 'status' | 'route' | 'progressPct' | 'failureMessage'> | null | undefined,
  _onlineDeviceCount: number,
  studioAutoRender: boolean,
  onRenderStudioPage = false
): { title: string; detail: string; tone: 'muted' | 'warn' | 'ok' | 'error' } {
  if (!job) {
    return {
      title: 'No active job',
      detail: 'Tap Generate to start a render from this sheet.',
      tone: 'muted',
    };
  }

  const pct = job.progressPct ?? 0;

  switch (job.status) {
    case 'ready':
      return {
        title: 'Your take is ready',
        detail: onRenderStudioPage
          ? 'Use Takes below — listen to the full song, then Approve to library.'
          : 'Open Render Studio to listen, approve, or send to your library.',
        tone: 'ok',
      };
    case 'failed':
      return {
        title: 'Render failed',
        detail: humanizeRenderFailure(job.failureMessage),
        tone: 'error',
      };
    case 'canceled':
    case 'expired':
      return {
        title: `Render ${job.status}`,
        detail: 'Start a new generate when you are ready.',
        tone: 'muted',
      };
    case 'claimed':
    case 'generating':
    case 'uploading':
    case 'processing':
      return {
        title: `Rendering full song (${pct}%)`,
        detail:
          'ACE-Step is singing this sheet’s lyrics. Full track, not a preview — usually 2–4 minutes.',
        tone: 'ok',
      };
    case 'queued':
    default:
      if (studioAutoRender) {
        return {
          title: 'Queued for ACE-Step',
          detail: 'Starting the full lyric render. Leave this page open — it can take a few minutes.',
          tone: 'ok',
        };
      }
      return {
        title: 'Queued',
        detail:
          'Rendering is not available right now. Song generation may be turned off in admin, or the studio cloud is at capacity.',
        tone: 'warn',
      };
  }
}
