'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronsUpDown, PlusCircle, Replace, Trash2 } from 'lucide-react';
import type { DraftChestEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { studioDraftChestShell, studioPanelCaption } from '@/lib/studio-panel-styles';

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

function TreasureChestMark({ open, count }: { open: boolean; count: number }) {
  return (
    <div className="relative h-8 w-8 shrink-0" aria-hidden>
      <svg viewBox="0 0 36 32" className="h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
        <rect x="5" y="17" width="26" height="13" rx="2.5" fill="#78350f" />
        <rect x="5" y="17" width="26" height="13" rx="2.5" fill="none" stroke="#f59e0b" strokeWidth="1.1" />
        <rect x="5" y="22" width="26" height="2.5" fill="#fbbf24" opacity="0.5" />
        <rect x="7" y="25" width="22" height="1.5" rx="0.75" fill="#fcd34d" opacity="0.35" />
        <g
          className={cn(
            'origin-[18px_17px] transition-transform duration-300 ease-out',
            open ? '-translate-y-[2px] -rotate-[10deg]' : 'translate-y-0 rotate-0'
          )}
        >
          <path d="M5 17 C5 10.5 18 7.5 31 17 Z" fill="#92400e" stroke="#fbbf24" strokeWidth="1.1" />
          <path d="M8 16.5 C14 12.5 22 12.5 28 16.5" fill="none" stroke="#fde68a" strokeWidth="0.8" opacity="0.55" />
          <rect x="15.5" y="13.5" width="5" height="4.5" rx="1.2" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
          <circle cx="18" cy="15.2" r="0.9" fill="#78350f" />
        </g>
        <circle cx="8.5" cy="20" r="1.1" fill="#fde68a" opacity="0.85" />
        <circle cx="27.5" cy="20" r="1.1" fill="#fde68a" opacity="0.85" />
        <circle cx="8.5" cy="26.5" r="1.1" fill="#fde68a" opacity="0.65" />
        <circle cx="27.5" cy="26.5" r="1.1" fill="#fde68a" opacity="0.65" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-amber-950/50 bg-amber-300 px-0.5 text-[8px] font-bold leading-none text-amber-950 shadow-sm">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
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
        <Card
          data-studio-panel
          data-draft-chest
          className={studioDraftChestShell(sheetEntries.length > 0)}
        >
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 dark:via-amber-300/35 to-transparent" />
          <span className="pointer-events-none absolute left-1.5 top-1.5 h-1 w-1 rounded-full bg-amber-600/25 dark:bg-amber-200/50" />
          <span className="pointer-events-none absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-amber-600/25 dark:bg-amber-200/50" />

          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <TreasureChestMark open={isOpen} count={sheetEntries.length} />
                  <div className="min-w-0 text-left">
                    <CardTitle className="font-headline text-lg uppercase tracking-widest text-amber-700 dark:text-amber-300/95">
                      Draft Chest
                    </CardTitle>
                    <p
                      data-studio-caption
                      className={cn(
                        studioPanelCaption,
                        isOpen ? 'text-[10px] leading-snug' : 'text-[9px] leading-none truncate'
                      )}
                    >
                      {sheetEntries.length > 0
                        ? `${sheetEntries.length} saved · full drafts`
                        : 'Unused drafts stash'}
                    </p>
                  </div>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-amber-700/70 dark:text-amber-200/45" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mx-4 md:mx-6 h-px bg-gradient-to-r from-transparent via-amber-500/30 dark:via-amber-500/35 to-transparent md:mt-0" />
            <CardContent className="p-4 md:p-6 md:pt-4">
              {sheetEntries.length === 0 ? (
                <p className="py-2 text-[10px] font-code leading-relaxed text-muted-foreground">
                  Unused full song drafts from DNA &amp; REMIX land here automatically when you apply a different
                  draft or close the workstation.
                </p>
              ) : (
                <ScrollArea className="h-72 w-full pr-2">
                  <div className="space-y-3">
                    {sheetEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="space-y-2 rounded-lg border border-amber-500/25 bg-background/80 dark:border-amber-500/20 dark:bg-amber-950/20 p-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-300/90">
                              {entry.label}
                            </p>
                            <p className="mt-0.5 text-[8px] font-mono text-muted-foreground">
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
                        <p className="line-clamp-3 text-xs font-code leading-snug text-foreground/85">
                          {entryPreview(entry)}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            className="h-8 gap-1.5 border-primary/25 text-[9px] font-bold uppercase"
                            onClick={() => handleAddToSheet(entry)}
                          >
                            <PlusCircle className="h-3 w-3" /> Add to page
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            className="h-8 gap-1.5 border-amber-500/35 text-[9px] font-bold uppercase text-amber-900 dark:border-amber-500/30 dark:text-amber-200"
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
