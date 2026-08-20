'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { EMOJI_PALETTE, emojiMatchesQuery } from '@/lib/text/emoji-palette';
import { readRecentEmojis, rememberRecentEmoji } from '@/lib/text/recent-emojis';
import { insertAtCursor } from '@/lib/text/insert-at-cursor';

type TextFieldRef = React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;

export function useEmojiInserter(
  value: string,
  onValueChange: (next: string) => void,
  fieldRef: TextFieldRef
) {
  return useCallback(
    (emoji: string) => {
      const el = fieldRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const { next, cursor } = insertAtCursor(value, emoji, start, end);
      onValueChange(next);
      if (el) {
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(cursor, cursor);
        });
      }
    },
    [fieldRef, onValueChange, value]
  );
}

type EmojiPickerButtonProps = {
  onInsert: (emoji: string) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
};

function EmojiGrid({
  emojis,
  keyPrefix,
  onPick,
}: {
  emojis: string[];
  keyPrefix: string;
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {emojis.map((emoji) => (
        <button
          key={`${keyPrefix}-${emoji}`}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-white/10"
          onClick={() => onPick(emoji)}
          aria-label={`Insert ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function EmojiPickerButton({
  onInsert,
  disabled = false,
  compact = false,
  className,
  align = 'end',
  side = 'top',
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (open) setRecent(readRecentEmojis());
  }, [open]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_PALETTE;
    return EMOJI_PALETTE.map((group) => ({
      ...group,
      emojis: group.emojis.filter(
        (emoji) => group.label.toLowerCase().includes(q) || emojiMatchesQuery(emoji, q)
      ),
    })).filter((group) => group.emojis.length > 0);
  }, [query]);

  const filteredRecent = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recent;
    return recent.filter((emoji) => emojiMatchesQuery(emoji, q) || emoji.includes(q));
  }, [query, recent]);

  const pick = (emoji: string) => {
    onInsert(emoji);
    setRecent(rememberRecentEmoji(emoji));
    setQuery('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size={compact ? 'icon' : 'sm'}
          variant="ghost"
          disabled={disabled}
          className={cn(
            compact
              ? 'h-8 w-8 shrink-0 text-[var(--ph-accent,#7dd3fc)] hover:text-[var(--ph-accent,#7dd3fc)]'
              : 'h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--ph-muted,rgba(255,255,255,0.7))] hover:text-[var(--ph-accent,#7dd3fc)]',
            className
          )}
          title="Add emoji"
          aria-label="Add emoji"
        >
          <Smile className="h-3.5 w-3.5" />
          {compact ? null : 'Emoji'}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-[min(18rem,calc(100vw-1.5rem))] border-white/10 bg-[#0c1018] p-2 text-zinc-100 shadow-xl"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 32))}
          placeholder="Search emoji..."
          className="mb-2 h-8 border-white/15 bg-black/30 text-xs placeholder:text-zinc-500"
          aria-label="Search emoji"
        />
        <div
          className="max-h-64 overflow-y-auto overscroll-contain pr-1"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="space-y-2.5 pr-1">
            {filteredRecent.length > 0 ? (
              <div>
                <p className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                  Recent
                </p>
                <EmojiGrid emojis={filteredRecent} keyPrefix="recent" onPick={pick} />
              </div>
            ) : null}
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                  {group.label}
                </p>
                <EmojiGrid emojis={group.emojis} keyPrefix={group.label} onPick={pick} />
              </div>
            ))}
            {filteredGroups.length === 0 && filteredRecent.length === 0 ? (
              <p className="px-1 py-4 text-xs text-zinc-500">No emojis found.</p>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
