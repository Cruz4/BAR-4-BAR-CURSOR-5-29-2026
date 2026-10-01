'use client';

/**
 * After **new signup** from the Pressing playground, apply the guest draft to
 * Artist Home. Returning users who only Sign in keep their existing profile —
 * sandbox drafts are discarded with no “claimed / saved” toast.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  claimGuestPressingDraft,
  claimableWallPosts,
  completeGuestPressingClaim,
  discardGuestPressingDraft,
  readGuestPressingDraft,
} from '@/lib/guest-pressing-session';
import {
  fetchArtistHomeConfig,
  fetchArtistHomePersisted,
  saveArtistHomeConfigClient,
} from '@/lib/profile/artist-home-client';
import { createPost } from '@/lib/profile/social-client';
import { patchGamificationSettings } from '@/lib/gamification-client';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/client/firebase';

/** Accounts older than this are treated as returning sign-ins (not claim). */
const NEW_ACCOUNT_CLAIM_WINDOW_MS = 30 * 60 * 1000;

function isBrandNewAccount(): boolean {
  const createdRaw = auth.currentUser?.metadata?.creationTime;
  if (!createdRaw) return false;
  const createdAt = Date.parse(createdRaw);
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt < NEW_ACCOUNT_CLAIM_WINDOW_MS;
}

export function GuestPressingClaimBootstrap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    if (!readGuestPressingDraft()) return;
    ran.current = true;

    void (async () => {
      // Returning sign-in: keep saved Artist Home; drop sandbox draft quietly.
      let alreadyHasProfile = false;
      try {
        alreadyHasProfile = await fetchArtistHomePersisted();
      } catch {
        /* fall through to account-age check */
      }
      if (alreadyHasProfile || !isBrandNewAccount()) {
        discardGuestPressingDraft();
        return;
      }

      const draft = claimGuestPressingDraft();
      if (!draft) return;

      try {
        const name = draft.displayName.trim();
        if (name && name !== 'Your Name' && auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, { displayName: name });
          } catch {
            /* ignore */
          }
          try {
            await patchGamificationSettings({ displayName: name });
          } catch {
            /* ignore */
          }
        }

        const config = await fetchArtistHomeConfig();
        config.theme = {
          ...config.theme,
          seedText: draft.seedText,
          faders: { ...draft.faders },
          alive: draft.alive,
          autoDrift: draft.autoDrift,
        };
        if (draft.tagline?.trim()) {
          config.featured = {
            ...config.featured,
            tagline: draft.tagline.trim().slice(0, 120),
          };
        }
        if (draft.barOfWeek?.trim()) {
          config.featured = {
            ...config.featured,
            barOfWeek: draft.barOfWeek.trim().slice(0, 280),
          };
        }
        if (draft.moduleSizes && Object.keys(draft.moduleSizes).length > 0) {
          config.modules = config.modules.map((m) => {
            const size = draft.moduleSizes[m.id];
            return size === 'S' || size === 'M' || size === 'L' ? { ...m, size } : m;
          });
        }
        await saveArtistHomeConfigClient(config);

        try {
          const profilePatch: Parameters<typeof patchGamificationSettings>[0] = {};
          if (draft.profilePhotoMode === 'custom' && draft.profilePhotoDataUrl?.trim()) {
            profilePatch.profilePhotoMode = 'custom';
            profilePatch.profilePhotoUrl = draft.profilePhotoDataUrl.trim();
          } else {
            profilePatch.profilePhotoMode = 'initials';
            profilePatch.profilePhotoUrl = null;
          }
          if (draft.starMarkUseStar) {
            profilePatch.starMarkUseStar = true;
            profilePatch.starMarkSeed = normalizeVesperfoldSeed(draft.starMarkSeed ?? 0);
          }
          await patchGamificationSettings(profilePatch);
        } catch {
          /* photo / star optional — pressing still claimed */
        }

        const wallPosts = claimableWallPosts(draft);
        const ownerName =
          (name && name !== 'Your Name' ? name : user.displayName) || 'Artist';
        let posted = 0;
        let ownerSlug: string | undefined;
        try {
          const { fetchGamificationSummary } = await import('@/lib/gamification-client');
          const summary = await fetchGamificationSummary(user.id);
          ownerSlug = summary?.profileSlug || undefined;
        } catch {
          /* optional */
        }
        for (const entry of wallPosts) {
          try {
            await createPost({
              text: entry.text,
              ...(entry.embedUrl ? { embedUrl: entry.embedUrl } : {}),
              ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
              ownerName,
              ...(ownerSlug ? { ownerSlug } : {}),
            });
            posted += 1;
          } catch {
            /* continue — keep other posts */
          }
        }

        completeGuestPressingClaim();
        toast({
          title: 'Artist Home claimed',
          description:
            posted > 0
              ? `Pressing is live and ${posted} wall post${posted === 1 ? '' : 's'} saved. Edit anytime from Press Desk.`
              : 'Your Pressing draft is live on your page. Edit more anytime from Press Desk.',
        });
      } catch {
        completeGuestPressingClaim();
      }
    })();
  }, [user, toast]);

  return null;
}
