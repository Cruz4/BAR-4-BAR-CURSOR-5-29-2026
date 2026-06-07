'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Archive, ChevronsUpDown, PlusCircle, Replace, Trash2 } from 'lucide-react';
import type { DraftChestEntry } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { sheetDraftEntries } from '@/lib/draft-chest';

type DraftChestProps = {
  entries: DraftChestEntry[];
  disabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChange: (entries: DraftChestEntry[]) => void;
  onApplyEntry: (entry: DraftChestEntry, action: 'append' | 'replace') => void;
};

function entryPreview(entry: DraftChestEntry): string {
  const lines = entry.sections.flatMap((s) => s.bars.map((b) => b.text)).filter(Boolean);
  return lines.slice(0, 2).join(' / ') + (lines.length > 2 ? '…' : '');
}

export function DraftChest({
  entries,
  disabled = false,
  isOpen: controlledOpen,
  onOpenChange,
  onChange,
  onApplyEntry,
}: DraftChestProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<DraftChestEntry | null>(null);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const sheetEntries = sheetDraftEntries(entries);

  const removeEntry = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const handleAddToSheet = (entry: DraftChestEntry) => {
    if (disabled) return;
    onApplyEntry(entry, 'append');
  };

  const confirmReplace = () => {
    if (!replaceTarget) {
      setReplaceTarget(null);
      return;
    }
    onApplyEntry(replaceTarget, 'replace');
    setReplaceTarget(null);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-amber-500/[0.04] border-amber-500/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer p-4 md:p-6">
              <div className="flex justify-between items-center gap-2">
                <div className="flex flex-col text-left min-w-0">
                  <CardTitle className="font-headline text-lg flex items-center gap-2 uppercase tracking-widest text-amber-400/90">
                    <Archive className="h-5 w-5" /> Draft Chest
                  </CardTitle>
                  <CardDescription
                    className={cn(
                      'font-code tracking-wider uppercase font-bold text-muted-foreground/75',
                      isOpen ? 'text-[10px] leading-snug' : 'text-[9px] leading-none truncate'
                    )}
                  >
                    {sheetEntries.length > 0
                      ? `${sheetEntries.length} saved · full drafts`
                      : 'Stores drafts you did not use'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sheetEntries.length > 0 && (
                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-300">
                      {sheetEntries.length}
                    </Badge>
                  )}
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 md:p-6 md:pt-0">
              {sheetEntries.length === 0 ? (
                <p className="text-[10px] font-code text-muted-foreground leading-relaxed py-2">
                  Unused full song drafts from DNA &amp; REMIX land here automatically when you apply a different
                  draft or close the workstation — not individual Next/Prev bar lines.
                </p>
              ) : (
                <ScrollArea className="h-72 w-full pr-2">
                  <div className="space-y-3">
                    {sheetEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-amber-500/15 bg-background/40 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90">
                              {entry.label}
                            </p>
                            <p className="text-[8px] font-mono text-muted-foreground mt-0.5">
                              {format(new Date(entry.savedAt), 'MMM d · h:mm a')}
                              {entry.meta?.lineCount != null ? ` · ${entry.meta.lineCount} lines` : ''}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            disabled={disabled}
                            onClick={() => removeEntry(entry.id)}
                            aria-label="Remove from chest"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <p className="text-xs font-code text-foreground/85 leading-snug line-clamp-3">
                          {entryPreview(entry)}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            className="h-8 text-[9px] font-bold uppercase gap-1.5 border-primary/25"
                            onClick={() => handleAddToSheet(entry)}
                          >
                            <PlusCircle className="h-3 w-3" /> Add to page
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            className="h-8 text-[9px] font-bold uppercase gap-1.5 border-amber-500/30 text-amber-200"
                            onClick={() => setReplaceTarget(entry)}
                          >
                            <Replace className="h-3 w-3" /> Replace sheet
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <AlertDialog open={!!replaceTarget} onOpenChange={(o) => !o && setReplaceTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline uppercase">Replace current sheet?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-code">
              This clears all lyrics on this track and loads <strong>{replaceTarget?.label}</strong> from the chest.
              Undo still works from the sheet toolbar if you change your mind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplace} className="bg-amber-600 hover:bg-amber-500">
              Replace sheet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
