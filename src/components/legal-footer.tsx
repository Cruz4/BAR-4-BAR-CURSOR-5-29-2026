import { SiteLegalFooter } from '@/components/site-chrome';

/** Legal links + Commodious Works operator line. */
export function LegalFooter({ className = '' }: { className?: string }) {
  return <SiteLegalFooter className={className} />;
}
