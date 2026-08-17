'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { useFoldsFeature } from '@/hooks/use-folds-feature';

export function FoldNavButton() {
  const router = useRouter();
  const { unread } = useFoldInbox();
  const { enabled } = useFoldsFeature();
  if (!enabled) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 shrink-0 text-amber-300 hover:bg-amber-500/10 md:h-9 md:w-9"
          onClick={() => router.push('/folds')}
          aria-label={unread > 0 ? `Folds, ${unread} wet` : 'Folds'}
        >
          <ScrollText className="h-4 w-4 md:h-5 md:w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold leading-none text-black">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Folds</p>
      </TooltipContent>
    </Tooltip>
  );
}
