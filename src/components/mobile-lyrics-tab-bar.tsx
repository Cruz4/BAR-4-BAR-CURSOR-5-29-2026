'use client';

import { cn } from '@/lib/utils';
import { FileText, LayoutGrid, Sparkles } from 'lucide-react';

export type MobileLyricsTab = 'workstation' | 'lyrics' | 'cowriter';

const TABS: { id: MobileLyricsTab; label: string; shortLabel: string; icon: typeof LayoutGrid }[] = [
  { id: 'workstation', label: 'Workstation', shortLabel: 'Work', icon: LayoutGrid },
  { id: 'lyrics', label: 'Lyrics Sheet', shortLabel: 'Lyrics', icon: FileText },
  { id: 'cowriter', label: 'Co-Writer', shortLabel: 'Co-Write', icon: Sparkles },
];

interface MobileLyricsTabBarProps {
  active: MobileLyricsTab;
  onChange: (tab: MobileLyricsTab) => void;
  /** Keep tabs above guided-tour overlay on phone. */
  tourElevated?: boolean;
}

export function MobileLyricsTabBar({ active, onChange, tourElevated = false }: MobileLyricsTabBarProps) {
  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 pb-[env(safe-area-inset-bottom,0px)]',
        tourElevated ? 'z-[6010] pointer-events-auto shadow-[0_-8px_32px_rgba(0,0,0,0.45)]' : 'z-50'
      )}
      aria-label="Lyrics studio panels"
    >
      <div className="grid grid-cols-3 h-14">
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 transition-colors touch-manipulation',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground active:bg-muted/50'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className="text-[9px] font-bold uppercase tracking-wider leading-none sm:hidden">{shortLabel}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider leading-none hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
