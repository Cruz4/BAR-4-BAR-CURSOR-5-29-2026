'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import type { CollabMessage } from '@/lib/collab-sheet/types';

function stampTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function CollabSheetChatPanel({
  open,
  onOpenChange,
  messages,
  userId,
  onSend,
  dmTargetName,
  onClearDmTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: CollabMessage[];
  userId?: string;
  onSend: (text: string) => Promise<void>;
  dmTargetName?: string;
  onClearDmTarget?: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);
  const insertEmoji = useEmojiInserter(text, setText, composeRef);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages.length]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-full right-0 z-[45] mb-1 w-[min(100vw-1rem,22rem)]">
      <div className="rounded-xl border border-violet-500/30 bg-card/95 shadow-2xl backdrop-blur-md overflow-hidden">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex w-full items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-left"
        >
          <span className="inline-flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-[0.2em] text-violet-200">
            <MessageCircle className="h-3.5 w-3.5" />
            Collab chat
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </button>
        {open ? (
          <>
            {dmTargetName ? (
              <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-1.5 bg-violet-500/10">
                <p className="text-[10px] text-violet-100 truncate">Message {dmTargetName}</p>
                <button type="button" className="text-[9px] uppercase text-muted-foreground hover:text-foreground" onClick={onClearDmTarget}>
                  All
                </button>
              </div>
            ) : null}
            <div className="max-h-52 overflow-y-auto studio-scrollbar px-3 py-2 space-y-2">
              {messages.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-4 text-center">No messages yet — say hi.</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === userId;
                  return (
                    <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                      <span className="font-code text-[8px] uppercase tracking-wider text-muted-foreground/80">
                        {mine ? 'You' : m.senderName} · {stampTime(m.createdAt)}
                      </span>
                      <p
                        className={cn(
                          'mt-0.5 max-w-[90%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-[12px] leading-snug',
                          mine ? 'bg-violet-500/20 text-violet-50' : 'bg-muted/50 text-foreground/90'
                        )}
                      >
                        {m.text}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-1.5 border-t border-white/10 p-2">
              <EmojiPickerButton compact disabled={busy} onInsert={insertEmoji} />
              <Input
                ref={composeRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="h-8 text-xs border-white/10 bg-background/60"
                maxLength={800}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
              <Button type="button" size="icon" className="h-8 w-8 shrink-0" disabled={busy || !text.trim()} onClick={() => void submit()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function CollabSheetChatToggle({
  unread = 0,
  onClick,
  className,
}: {
  unread?: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        className="h-8 gap-1.5 border-violet-400/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 font-code text-[9px] font-bold uppercase tracking-wider"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Chat
      </Button>
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </div>
  );
}
