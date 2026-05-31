
'use client';

import React, { useState, useContext } from 'react';
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
import { Copy, Check, Globe, Share2, Sparkles, Loader, Droplets } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DataContext } from '@/context/data-context';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'album' | 'track';
  id: string;
  title: string;
  existingShareId?: string;
}

export function ShareDialog({ open, onOpenChange, type, id, title, existingShareId }: ShareDialogProps) {
  const { dropDNA, isCloudSyncActive } = useContext(DataContext);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareId, setShareId] = useState(existingShareId || '');
  const [copied, setCopied] = useState(false);

  const handleDropDNA = async () => {
    if (!isCloudSyncActive) {
        toast({ variant: 'destructive', title: "Studio Pro Required", description: "Sharing DNA is a premium platform feature." });
        return;
    }
    
    setIsGenerating(true);
    try {
        const newShareId = await dropDNA(type, id);
        setShareId(newShareId);
        toast({ title: "DNA Drop Successful!", description: "Your project is now live on the platform." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Drop Failed", description: e.message });
    } finally {
        setIsGenerating(false);
    }
  };

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link Copied" });
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
            Make your studio blueprint public.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {!shareId ? (
            <div className="space-y-4 text-center px-4">
                <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                    <Sparkles className="h-10 w-10 text-primary mx-auto animate-pulse" />
                    <h3 className="font-headline text-xl font-bold uppercase">Ready to go live?</h3>
                    <p className="text-xs text-muted-foreground font-code leading-relaxed">
                        Dropping DNA creates a public snapshot of your **lyrics**, **structure**, and **creative questions**. Fans can explore your mind, and other artists can import your setup as a template.
                    </p>
                </div>
                <Button 
                    onClick={handleDropDNA} 
                    disabled={isGenerating} 
                    className="w-full h-14 text-lg font-bold shadow-xl gap-2"
                >
                    {isGenerating ? <Loader className="animate-spin" /> : <Share2 className="h-5 w-5" />}
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
                <div className="p-4 bg-muted/20 border border-dashed rounded-lg">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase mb-2">Live Status:</p>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase text-green-600">DNA is Live in the Vault</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2 leading-relaxed">
                        Tip: Re-drop after changing album cover art so the public link shows the latest image.
                    </p>
                </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-start">
            <p className="text-[9px] text-muted-foreground font-code uppercase text-center w-full">
                Tip: Share this link on your social media or project landing page.
            </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
