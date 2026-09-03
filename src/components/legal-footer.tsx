import Link from 'next/link';
import { SUPPORT_MAILTO } from '@/lib/support';

export function LegalFooter({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Legal and support"
      className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-code ${className}`}
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
      <span className="opacity-50">AKAsheet © 2026</span>
    </nav>
  );
}
