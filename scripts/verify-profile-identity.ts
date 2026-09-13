import assert from 'node:assert/strict';
import { normalizeArtistHomeConfig } from '../src/lib/profile/modules';
import {
  normalizeSoundIdentity,
  PUBLIC_GENRE_STYLE_OPTIONS,
  PUBLIC_MOOD_OPTIONS,
} from '../src/lib/profile/sound-identity';
import { discoverySearchHref } from '../src/lib/discovery-search';
import {
  publicMusicMetadataFromTrack,
  publicMusicMetadataSearchText,
} from '../src/lib/music-discovery-metadata';
import {
  isValidProfileSlug,
  legacyProfileAppRedirect,
} from '../src/lib/profile/profile-slug';

const identity = normalizeSoundIdentity({
  kinds: ['music_fan', 'artist', 'music_fan', 'not-a-role'],
  genres: ['Hip-Hop', 'hip-hop', 'R&B', 'Soul', 'Extra'],
  moods: ['Warm', 'Night', 'Focused', 'Raw', 'Hopeful', 'Too many'],
  influences: ['A', 'B', 'C', 'D', 'E', 'F'],
  region: '  Brooklyn   /   Atlanta  ',
  collaboration: 'open',
  currentFocus: '  Finding independent records and finishing an EP.  ',
});

assert.deepEqual(identity?.kinds, ['music_fan', 'artist']);
assert.deepEqual(identity?.genres, ['Hip-Hop', 'R&B', 'Soul']);
assert.equal(identity?.moods?.length, 5);
assert.equal(identity?.influences?.length, 5);
assert.equal(identity?.region, 'Brooklyn / Atlanta');
assert.equal(PUBLIC_GENRE_STYLE_OPTIONS.includes('Fog Music'), true);
assert.equal(PUBLIC_MOOD_OPTIONS.includes('Melodic'), true);
assert.equal(
  discoverySearchHref({ resultKinds: ['person'], genre: 'Fog Music' }),
  '/discover?types=person&genre=Fog+Music'
);

const trackMetadata = publicMusicMetadataFromTrack({
  vibe: {
    enabled: true,
    genre: 'Fog Music',
    feeling: ['Melodic', 'Nocturnal'],
    tempoBPM: 88,
    instrumentation: 'Granular choir, muted drums',
  },
  sharedAlbumContext: { title: 'Mirror', shareId: 'MIRROR-DNA' },
  specialInstructions: 'Private workstation direction',
});
assert.deepEqual(trackMetadata.genreStyles, ['Fog Music']);
assert.deepEqual(trackMetadata.moods, ['Melodic', 'Nocturnal']);
assert.equal(trackMetadata.bpm, 88);
assert.match(publicMusicMetadataSearchText(trackMetadata), /Fog Music Melodic Nocturnal 88 BPM/);
assert.doesNotMatch(publicMusicMetadataSearchText(trackMetadata), /Private workstation direction/);

const houseMetadata = publicMusicMetadataFromTrack({
  vibe: { enabled: false, genre: 'General', feeling: [] },
  releaseDiscovery: { genres: ['Fog Music', 'Melodic Rap'], moods: ['Melodic', 'Night'] },
});
assert.deepEqual(houseMetadata.genreStyles, ['Fog Music', 'Melodic Rap']);
assert.deepEqual(houseMetadata.moods, ['Melodic', 'Night']);

const migrated = normalizeArtistHomeConfig({
  version: 1,
  featured: { tagline: 'Legacy profile' },
});
assert.equal(migrated.version, 2);
assert.equal(migrated.featured.tagline, 'Legacy profile');
assert.equal(migrated.featured.soundIdentity, undefined);

assert.equal(legacyProfileAppRedirect('insights'), '/insights');
assert.equal(legacyProfileAppRedirect('SUPPORTERS'), '/supporters');
assert.equal(legacyProfileAppRedirect('real_music_fan'), undefined);
assert.equal(isValidProfileSlug('insights'), false, 'app pages must never be claimable profile slugs');
assert.equal(isValidProfileSlug('supporters'), false, 'app pages must never be claimable profile slugs');
assert.equal(isValidProfileSlug('p'), false, 'public post route must never be claimable as a profile slug');
assert.equal(isValidProfileSlug('charts'), false, 'music chart route must never be claimable as a profile slug');

console.log('Profile identity verification passed.');
