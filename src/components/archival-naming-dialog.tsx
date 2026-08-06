'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  suggestArchiveProfileName,
  type ArchiveProfileKind,
} from '@/lib/dna-strands';

type ArchivalNamingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  type: ArchiveProfileKind;
  sourceTrackTitle?: string | null;
  /** Overrides the default “… — DNA Profile” suffix (e.g. album saves). */
  profileLabel?: string | null;
};

export function ArchivalNamingDialog({
  open,
  onOpenChange,
  onConfirm,
  type,
  sourceTrackTitle,
  profileLabel,
}: ArchivalNamingDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(suggestArchiveProfileName(type, sourceTrackTitle, { label: profileLabel }));
    }
  }, [open, type, sourceTrackTitle, profileLabel]);

  const example = suggestArchiveProfileName(type, 'My Track', { label: profileLabel });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2 z-[3000]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Save className="text-primary" /> Save {profileLabel?.trim() || `${type} Profile`}
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-tight">
            Name this saved {type.toLowerCase()} profile for your album vault.
            {type === 'DNA' ? ' Extraction strains are stored inside the profile.' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={example}
            className="bg-background/50 font-bold"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) return;
              onConfirm(trimmed);
              onOpenChange(false);
            }}
            disabled={!name.trim()}
            className="px-8 font-bold"
          >
            Confirm Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
