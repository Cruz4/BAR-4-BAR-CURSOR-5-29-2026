import Link from 'next/link';

export function LegalFooter({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-code ${className}`}>
      <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
      <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
      <Link href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
      <span className="opacity-50">Bar 4 Bar Studio © 2026</span>
    </div>
  );
}
