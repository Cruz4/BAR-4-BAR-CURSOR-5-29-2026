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
  const ran = useRef(false);

  useEffect(() => {
    if (loading || !user || ran.current) return;
    const intent = readArtistHomeProspectClaim();
    if (!intent) return;
    ran.current = true;

    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
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
        clearArtistHomeProspectClaim();
        if (!res.ok) {
          toast({
            variant: 'destructive',
            title: 'Could not claim profile',
            description: data.error || 'Try the link from your invite again.',
          });
          return;
        }
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
