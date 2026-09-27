'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  clearArtistHomeProspectClaim,
  readArtistHomeProspectClaim,
} from '@/lib/artist-home-prospect-session';
import { auth } from '@/lib/firebase/client/firebase';
import { profileHref } from '@/lib/profile/profile-slug';

export function ArtistHomeProspectClaimBootstrap() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const claimAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    const intent = readArtistHomeProspectClaim();
    if (!intent) return;
    const attemptKey = `${intent.prospectId}:${intent.claimSecret || ''}`;
    if (claimAttemptRef.current === attemptKey) return;

    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const eligParams = new URLSearchParams({ prospectId: intent.prospectId });
        if (intent.claimSecret) eligParams.set('claim', intent.claimSecret);
        const eligRes = await fetch(`/api/artist-home-prospect/eligibility?${eligParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const elig = (await eligRes.json()) as { ok?: boolean; reason?: string };
        if (!elig.ok) {
          toast({
            variant: 'destructive',
            title: 'Cannot claim on this account',
            description: elig.reason || 'Use a new sign-up with your invited email.',
          });
          return;
        }
        claimAttemptRef.current = attemptKey;
        const res = await fetch('/api/artist-home-prospect/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prospectId: intent.prospectId,
            claimSecret: intent.claimSecret,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; slug?: string };
        if (!res.ok) {
          claimAttemptRef.current = null;
          toast({
            variant: 'destructive',
            title: 'Could not claim profile',
            description: data.error || 'Try the link from your invite again.',
          });
          return;
        }
        clearArtistHomeProspectClaim();
        const slug = data.slug || intent.slug;
        toast({
          title: 'Your Artist Home is live',
          description: 'This profile is yours — only your account can change it.',
        });
        if (slug) {
          window.location.href = profileHref(slug) || `/${slug}`;
        }
      } catch {
        clearArtistHomeProspectClaim();
      }
    })();
  }, [loading, user, toast]);

  return null;
}
