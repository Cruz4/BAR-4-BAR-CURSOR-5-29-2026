'use client';

import React, { useCallback, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { EMOJI_PALETTE } from '@/lib/text/emoji-palette';
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

export function EmojiPickerButton({
  onInsert,
  disabled = false,
  compact = false,
  className,
  align = 'end',
  side = 'top',
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);

  const pick = (emoji: string) => {
    onInsert(emoji);
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
        <ScrollArea className="max-h-56 pr-2">
          <div className="space-y-2.5">
            {EMOJI_PALETTE.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emojis.map((emoji) => (
                    <button
                      key={`${group.label}-${emoji}`}
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-white/10"
                      onClick={() => pick(emoji)}
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
