'use client';

import React, { useRef, useState } from 'react';
import { Camera, ImageIcon, Shuffle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { processProfilePhotoFile } from '@/lib/cover-art';
import { useToast } from '@/hooks/use-toast';

export type GuestSandboxPhotoSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  onCustomPhoto: (dataUrl: string) => void;
  onUseInitials: () => void;
  onShuffleStar: () => void;
};

export function GuestSandboxPhotoSheet({
  open,
  onOpenChange,
  displayName,
  onCustomPhoto,
  onUseInitials,
  onShuffleStar,
}: GuestSandboxPhotoSheetProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const { dataUrl } = await processProfilePhotoFile(file);
      onCustomPhoto(dataUrl);
      toast({ title: 'Photo updated', description: 'Shows on your preview until you claim.' });
      onOpenChange(false);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Image not accepted',
        description: e instanceof Error ? e.message : 'Could not process image.',
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-t border-white/15 bg-background">
        <SheetHeader className="text-left">
          <SheetTitle className="font-headline text-lg uppercase">Profile photo</SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            Try a look for {displayName || 'your page'}. Saved to this browser session only — claim your
            profile to keep it.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            className="h-11 w-full justify-start gap-2 font-bold uppercase text-[11px] tracking-wider"
            disabled={busy}
            onClick={pickFile}
          >
            <Camera className="h-4 w-4" />
            Upload photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-start gap-2 font-bold uppercase text-[11px] tracking-wider"
            disabled={busy}
            onClick={() => {
              onUseInitials();
              toast({ title: 'Using initials star' });
              onOpenChange(false);
            }}
          >
            <ImageIcon className="h-4 w-4" />
            Use initials star
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-start gap-2 font-bold uppercase text-[11px] tracking-wider"
            disabled={busy}
            onClick={() => {
              onShuffleStar();
              toast({ title: 'Feed star shuffled' });
            }}
          >
            <Shuffle className="h-4 w-4" />
            Shuffle feed star look
          </Button>
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          Nothing is stored on our servers until you sign up and claim. Closing the tab clears this preview.
        </p>
      </SheetContent>
    </Sheet>
  );
}
