import type { Album } from '@/lib/types';
import { FREE_ALBUM_LIMIT, FREE_TRACK_LIMIT } from '@/lib/subscription';
import {
  isDowngradedProVault,
  needsFreeEditableTrackPicker,
  type TierUserLike,
} from '@/lib/tier-limits';

export function getVisitorVaultBannerTitle(isDowngraded: boolean): string {
  if (isDowngraded) return 'Your vault is intact';
  return `Visitor Studio · ${FREE_ALBUM_LIMIT} Album · ${FREE_TRACK_LIMIT} Tracks`;
}

export function getVisitorVaultBannerBody(
  user: TierUserLike,
  albums: Album[],
  opts?: { openTrackSlots?: number; hasExtraAlbums?: boolean }
): string {
  const isDowngraded = isDowngradedProVault(user, albums);
  const pickerPending = needsFreeEditableTrackPicker(user, albums);

  if (pickerPending) {
    return 'Your lyrics stay saved. Choose which 2 tracks stay editable — the rest remain view-only until you pick or go Pro.';
  }

  if (isDowngraded) {
    return 'Nothing was deleted — browse every track anytime. Visitor edits 2 at a time; scrap one from Loose Tracks (⋮ menu) to rotate another in. Studio Pro restores unlimited editing, export, and full co-writer workflow.';
  }

  let body =
    'Your lyrics stay saved. Edit up to 2 tracks at a time on the free demo. Hot pink locks are Pro-only tools; fuchsia locks mean this item is view-only on Visitor.';

  if (opts?.hasExtraAlbums) {
    body += ' Older projects stay in the vault as view-only.';
  }

  if (opts?.openTrackSlots === 1) {
    body += ' One free track slot left — Pro is unlimited.';
  } else if (opts?.openTrackSlots === 0 && !isDowngraded) {
    body += ' Both demo slots in use — scrap a track or go Pro to add another.';
  }

  return body;
}

export function getTrackLimitBanner(user: TierUserLike, albums: Album[]): string {
  if (needsFreeEditableTrackPicker(user, albums)) {
    return 'Choose which 2 tracks stay editable on your vault home. Until then, every track is view-only here.';
  }
  if (isDowngradedProVault(user, albums)) {
    return `View-only on Visitor — you can edit ${FREE_TRACK_LIMIT} tracks at a time. Scrap an editable track from Loose Tracks to rotate another in, or go Pro for unlimited editing and export.`;
  }
  return `Visitor demo: ${FREE_TRACK_LIMIT} tracks editable at a time. This one's view-only — go Pro for unlimited editing and export.`;
}

export function getAlbumLimitBanner(user: TierUserLike, albums: Album[]): string {
  if (isDowngradedProVault(user, albums)) {
    return `View-only album on Visitor — lyrics are saved. Go Pro to edit, export, and run the full co-writer workflow.`;
  }
  return `Visitor demo: ${FREE_ALBUM_LIMIT} album editable. This one's view-only — go Pro to edit and export.`;
}
