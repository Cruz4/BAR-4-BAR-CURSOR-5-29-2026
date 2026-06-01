'use client';

import React, { useState, useContext, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Globe, Share2, Sparkles, Loader, RefreshCw, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DataContext } from '@/context/data-context';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'album' | 'track';
  id: string;
  title: string;
  albumId?: string;
  existingShareId?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  type,
  id,
  title,
  albumId,
  existingShareId,
}: ShareDialogProps) {
  const { dropDNA, updateDNA, revokeDNA, isCloudSyncActive } = useContext(DataContext);
  const { toast } = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [shareId, setShareId] = useState(existingShareId || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setShareId(existingShareId || '');
    }
  }, [open, existingShareId]);

  const scopeOptions = albumId ? { albumId } : undefined;

  const handleDropDNA = async () => {
    if (!isCloudSyncActive) {
      toast({
        variant: 'destructive',
        title: 'Studio Pro Required',
        description: 'Sharing DNA is a premium platform feature.',
      });
      return;
    }

    setIsWorking(true);
    try {
      const newShareId = await dropDNA(type, id, scopeOptions);
      setShareId(newShareId);
      toast({
        title: shareId ? 'DNA Drop Updated' : 'DNA Drop Live',
        description: 'Your public link now reflects your latest saved setup.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not publish DNA Drop.';
      toast({ variant: 'destructive', title: 'Drop Failed', description: message });
    } finally {
      setIsWorking(false);
    }
  };

  const handleUpdateDNA = async () => {
    if (!shareId) return;
    setIsWorking(true);
    try {
      await updateDNA(type, id, shareId, scopeOptions);
      toast({
        title: 'Snapshot refreshed',
        description: 'Same link — visitors and importers now see your latest saved DNA.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not update DNA Drop.';
      toast({ variant: 'destructive', title: 'Update Failed', description: message });
    } finally {
      setIsWorking(false);
    }
  };

  const handleRevokeDNA = async () => {
    if (!shareId) return;
    setIsWorking(true);
    try {
      await revokeDNA(type, id, shareId, scopeOptions);
      setShareId('');
      toast({
        title: 'DNA Drop offline',
        description: 'The public link no longer works. You can publish again anytime.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not take DNA Drop offline.';
      toast({ variant: 'destructive', title: 'Offline Failed', description: message });
    } finally {
      setIsWorking(false);
    }
  };

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Link Copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2">
        <DialogHeader>
          <DialogTitle className="font-headline text-3xl flex items-center gap-3">
            <Globe className="text-primary h-8 w-8" /> DNA DROP
          </DialogTitle>
          <DialogDescription className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
            Public snapshot of <span className="text-foreground">{title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {!shareId ? (
            <div className="space-y-4 text-center px-2">
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-3 text-left">
                <Sparkles className="h-9 w-9 text-primary mx-auto animate-pulse" />
                <h3 className="font-headline text-lg font-bold uppercase text-center">Ready to go live?</h3>
                <p className="text-[11px] text-muted-foreground font-code leading-relaxed">
                  Publishes a snapshot of everything saved on this {type === 'album' ? 'album' : 'track'}:
                  lyrics &amp; structure, Creative DNA, checked intents, vibe, guardrails, special instructions,
                  and Style DNA when that toggle is on.
                </p>
                <p className="text-[10px] text-muted-foreground/80 italic border-t border-white/5 pt-2">
                  Not live-synced — press Update after you change anything you want reflected on the link.
                </p>
              </div>
              <Button onClick={handleDropDNA} disabled={isWorking} className="w-full h-12 text-sm font-bold shadow-xl gap-2">
                {isWorking ? <Loader className="animate-spin" /> : <Share2 className="h-4 w-4" />}
                Confirm DNA Drop
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Public Studio Link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={shareUrl} className="font-code text-xs bg-background/50 h-10" />
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border border-dashed rounded-lg space-y-2">
                <p className="text-[9px] text-muted-foreground font-bold uppercase">Live status</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-green-600">DNA Drop is public</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  The link stays the same. Use <strong className="text-foreground">Update snapshot</strong> after you
                  edit lyrics, DNA, intents, vibe, style, or structure — otherwise visitors keep seeing the last
                  published version. Old links you posted elsewhere do not auto-update until you refresh.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="h-10 text-[10px] font-bold uppercase gap-2"
                  onClick={handleUpdateDNA}
                  disabled={isWorking}
                >
                  {isWorking ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Update snapshot
                </Button>
                <Button
                  variant="outline"
                  className="h-10 text-[10px] font-bold uppercase gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                  onClick={handleRevokeDNA}
                  disabled={isWorking}
                >
                  <EyeOff className="h-3.5 w-3.5" /> Take offline
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-start">
          <p className="text-[9px] text-muted-foreground font-code uppercase text-center w-full leading-relaxed">
            Import copies the snapshot into another artist&apos;s vault. Take offline to close the link entirely.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
