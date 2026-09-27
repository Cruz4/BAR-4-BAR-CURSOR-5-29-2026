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
  profileCollageAlbumIds?: string[];
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  starMarkSlots?: import('@/lib/profile/vesperfold').VesperfoldSlot[];
  starMarkPinnedSlotId?: string | null;
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
  | 'claimedByUserId'
  | 'viewCount'
  | 'contactLabel'
>;

type ProspectDeleteConfirmInput = Pick<
  ArtistHomeProspectRecord,
  'displayName' | 'slug' | 'status' | 'claimedAt' | 'claimedByUserId'
>;

/** Admin confirm copy — claimed deletes are outreach-only (never the artist account). */
export function artistHomeProspectDeleteConfirmMessage(
  prospect: ProspectDeleteConfirmInput
): string {
  const name = prospect.displayName.trim() || 'this artist';
  const slug = prospect.slug.trim() ? `/${prospect.slug.trim()}` : 'their link';
  if (prospect.status === 'claimed') {
    const claimedLine = prospect.claimedAt
      ? `Claimed ${new Date(prospect.claimedAt).toLocaleString()}.`
      : 'This invite was claimed.';
    const uid = prospect.claimedByUserId?.trim();
    return [
      `${name} already claimed this pre-built home.`,
      claimedLine,
      uid ? `Owner account id: ${uid}.` : '',
      '',
      'Delete only removes this row from Artist Home outreach — it does NOT delete their AKAsheet account, vault, or live Artist Home.',
      `Their public home${slug} stays exactly as they have it now.`,
      '',
      'Remove this outreach record from your list?',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    `Delete the outreach entry for ${name}?`,
    prospect.slug.trim()
      ? `Unpublished holds on ${slug} will be released. Published-but-unclaimed previews come offline.`
      : '',
    'This does not affect any real member accounts.',
    '',
    'Continue?',
  ]
    .filter(Boolean)
    .join('\n');
}

export const ARTIST_HOME_PROSPECT_CLAIM_SESSION_KEY = 'b4b-artist-home-prospect-claim';

export type ArtistHomeProspectClaimIntent = {
  prospectId: string;
  slug: string;
  claimSecret?: string;
};
