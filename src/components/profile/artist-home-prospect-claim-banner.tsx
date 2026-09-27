'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildLoginUrl } from '@/lib/login-links';
import { profileHref } from '@/lib/profile/profile-slug';
import { auth } from '@/lib/firebase/client/firebase';
import {
  readArtistHomeProspectClaim,
} from '@/lib/artist-home-prospect-session';

type ArtistHomeProspectClaimBannerProps = {
  displayName: string;
  slug: string;
  prospectId: string;
  claimSecret?: string;
  signedIn: boolean;
  isOwner: boolean;
};

export function ArtistHomeProspectClaimBanner({
  displayName,
  slug,
  prospectId,
  claimSecret,
  signedIn,
  isOwner,
}: ArtistHomeProspectClaimBannerProps) {
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!signedIn || isOwner) {
      setBlockReason(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const intent = readArtistHomeProspectClaim();
        const secret = claimSecret || intent?.claimSecret;
        const params = new URLSearchParams({ prospectId });
        if (secret) params.set('claim', secret);
        const res = await fetch(`/api/artist-home-prospect/eligibility?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { ok?: boolean; reason?: string };
        if (cancelled) return;
        if (data.ok) {
          setBlockReason(null);
        } else {
          setBlockReason(data.reason || 'This account cannot claim this invite.');
        }
      } catch {
        if (!cancelled) setBlockReason(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, isOwner, prospectId, claimSecret]);

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
            Claim it with a <strong className="font-semibold text-emerald-100">new</strong> AKAsheet account
            using the email on your invite. Once you claim, only you control this profile — our team cannot
            edit your home or posts.
          </p>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-300/70">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Yours forever after claim
          </p>
          {blockReason ? (
            <p className="text-xs font-medium text-amber-200/95">{blockReason}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {signedIn ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/90">
              {checking ? 'Checking account…' : blockReason ? 'Sign out to continue' : 'Finishing claim…'}
            </p>
          ) : (
            <>
              <Button
                size="sm"
                className="h-10 bg-emerald-400 font-bold uppercase text-black hover:bg-emerald-300"
                asChild
              >
                <Link href={signupHref}>New account — claim home</Link>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-emerald-200/90" asChild>
                <Link href={signinHref}>Already signed up? Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
