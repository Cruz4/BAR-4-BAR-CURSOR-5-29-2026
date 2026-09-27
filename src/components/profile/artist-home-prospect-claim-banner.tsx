'use client';

import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildLoginUrl } from '@/lib/login-links';
import { profileHref } from '@/lib/profile/profile-slug';

type ArtistHomeProspectClaimBannerProps = {
  displayName: string;
  slug: string;
  signedIn: boolean;
  isOwner: boolean;
};

export function ArtistHomeProspectClaimBanner({
  displayName,
  slug,
  signedIn,
  isOwner,
}: ArtistHomeProspectClaimBannerProps) {
  if (isOwner) return null;

  const next = profileHref(slug) || `/${slug}`;
  const signupHref = buildLoginUrl({
    mode: 'signup',
    next,
    intent: 'claim_artist_home',
  });
  const signinHref = buildLoginUrl({ next, intent: 'claim_artist_home' });

  return (
    <div
      className="relative z-30 mx-auto mb-6 max-w-3xl rounded-2xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-4 shadow-[0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-md sm:px-6"
      role="region"
      aria-label="Claim your Artist Home"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5 text-left">
          <p className="flex items-center gap-2 font-headline text-sm font-black uppercase tracking-wide text-emerald-200">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            We started this home for {displayName}
          </p>
          <p className="text-xs leading-relaxed text-emerald-100/80">
            Claim it with your email to make it live. Once you claim, only you control this profile —
            our team cannot edit your home or posts.
          </p>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-300/70">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Yours forever after claim
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {signedIn ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/90">
              Finishing claim…
            </p>
          ) : (
            <>
              <Button
                size="sm"
                className="h-10 bg-emerald-400 font-bold uppercase text-black hover:bg-emerald-300"
                asChild
              >
                <Link href={signupHref}>Claim &amp; sign up</Link>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-emerald-200/90" asChild>
                <Link href={signinHref}>Already have an account?</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
