'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { FOLD_BAR_MAX_CHARS, foldIdFor } from '@/lib/folds/types';
import { passBarClient } from '@/lib/folds/client';
import { cn } from '@/lib/utils';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { useFoldsFeature } from '@/hooks/use-folds-feature';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';

export function PassBarDialog({
  open,
  onOpenChange,
  peerId,
  peerName,
  senderSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerId: string;
  peerName: string;
  senderSlug?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const insertEmoji = useEmojiInserter(text, setText, composeRef);

  const submit = async () => {
    if (!user || !text.trim()) return;
    setBusy(true);
    try {
      const { fold } = await passBarClient({
        peerId,
        text,
        senderName: user.displayName || 'Artist',
        senderSlug,
        clientId: `local_${Date.now().toString(36)}`,
      });
      onOpenChange(false);
      setText('');
      toast({ title: 'Sent', description: `Message to ${peerName}.` });
      router.push(`/msgs/${fold.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not send',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-amber-500/25 bg-[#120e0a] sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl uppercase tracking-tight">
            Message {peerName}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            If you aren’t friends yet, they accept before the thread stays open.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2">
          <EmojiPickerButton
            compact
            disabled={busy}
            onInsert={insertEmoji}
            className="mt-2 shrink-0 text-amber-200/80 hover:text-amber-100"
          />
          <Textarea
            ref={composeRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, FOLD_BAR_MAX_CHARS))}
            placeholder="Write a message…"
            className="min-h-[120px] flex-1 resize-none rounded-none border-amber-500/20 bg-black/30 font-serif text-base leading-relaxed"
            maxLength={FOLD_BAR_MAX_CHARS}
            autoFocus
          />
        </div>
        <p className="text-right font-code text-[10px] text-muted-foreground">
          {text.trim().length}/{FOLD_BAR_MAX_CHARS}
        </p>
        <DialogFooter>
          <Button
            className="h-10 rounded-none bg-amber-700 font-bold uppercase tracking-[0.2em] text-amber-50 hover:bg-amber-600"
            disabled={busy || !text.trim()}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PassBarButton({
  peerId,
  peerName,
  senderSlug,
  className,
  size = 'sm',
}: {
  peerId: string;
  peerName: string;
  senderSlug?: string;
  className?: string;
  size?: 'sm' | 'xs';
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { folds } = useFoldInbox();
  const { enabled } = useFoldsFeature();
  const [open, setOpen] = useState(false);
  if (!user || user.id === peerId || !enabled) return null;

  const foldId = foldIdFor(user.id, peerId);
  const existing = folds.find((f) => f.id === foldId && f.status !== 'declined');

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn(
          'gap-1.5 rounded-none border-amber-500/40 bg-amber-500/10 font-bold uppercase text-amber-100 hover:bg-amber-500/20',
          size === 'xs' ? 'h-8 px-2 text-[10px]' : 'h-9',
          className
        )}
        onClick={() => {
          if (existing) {
            router.push(`/msgs/${existing.id}`);
            return;
          }
          setOpen(true);
        }}
        aria-label="Message"
        title="Message"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="max-[380px]:hidden">Message</span>
      </Button>
      <PassBarDialog
        open={open}
        onOpenChange={setOpen}
        peerId={peerId}
        peerName={peerName}
        senderSlug={senderSlug}
      />
    </>
  );
}
