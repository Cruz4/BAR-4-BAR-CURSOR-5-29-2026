'use client';

import { adminApiFetch } from '@/lib/admin-client';
import type { ArtistHomeProspectRecord } from '@/lib/artist-home-prospect';
import type { ArtistHomeConfig } from '@/lib/profile/modules';
import type { GamificationSummary } from '@/lib/gamification/types';
import type { VesperfoldSlot } from '@/lib/profile/vesperfold';

export type ProspectPressDeskPayload = {
  artistHome: ArtistHomeConfig;
  displayName?: string;
  profilePhotoMode?: 'collage' | 'custom' | 'initials';
  profilePhotoUrl?: string | null;
  profileCollageAlbumIds?: string[] | null;
  starMarkUseStar?: boolean;
  starMarkSeed?: number;
  starMarkSlots?: VesperfoldSlot[] | null;
  starMarkPinnedSlotId?: string | null;
};

export async function fetchProspectPressDesk(
  prospectId: string
): Promise<{ prospect: ArtistHomeProspectRecord; summary: GamificationSummary }> {
  const { DEFAULT_GAMIFICATION_SUMMARY } = await import('@/lib/gamification/types');
  const res = await adminApiFetch(`/api/admin/artist-home-prospects/${prospectId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load prospect');
  const prospect = data.prospect as ArtistHomeProspectRecord;
  const summary: GamificationSummary = {
    ...DEFAULT_GAMIFICATION_SUMMARY,
    profileSlug: prospect.slug,
    publicProfile: false,
    profilePhotoMode: prospect.profilePhotoMode || 'initials',
    profilePhotoUrl: prospect.profilePhotoUrl || undefined,
    profileCollageAlbumIds: prospect.profileCollageAlbumIds || [],
    starMarkUseStar: Boolean(prospect.starMarkUseStar),
    starMarkSeed: prospect.starMarkSeed ?? 0,
    starMarkSlots: prospect.starMarkSlots || [],
    starMarkPinnedSlotId: prospect.starMarkPinnedSlotId || null,
    updatedAt: prospect.updatedAt,
  };
  return { prospect, summary };
}

export async function saveProspectPressDesk(
  prospectId: string,
  payload: ProspectPressDeskPayload
): Promise<ArtistHomeProspectRecord> {
  const res = await adminApiFetch(`/api/admin/artist-home-prospects/${prospectId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Save failed');
  return data.prospect as ArtistHomeProspectRecord;
}
