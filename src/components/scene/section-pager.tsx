'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SectionPager({
  page,
  pageCount,
  total,
  unit,
  onPrev,
  onNext,
  edge = 'bottom',
}: {
  page: number;
  pageCount: number;
  total: number;
  unit: string;
  onPrev: () => void;
  onNext: () => void;
  edge?: 'top' | 'bottom';
}) {
  if (total <= 0 || pageCount <= 1) return null;
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-dashed border-white/10',
        edge === 'top' ? 'mb-4 border-b pb-4' : 'mt-4 border-t pt-4'
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1 border-white/10 bg-black/20 px-2.5 text-[10px] font-bold uppercase tracking-wider"
        disabled={page <= 0}
        onClick={onPrev}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </Button>
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/80">
        {page + 1} / {pageCount}
        <span className="ml-2 font-normal tracking-widest opacity-80">
          · {total} {unit}
        </span>
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1 border-white/10 bg-black/20 px-2.5 text-[10px] font-bold uppercase tracking-wider"
        disabled={page >= pageCount - 1}
        onClick={onNext}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
