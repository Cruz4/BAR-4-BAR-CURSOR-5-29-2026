import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

const profileClient = readFileSync(
  new URL('../src/components/profile/public-profile-page-client.tsx', import.meta.url),
  'utf8'
);
const listenPanel = readFileSync(
  new URL('../src/components/drop-listen-panel.tsx', import.meta.url),
  'utf8'
);
const gamification = readFileSync(
  new URL('../src/lib/server/gamification.ts', import.meta.url),
  'utf8'
);
const releaseClient = readFileSync(
  new URL('../src/lib/release-management-client.ts', import.meta.url),
  'utf8'
);

assert.match(profileClient, /cache:\s*'no-store'/, 'public profiles must refresh past router cache');
assert.match(profileClient, /RELEASE_VISIBILITY_CHANGED_EVENT/, 'mounted profiles must refresh after release changes');
assert.match(releaseClient, /dispatchEvent\(new CustomEvent\(RELEASE_VISIBILITY_CHANGED_EVENT/, 'release changes must notify mounted profile views');
assert.match(listenPanel, /staleFeaturedSelection[\s\S]*?!staleFeaturedSelection/, 'an offline featured selection must disappear without a destructive toast');
assert.match(gamification, /linkedShare && !isShareDocumentPublic/, 'offline linked tracks must not be restored from an album snapshot');
assert.match(gamification, /'featured\.featuredTrack': FieldValue\.delete\(\)/, 'stale canonical featured selections must self-heal');

console.log('featured profile track verification passed');
