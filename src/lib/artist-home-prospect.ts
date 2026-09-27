/**
 * Marketing Artist Home prospects — pre-built profiles for outreach & claim.
 */

import type { ArtistHomeConfig } from '@/lib/profile/modules';
import type { ProfilePost } from '@/lib/profile/social-client';

export type ArtistHomeProspectStatus =
  | 'draft'
  | 'ready'
  | 'sent'
  | 'claimed'
  | 'archived';

export type ArtistHomeProspectWallPost = Pick<
  ProfilePost,
  'id' | 'text' | 'embedUrl' | 'imageUrl' | 'createdAt'
>;

export type ArtistHomeProspectRecord = {
  id: string;
  viewToken: string;
  slug: string;
  displayName: string;
  status: ArtistHomeProspectStatus;
  /** Lowercase emails allowed to claim (empty = open claim with valid secret). */
  inviteEmails: string[];
  artistHome: ArtistHomeConfig;
  wallPosts: ArtistHomeProspectWallPost[];
  profilePhotoUrl?: string | null;
  profilePhotoMode?: 'collage' | 'custom' | 'initials';
  internalNotes?: string;
  contactLabel?: string;
  createdAt: string;
  updatedAt: string;
  createdByAdminUid?: string;
  publishedAt?: string;
  sentAt?: string;
  claimedAt?: string;
  claimedByUserId?: string;
  viewCount?: number;
  lastViewedAt?: string;
};

export type ArtistHomeProspectAdminRow = Pick<
  ArtistHomeProspectRecord,
  | 'id'
  | 'slug'
  | 'displayName'
  | 'status'
  | 'inviteEmails'
  | 'createdAt'
  | 'updatedAt'
  | 'publishedAt'
  | 'sentAt'
  | 'claimedAt'
  | 'viewCount'
  | 'contactLabel'
>;

export const ARTIST_HOME_PROSPECT_CLAIM_SESSION_KEY = 'b4b-artist-home-prospect-claim';

export type ArtistHomeProspectClaimIntent = {
  prospectId: string;
  slug: string;
  claimSecret?: string;
};
