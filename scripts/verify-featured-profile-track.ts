import assert from 'node:assert/strict';
import {
  artistHomeForPublic,
  normalizeArtistHomeConfig,
} from '../src/lib/profile/modules';

const normalized = normalizeArtistHomeConfig({
  featured: {
    featuredTrack: {
      shareId: 'share-1',
      trackId: 'track-1',
      title: 'A Track',
      artistName: 'An Artist',
      ownerId: 'artist-1',
      durationSec: 80,
      excerptStartSec: 999,
      source: 'purchased',
      previewPath: 'profile-previews/fan-1/share-1/excerpt.wav',
    },
  },
});

assert.equal(normalized.featured.featuredTrack?.excerptStartSec, 50);
assert.equal(normalized.featured.featuredTrack?.source, 'purchased');
assert.equal(
  normalized.featured.featuredTrack?.previewPath,
  'profile-previews/fan-1/share-1/excerpt.wav'
);

const publicConfig = artistHomeForPublic(normalized);
assert.equal(publicConfig.featured.featuredTrack?.previewPath, undefined);
assert.equal(publicConfig.featured.featuredTrack?.shareId, 'share-1');
assert.equal(normalized.featured.featuredTrack?.previewPath?.startsWith('profile-previews/'), true);

const missingIdentity = normalizeArtistHomeConfig({
  featured: { featuredTrack: { shareId: 'share-1', title: 'Incomplete' } },
});
assert.equal(missingIdentity.featured.featuredTrack, undefined);

console.log('featured profile track verification passed');
