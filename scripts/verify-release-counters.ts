import assert from 'node:assert/strict';
import {
  countAlbums,
  countLyricPreviews,
  countPlayableSongs,
  countReleaseDiscovery,
  countReleaseEntities,
  normalizeReleaseDiscoveryMetadata,
  type ReleaseDiscoveryRow,
} from '../src/lib/release-discovery';

const rows: ReleaseDiscoveryRow[] = [
  { shareId: 'album-1', type: 'album', releaseLive: true, hasDropAudio: false, dnaLive: true },
  {
    shareId: 'track-nested-1',
    type: 'track',
    albumShareId: 'album-1',
    releaseLive: true,
    hasDropAudio: true,
    dnaLive: true,
  },
  {
    shareId: 'track-nested-2',
    type: 'track',
    albumShareId: 'album-1',
    releaseLive: true,
    hasDropAudio: true,
  },
  {
    shareId: 'single-1',
    type: 'track',
    releaseLive: true,
    hasDropAudio: true,
  },
  {
    shareId: 'lyric-1',
    type: 'track',
    dnaLive: true,
    hasDropAudio: false,
    releaseLive: false,
  },
  {
    shareId: 'album-lyric',
    type: 'album',
    dnaLive: true,
    releaseLive: false,
    hasDropAudio: false,
  },
];

assert.equal(countReleaseEntities(rows), 2, 'album + standalone single; nested tracks excluded');
assert.equal(countAlbums(rows), 1, 'one live album release');
assert.equal(countPlayableSongs(rows), 3, 'nested tracks + standalone single with audio');
assert.equal(countLyricPreviews(rows), 2, 'lyric track + lyric album DNA');

const bundled = countReleaseDiscovery(rows);
assert.deepEqual(bundled, {
  releases: 2,
  albums: 1,
  playableSongs: 3,
  lyricPreviews: 2,
});

const meta = normalizeReleaseDiscoveryMetadata({
  format: 'EP',
  date: ' 2026-08-01 ',
  genres: ['Hip-Hop', 'hip-hop', 'R&B'],
  moods: ['Moody'],
  language: 'en',
  explicit: true,
  credits: [{ name: 'Jay', role: 'Producer' }, { name: '' }, 'Solo'],
});
assert.equal(meta.format, 'ep');
assert.equal(meta.date, '2026-08-01');
assert.deepEqual(meta.genres, ['Hip-Hop', 'R&B']);
assert.deepEqual(meta.moods, ['Moody']);
assert.equal(meta.language, 'en');
assert.equal(meta.explicit, true);
assert.deepEqual(meta.credits, [
  { name: 'Jay', role: 'Producer' },
  { name: 'Solo' },
]);

assert.deepEqual(normalizeReleaseDiscoveryMetadata(null), {});
assert.deepEqual(normalizeReleaseDiscoveryMetadata({ format: 'nope' }), {});

console.log('Release counters verification passed.');
