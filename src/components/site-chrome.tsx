import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { BUY_ME_COFFEE_URL, SUPPORT_MAILTO } from '@/lib/support';
import { cn } from '@/lib/utils';

export function CommodiousWorksFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'space-y-1 text-center text-[10px] font-code leading-relaxed text-muted-foreground',
        className
      )}
    >
      <p>AKAsheet is operated by Commodious Works LLC.</p>
      <p className="opacity-80">© 2026 Commodious Works LLC. All rights reserved.</p>
    </footer>
  );
}

export function SupportCoffeeStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left',
        className
      )}
    >
      <p className="text-[11px] leading-snug text-foreground/85">
        <span className="font-bold text-amber-200/90">Help keep AKAsheet free</span>
        <span className="text-muted-foreground"> — tips fuel ink, hosting, and the Scene.</span>
      </p>
      <a
        href={BUY_ME_COFFEE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-100 transition-colors hover:border-amber-300/60 hover:bg-amber-500/25"
      >
        <Coffee className="h-3.5 w-3.5" aria-hidden />
        Buy me a coffee
      </a>
    </div>
  );
}

/** Legal links + Commodious Works operator line. */
/** Support strip + legal — feed, Scene, discover, vault; not artist home. */
export function AppFeedChrome({ className }: { className?: string }) {
  return (
    <div className={cn('mt-10 space-y-6 border-t border-white/10 pt-8', className)}>
      <SupportCoffeeStrip />
      <SiteLegalFooter />
    </div>
  );
}

export function SiteLegalFooter({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <nav
        aria-label="Legal and support"
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-code"
      >
        <a href={SUPPORT_MAILTO} className="hover:text-primary transition-colors">
          Contact Us / Support
        </a>
        <Link href="/terms" className="hover:text-primary transition-colors">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:text-primary transition-colors">
          Privacy Policy
        </Link>
        <Link href="/cookies" className="hover:text-primary transition-colors">
          Cookie Policy
        </Link>
      </nav>
      <CommodiousWorksFooter />
    </div>
  );
}
