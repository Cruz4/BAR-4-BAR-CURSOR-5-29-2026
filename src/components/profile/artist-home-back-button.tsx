'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ArtistHomeBackButton({ label = 'Back', profileSlug }: { label?: string; profileSlug?: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 gap-1.5 border-[var(--ph-accent)]/45 bg-[var(--ph-accent)]/12 px-3 text-[11px] font-bold uppercase tracking-widest text-[var(--ph-accent)] shadow-none hover:bg-[var(--ph-accent)]/22 hover:text-[var(--ph-accent)]"
      onClick={() => {
        let sameAppReferrer = false;
        let sameProfileReferrer = false;
        try {
          const referrer = document.referrer ? new URL(document.referrer) : null;
          sameAppReferrer = referrer?.origin === window.location.origin;
          if (sameAppReferrer && profileSlug && referrer) {
            const slug = decodeURIComponent(profileSlug).toLowerCase();
            const path = decodeURIComponent(referrer.pathname).replace(/\/$/, '').toLowerCase();
            sameProfileReferrer = path === `/${slug}` || path.startsWith(`/profile/${slug}/`);
          }
        } catch {
          sameAppReferrer = false;
          sameProfileReferrer = false;
        }
        if (sameProfileReferrer) router.replace('/');
        else if (sameAppReferrer && window.history.length > 1) router.back();
        else router.push('/');
      }}
    >
      <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
