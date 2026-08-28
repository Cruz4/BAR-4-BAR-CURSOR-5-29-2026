import assert from 'node:assert/strict';
import {
  compareDropInsightAttention,
  dropInsightReleaseSubtitle,
  linkDropInsightAlbumNesting,
  partitionDropInsightReleases,
  type DropInsightTrack,
} from '../src/lib/drop-insights';

function metrics(partial: Partial<DropInsightTrack> & Pick<DropInsightTrack, 'shareId' | 'title' | 'kind'>): DropInsightTrack {
  return {
    lifetimePreviewStarts: 0,
    lifetimeFullStarts: 0,
    lifetimePurchases: 0,
    qualifiedListeners: 0,
    repeatListeners: 0,
    completions: 0,
    purchases: 0,
    ...partial,
  };
}

const nest = linkDropInsightAlbumNesting([
  {
    shareId: 'album-1',
    type: 'album',
    title: 'Night Drive',
    nestedTracks: [
      { shareId: 'track-a', title: 'Neon', trackIndex: 0 },
      { shareId: 'track-b', title: 'Fog', trackIndex: 1 },
    ],
  },
  { shareId: 'track-a', type: 'track', title: 'Neon (old title)' },
  { shareId: 'track-solo', type: 'track', title: 'Solo Hit' },
]);

assert.equal(nest.get('album-1')?.kind, 'album');
assert.equal(nest.get('album-1')?.trackCount, 2);
assert.equal(nest.get('track-a')?.kind, 'song');
assert.equal(nest.get('track-a')?.albumShareId, 'album-1');
assert.equal(nest.get('track-a')?.albumTitle, 'Night Drive');
assert.equal(nest.get('track-a')?.title, 'Neon');
assert.equal(nest.get('track-solo')?.kind, 'song');
assert.equal(nest.get('track-solo')?.albumShareId, undefined);

const mixed: DropInsightTrack[] = [
  metrics({
    shareId: 'album-1',
    title: 'Night Drive',
    kind: 'album',
    trackCount: 2,
    qualifiedListeners: 50,
    lifetimePurchases: 4,
  }),
  metrics({
    shareId: 'track-a',
    title: 'Neon',
    kind: 'song',
    albumShareId: 'album-1',
    albumTitle: 'Night Drive',
    qualifiedListeners: 12,
    lifetimeFullStarts: 20,
  }),
  metrics({
    shareId: 'track-solo',
    title: 'Solo Hit',
    kind: 'song',
    qualifiedListeners: 40,
    lifetimePurchases: 2,
  }),
  metrics({
    shareId: 'track-b',
    title: 'Fog',
    kind: 'song',
    albumShareId: 'album-1',
    albumTitle: 'Night Drive',
    qualifiedListeners: 8,
  }),
];

const { tracks, albums } = partitionDropInsightReleases(mixed, { songs: 12, albums: 8 });

assert.equal(albums.length, 1);
assert.equal(albums[0]?.shareId, 'album-1');
assert.ok(tracks.every((row) => row.kind === 'song'));
assert.ok(!tracks.some((row) => row.shareId === 'album-1'));
assert.equal(tracks[0]?.shareId, 'track-solo');
assert.ok(tracks.some((row) => row.albumShareId === 'album-1'));

assert.equal(dropInsightReleaseSubtitle(albums[0]!), 'Album · 2 tracks');
assert.equal(dropInsightReleaseSubtitle(tracks.find((t) => t.shareId === 'track-a')!), 'From Night Drive');
assert.equal(dropInsightReleaseSubtitle(tracks.find((t) => t.shareId === 'track-solo')!), 'Single');

assert.ok(
  compareDropInsightAttention(
    metrics({ shareId: 'a', title: 'a', kind: 'song', lifetimePurchases: 20 }),
    metrics({ shareId: 'b', title: 'b', kind: 'song', qualifiedListeners: 10 })
  ) < 0
);

console.log('verify-drop-insights: ok');
