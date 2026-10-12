import Link from 'next/link';
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

/** Feed footer — legal + optional tip link; not artist home. */
export function AppFeedChrome({
  className,
  showTipJar = true,
  promoLink,
}: {
  className?: string;
  showTipJar?: boolean;
  promoLink?: { href: string; label: string };
}) {
  return (
    <div className={cn('mt-10 border-t border-white/10 pt-8', className)}>
      <SiteLegalFooter showTipJar={showTipJar} promoLink={promoLink} />
    </div>
  );
}

export function SiteLegalFooter({
  className,
  showTipJar = true,
  promoLink,
}: {
  className?: string;
  showTipJar?: boolean;
  promoLink?: { href: string; label: string };
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <nav
        aria-label="Legal and support"
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-code"
      >
        <a href={SUPPORT_MAILTO} className="hover:text-primary transition-colors">
          Contact Us / Support
        </a>
        {showTipJar ? (
          <a
            href={BUY_ME_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-normal normal-case tracking-normal opacity-70 hover:text-primary hover:opacity-100 transition-colors"
          >
            Tip jar
          </a>
        ) : null}
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
      {promoLink ? (
        <p className="text-center">
          <Link
            href={promoLink.href}
            className="text-[10px] font-code font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
          >
            {promoLink.label}
          </Link>
        </p>
      ) : null}
      <CommodiousWorksFooter />
    </div>
  );
}
