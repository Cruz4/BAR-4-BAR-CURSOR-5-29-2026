import assert from 'node:assert/strict';
import { normalizeArtistHomeConfig } from '../src/lib/profile/modules';
import { normalizeSoundIdentity } from '../src/lib/profile/sound-identity';

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

const migrated = normalizeArtistHomeConfig({
  version: 1,
  featured: { tagline: 'Legacy profile' },
});
assert.equal(migrated.version, 2);
assert.equal(migrated.featured.tagline, 'Legacy profile');
assert.equal(migrated.featured.soundIdentity, undefined);

console.log('Profile identity verification passed.');

