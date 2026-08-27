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
const feedPlayer = readFileSync(
  new URL('../src/components/profile/embed-player.tsx', import.meta.url),
  'utf8'
);
const miniPlayer = readFileSync(
  new URL('../src/components/top-nav-drop-mini-player.tsx', import.meta.url),
  'utf8'
);

assert.match(profileClient, /cache:\s*'no-store'/, 'public profiles must refresh past router cache');
assert.match(profileClient, /RELEASE_VISIBILITY_CHANGED_EVENT/, 'mounted profiles must refresh after release changes');
assert.match(releaseClient, /dispatchEvent\(new CustomEvent\(RELEASE_VISIBILITY_CHANGED_EVENT/, 'release changes must notify mounted profile views');
assert.match(listenPanel, /staleFeaturedSelection[\s\S]*?!staleFeaturedSelection/, 'an offline featured selection must disappear without a destructive toast');
assert.match(listenPanel, /aria-label="Song playback position"/, 'release players must expose a seekable playback timeline');
assert.match(listenPanel, /formatPlaybackTime\(displayedPositionSec\)[\s\S]*formatPlaybackTime\(displayedDurationSec\)/, 'the timeline must show elapsed and total time');
assert.match(listenPanel, /<AudioVolumeControl[\s\S]*?compact/, 'volume must use a compact control instead of occupying the playback timeline');
assert.doesNotMatch(listenPanel, /ml-\[52px\] w-\[calc\(100%-52px\)\]/, 'the old stretched volume bar must stay removed');
assert.match(
  gamification,
  /!linkedShare \|\| !shareDocumentVisibility\(linkedShare\.data\(\)[\s\S]*?\)\.dnaLive/,
  'missing or offline linked tracks must not be restored as ghost DNA entries from an album snapshot',
);
assert.match(gamification, /'featured\.featuredTrack': FieldValue\.delete\(\)/, 'stale canonical featured selections must self-heal');
assert.match(feedPlayer, /song\?\.releaseLive \|\| song\?\.viewer\?\.owns/, 'buyers must retain playback from historical offline release posts');
assert.match(feedPlayer, /Play from \$\{song\?\.currentRelease\?\.albumTitle\}/, 'an offline single post must link to its current album-track release');
assert.match(miniPlayer, /aria-label="Close mini player"/, 'the persistent mini player must be closable');
assert.match(miniPlayer, /aria-label="Mini player playback position"/, 'the persistent mini player must expose a seek bar');

console.log('featured profile track verification passed');
