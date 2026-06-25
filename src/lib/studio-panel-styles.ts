import { cn } from '@/lib/utils';

type StudioAccent = 'indigo' | 'amber' | 'yellow' | 'sky' | 'emerald' | 'fuchsia' | 'muted';

/**
 * Tinted workstation panels — same border/tint opacity in light & dark.
 * Light uses bg-card + accent wash; dark keeps existing special surfaces where noted.
 */
export function studioAccentPanel(accent: StudioAccent, extra?: string) {
  const shells: Record<StudioAccent, string> = {
    indigo: 'border-indigo-500/40 bg-indigo-500/12 dark:border-indigo-500/30 dark:bg-indigo-500/5',
    amber: 'border-amber-500/45 bg-amber-500/14 dark:border-amber-500/30 dark:bg-amber-500/5',
    yellow: 'border-yellow-500/35 bg-yellow-500/12 dark:border-yellow-500/20 dark:bg-[#1a1a14]',
    sky: 'border-sky-500/40 bg-sky-500/12 dark:border-sky-500/30 dark:bg-sky-500/5',
    emerald: 'border-emerald-500/40 bg-emerald-500/12 dark:border-emerald-500/30 dark:bg-emerald-500/5',
    fuchsia: 'border-fuchsia-500/40 bg-fuchsia-500/12 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/5',
    muted: 'border-border/50 bg-muted/40',
  };
  return cn('shadow-sm overflow-hidden', shells[accent], extra);
}

/** Draft chest — dark treasure gradient; light uses the same tint shell as other panels. */
export function studioDraftChestShell(hasEntries: boolean) {
  return cn(
    'relative overflow-hidden shadow-sm',
    'border-amber-500/30 bg-amber-500/5',
    'dark:border-amber-700/45 dark:bg-gradient-to-b dark:from-amber-950/55 dark:via-[#120d08]/90 dark:to-amber-950/25',
    'dark:shadow-[inset_0_1px_0_rgba(251,191,36,0.18),0_4px_14px_rgba(0,0,0,0.22)]',
    hasEntries && 'border-amber-500/45 dark:border-amber-500/55'
  );
}

export const studioPanelCaption = cn(
  'font-code font-bold uppercase tracking-wider text-foreground/85',
  'data-studio-caption'
);

export const studioPanelLabel = cn(
  'text-[11px] font-bold uppercase text-foreground/90',
  'data-studio-label'
);

export const studioPanelField = 'bg-background border-border/60 text-foreground placeholder:text-muted-foreground';

export const studioPanelInner = 'rounded-lg border border-border/50 bg-background p-3';

/** Generation Workstation — dark look preserved via `dark:`; light uses theme tokens. */
export const workstationDialogOverlay =
  'bg-background/85 backdrop-blur-sm dark:bg-[hsl(216_50%_4%/0.98)]';

export const workstationDialogShell =
  'bg-background border-2 border-border dark:bg-[hsl(216_48%_7%)] dark:border-white/10';

export const workstationDialogHeader =
  'border-b border-border bg-card/95 dark:border-white/10 dark:bg-[hsl(216_48%_8%/0.95)]';

export const workstationGeneratingFooter =
  'border-t border-border bg-card/95 backdrop-blur-sm dark:border-white/10 dark:bg-[hsl(216_48%_6%/0.95)]';

export const workstationGeneratingStatus =
  'text-muted-foreground dark:text-white/70';

export const workstationHeroTitle =
  'font-headline font-bold uppercase text-foreground dark:text-white';

export const workstationModeCard =
  'bg-card/95 border-2 border-border shadow-sm dark:bg-black/45';

export const workstationInsetPanel =
  'border border-border bg-muted/40 dark:border-white/10 dark:bg-black/40';

export const workstationInsetPanelStrong =
  'border-border bg-muted/50 dark:bg-black/50 dark:border-white/10';

export const workstationOnPanelText =
  'text-foreground/90 dark:text-white/90';

export const workstationOnPanelMuted =
  'text-muted-foreground dark:text-white/50';

export const workstationOnPanelSubtle =
  'text-muted-foreground/80 dark:text-white/40';

export const workstationBorderSubtle =
  'border-border dark:border-white/5';

export const workstationBorderPanel =
  'border-border dark:border-white/10';

export const workstationTabsList =
  'bg-muted/60 border-border dark:bg-white/5 dark:border-white/10';

export const workstationRowInset =
  'bg-muted/50 border-border dark:bg-white/5 dark:border-white/5';

export const workstationCardInset =
  'bg-card/90 border-border dark:bg-background/40 dark:border-white/5';

/** Vault / album detail panels — light tokens; dark preserves glass look. */
export const studioVaultCard =
  'rounded-2xl border-border bg-card/95 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40';

export const studioVaultCardTitle =
  'font-headline uppercase tracking-tight text-foreground dark:text-white';

export const studioVaultMetricCell =
  'rounded-xl border border-border bg-muted/40 p-3 text-center dark:border-white/10 dark:bg-black/30';

export const studioVaultRowButton =
  'rounded-xl border border-border bg-muted/30 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]';

export const studioVaultTrackCard =
  'rounded-2xl border border-border bg-card/90 p-5 dark:border-white/10 dark:bg-gradient-to-br dark:from-black/60 dark:via-black/40 dark:to-primary/[0.06]';
