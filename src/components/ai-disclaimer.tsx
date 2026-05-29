import { AlertTriangle } from 'lucide-react';

/** Shown near AI generation controls — not legal advice. */
export function AiDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider leading-relaxed font-code">
        AI suggestions may be inaccurate. You are responsible for lyrical clearance, copyright, and how you use generated content. Not legal advice.
      </p>
    );
  }
  return (
    <div className="flex gap-2 items-start p-3 rounded-lg border border-pink-500/20 bg-pink-500/5">
      <AlertTriangle className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
      <p className="text-[10px] text-muted-foreground leading-relaxed font-code">
        <strong className="text-pink-400 uppercase tracking-wider">AI Co-Writer Notice:</strong>{' '}
        Generated lyrics are suggestions only and may contain errors or unintended content. You retain responsibility for reviewing, editing, and ensuring you have rights to use any source material. AI output may not be copyrightable under current law. Bar 4 Bar does not provide legal advice.
      </p>
    </div>
  );
}
