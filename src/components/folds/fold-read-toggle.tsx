'use client';

import React from 'react';
import { Mail, MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FoldReadToggleProps = {
  foldId: string;
  wet: boolean;
  busy?: boolean;
  onBusyChange?: (foldId: string | null) => void;
  /** Compact icon-only control for the header dropdown. */
  compact?: boolean;
  className?: string;
};

export function FoldReadToggle({
  foldId,
  wet,
  busy = false,
  onBusyChange,
  compact = false,
  className,
}: FoldReadToggleProps) {
  const { markFoldRead, markFoldUnread } = useFoldInbox();
  const { toast } = useToast();

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (busy) return;
    onBusyChange?.(foldId);
    try {
      if (wet) {
        await markFoldRead(foldId);
        toast({ title: 'Marked read' });
      } else {
        await markFoldUnread(foldId);
        toast({ title: 'Marked unread' });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: wet ? 'Could not mark read' : 'Could not mark unread',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      onBusyChange?.(null);
    }
  };

  if (compact) {
    return wet ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Mark as read"
        aria-label="Mark as read"
        disabled={busy}
        className={cn(
          'absolute right-1.5 top-2 z-20 h-7 w-7 text-amber-200 hover:bg-amber-500/15 hover:text-amber-50',
          className
        )}
        onClick={(e) => void toggle(e)}
      >
        <Mail className="h-3.5 w-3.5" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Mark as unread"
        aria-label="Mark as unread"
        disabled={busy}
        className={cn(
          'absolute right-1.5 top-2 z-20 h-7 w-7 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-200 opacity-80 group-hover:opacity-100',
          className
        )}
        onClick={(e) => void toggle(e)}
      >
        <MailOpen className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      title={wet ? 'Mark as read' : 'Mark as unread'}
      aria-label={wet ? 'Mark as read' : 'Mark as unread'}
      onClick={(e) => void toggle(e)}
      className={cn(
        'inline-flex items-center gap-1 font-code text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-amber-100',
        className
      )}
    >
      {wet ? <Mail className="h-3 w-3" /> : <MailOpen className="h-3 w-3" />}
      {wet ? 'Mark read' : 'Mark unread'}
    </button>
  );
}
