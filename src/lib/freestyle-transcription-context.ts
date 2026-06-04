import type { Track } from '@/lib/types';

export const FREESTYLE_PRIOR_TAIL_CHARS = 220;
export const FREESTYLE_CONTEXT_FIELD_MAX = 400;
export const FREESTYLE_STYLE_CONTEXT_MAX = 600;

/** Compact track vibe for STT hints (genre, tempo, mood). */
export function formatTrackVibeForTranscription(vibe: Track['vibe']): string {
  if (!vibe) return '';
  const bits: string[] = [];
  if (vibe.genre?.trim()) bits.push(vibe.genre.trim());
  if (vibe.tempoBPM) bits.push(`${vibe.tempoBPM} BPM`);
  if (vibe.feeling?.length) bits.push(vibe.feeling.filter(Boolean).join(', '));
  if (vibe.instrumentation?.trim()) {
    bits.push(vibe.instrumentation.trim().slice(0, 120));
  }
  return bits.join(' · ').slice(0, FREESTYLE_CONTEXT_FIELD_MAX);
}

export function truncateFreestyleContextField(text: string, max = FREESTYLE_CONTEXT_FIELD_MAX): string {
  return text.trim().slice(0, max);
}

export type FreestyleTranscriptionContext = {
  priorTranscriptTail?: string;
  albumTheme?: string;
  trackVibeSummary?: string;
  styleProfileSummary?: string;
};

export function buildFreestyleTranscribePrompt(ctx: FreestyleTranscriptionContext): string {
  const lines = [
    'You are transcribing a live hip-hop/rap freestyle into lyric text.',
    'Output only words spoken in THIS audio clip.',
    'Do not repeat lines from the prior transcript tail.',
    'Preserve slang, contractions, names, and non-standard spellings when clearly spoken.',
    'Do not translate, summarize, fix grammar, or invent lyrics.',
    'Return an empty transcript if there is no clear speech.',
  ];

  const theme = ctx.albumTheme?.trim();
  if (theme) {
    lines.push(`Album theme: ${truncateFreestyleContextField(theme)}`);
  }

  const vibe = ctx.trackVibeSummary?.trim();
  if (vibe) {
    lines.push(`Track vibe: ${truncateFreestyleContextField(vibe)}`);
  }

  const style = ctx.styleProfileSummary?.trim();
  if (style) {
    lines.push(`Artist style: ${style.slice(0, FREESTYLE_STYLE_CONTEXT_MAX)}`);
  }

  const prior = ctx.priorTranscriptTail?.trim();
  if (prior) {
    const tail = prior.slice(-FREESTYLE_PRIOR_TAIL_CHARS);
    lines.push(
      `Prior lines already captured (continue after these; output only NEW words from the clip): "${tail}"`
    );
  }

  return lines.join('\n');
}
