'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Flag, Loader } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import {
  MODERATION_REPORT_REASONS,
  type ModerationReportTarget,
} from '@/lib/moderation-report';
import { buildLoginUrl } from '@/lib/login-links';
import { cn } from '@/lib/utils';

type ModerationReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetKind: ModerationReportTarget;
  targetId: string;
  targetUserId?: string;
  targetUserName?: string;
  title?: string;
};

export function ModerationReportDialog({
  open,
  onOpenChange,
  targetKind,
  targetId,
  targetUserId,
  targetUserName,
  title,
}: ModerationReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [reasonId, setReasonId] = useState('');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReasonId('');
    setDetail('');
  };

  const submit = async () => {
    if (!user) {
      window.location.assign(buildLoginUrl({ next: pathname || '/' }));
      return;
    }
    if (!reasonId) {
      toast({ variant: 'destructive', title: 'Pick a reason' });
      return;
    }
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in again');
      const contextUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : pathname;
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetKind,
          targetId,
          targetUserId,
          targetUserName,
          reasonId,
          detail: detail.trim() || undefined,
          contextUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Report failed');
      toast({
        title: 'Report sent',
        description: 'Our team was emailed. Blocking is separate — use Block on their profile if you need that now.',
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not send report',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline uppercase flex items-center gap-2">
            <Flag className="h-4 w-4 text-amber-400" />
            {title || (targetKind === 'post' ? 'Report post' : 'Report user')}
          </DialogTitle>
          <DialogDescription>
            Reports go to AKAsheet moderators by email. Choose the closest reason; add detail if you need to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            {MODERATION_REPORT_REASONS.map((reason) => (
              <button
                key={reason.id}
                type="button"
                onClick={() => setReasonId(reason.id)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  reasonId === reason.id
                    ? 'border-amber-400/50 bg-amber-500/15 text-amber-50'
                    : 'border-white/10 bg-black/20 text-muted-foreground hover:border-white/20'
                )}
              >
                {reason.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-detail" className="text-xs font-bold uppercase tracking-widest">
              Extra detail {reasonId === 'other' ? '(required)' : '(optional)'}
            </Label>
            <Textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="What happened? Links or context help."
              className="min-h-[88px]"
              maxLength={2000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy || !reasonId}>
            {busy ? <Loader className="h-4 w-4 animate-spin" /> : 'Send report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
