'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SectionPager({
  page,
  pageCount,
  total,
  unit,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  unit: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total <= 0 || pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-white/10 pt-4">
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
