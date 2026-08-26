
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/client/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Loader, MessageSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledError?: string;
}

export function BugReportDialog({ open, onOpenChange, prefilledError }: BugReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const pathname = usePathname();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        userId: user.id,
        userName: user.displayName || 'Unknown Artist',
        message: message.trim(),
        errorDetails: prefilledError || 'N/A',
        path: pathname,
        timestamp: new Date().toISOString(),
        status: 'new'
      });

      toast({
        title: "Report Sent",
        description: "The developers have received your report. Thank you for helping us improve the studio."
      });
      setMessage('');
      onOpenChange(false);
    } catch {
      toast({
        variant: 'destructive',
        title: "Submission Failed",
        description: "Could not send the report. Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <MessageSquare className="text-primary h-5 w-5" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Encountered a bug or have feedback? Let the studio architects know.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-message" className="text-xs font-bold uppercase tracking-widest">Description</Label>
            <Textarea
              id="report-message"
              placeholder="What happened? What were you doing?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          {prefilledError && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-destructive">System Error Log</Label>
              <div className="p-3 bg-muted rounded-md text-[10px] font-mono overflow-auto max-h-32 border border-destructive/20 text-destructive">
                {prefilledError}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? <Loader className="animate-spin mr-2 h-4 w-4" /> : null}
            Send Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
