import { orderAlbumTracks } from '@/lib/album-track-order';
import { normalizeDropAudio } from '@/lib/drop-commerce';
import type { DnaDropAlbumPayload, DnaDropTrackPayload } from '@/lib/dna-drop';
import type { DeckPlayable } from '@/lib/drop-library';
import type { DropListenSource } from '@/lib/drop-listen-analytics';
import { pressedSongHref } from '@/lib/pressed-song';

/** Ordered playable tracks for an album release hub or Reverb embed. */
export function buildAlbumReleasePlayables(opts: {
  album: DnaDropAlbumPayload;
  shareId: string;
  ownerId: string;
  ownerName: string;
  houseRelease?: boolean;
  listenSource?: DropListenSource;
}): DeckPlayable[] {
  const {
    album,
    shareId,
    ownerId,
    ownerName,
    houseRelease = false,
    listenSource = 'share',
  } = opts;
  return orderAlbumTracks(album.tracks || [], album)
    .filter((track) => Boolean(normalizeDropAudio(track.dropAudio)))
    .map((track, index) => ({
      key: `${shareId}:${track.id}`,
      shareId,
      trackId: track.id,
      title: track.title || `Track ${index + 1}`,
      artistName: ownerName,
      coverArtUrl: track.coverArtUrl || album.coverArtUrl,
      durationSec: normalizeDropAudio(track.dropAudio)?.durationSec,
      scope: 'album',
      albumTitle: album.title,
      albumId: album.id,
      trackNumber: index + 1,
      detailsHref: pressedSongHref(shareId, { trackId: track.id }),
      purchasedAt: '',
      amountCents: 0,
      free: houseRelease,
      houseRelease,
      ownerId,
      listenSource,
    }));
}

/** Single-track release share (song hub, not album snapshot). */
export function buildSingleTrackReleasePlayable(opts: {
  track: DnaDropTrackPayload;
  shareId: string;
  ownerId: string;
  ownerName: string;
  houseRelease?: boolean;
  listenSource?: DropListenSource;
}): DeckPlayable | null {
  const {
    track,
    shareId,
    ownerId,
    ownerName,
    houseRelease = false,
    listenSource = 'share',
  } = opts;
  if (!normalizeDropAudio(track.dropAudio)) return null;
  return {
    key: `${shareId}:${track.id}`,
    shareId,
    trackId: track.id,
    title: track.title || 'Untitled',
    artistName: ownerName,
    coverArtUrl: track.coverArtUrl,
    durationSec: normalizeDropAudio(track.dropAudio)?.durationSec,
    scope: 'track',
    albumTitle: track.sharedAlbumContext?.title,
    trackNumber: 1,
    detailsHref: pressedSongHref(shareId, { trackId: track.id }),
    purchasedAt: '',
    amountCents: 0,
    free: houseRelease,
    houseRelease,
    ownerId,
    listenSource,
  };
}
