'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  POST_POLL_MAX_OPTIONS,
  POST_POLL_OPTION_MAX_LENGTH,
  type PostPollResultsVisibility,
} from '@/lib/profile/post-polls';

type Props = {
  options: string[];
  onOptionsChange: (options: string[]) => void;
  resultsVisibility: PostPollResultsVisibility;
  onResultsVisibilityChange: (visibility: PostPollResultsVisibility) => void;
  onRemovePoll: () => void;
  disabled?: boolean;
};

export function PollComposerFields({
  options,
  onOptionsChange,
  resultsVisibility,
  onResultsVisibilityChange,
  onRemovePoll,
  disabled,
}: Props) {
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-cyan-400/25 bg-cyan-500/[0.05] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-code text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            Poll choices
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Your post text above is the question. Votes are final.
          </p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onRemovePoll} disabled={disabled} aria-label="Remove poll">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {options.map((option, index) => (
        <div key={index} className="flex min-w-0 items-center gap-2">
          <span className="w-5 shrink-0 text-center font-code text-[10px] font-bold text-cyan-300/80">{index + 1}</span>
          <Input
            value={option}
            onChange={(event) => {
              const next = [...options];
              next[index] = event.target.value;
              onOptionsChange(next);
            }}
            maxLength={POST_POLL_OPTION_MAX_LENGTH}
            disabled={disabled}
            placeholder={`Choice ${index + 1}`}
            className="h-8 min-w-0 border-white/10 bg-black/30 text-xs"
          />
          {options.length > 2 ? (
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-300" onClick={() => onOptionsChange(options.filter((_, optionIndex) => optionIndex !== index))} disabled={disabled} aria-label={`Remove choice ${index + 1}`}>
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 border-cyan-400/25 px-2 text-[10px] uppercase tracking-wider"
          onClick={() => onOptionsChange([...options, ''])}
          disabled={disabled || options.length >= POST_POLL_MAX_OPTIONS}
        >
          <Plus className="h-3 w-3" /> Add choice
        </Button>
        <label className="flex cursor-pointer items-center gap-2 text-[10px] text-muted-foreground">
          <Switch
            checked={resultsVisibility === 'always'}
            onCheckedChange={(checked) => onResultsVisibilityChange(checked ? 'always' : 'after_vote')}
            disabled={disabled}
            aria-label="Show poll totals before voting"
          />
          Show totals before voting
        </label>
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground/80">
        Individual choices stay private. By default, totals appear only after someone votes.
      </p>
    </div>
  );
}
