import assert from 'node:assert/strict';
import {
  groupVaultReleases,
  isShareDocumentPublic,
  releaseShareIdOf,
  releaseStatusOf,
} from '../src/lib/release-management';
import type { Album, Track } from '../src/lib/types';

const audio = {
  storagePath: 'drops/u/t/full.mp3',
  previewPath: 'drops/u/t/preview.wav',
  contentType: 'audio/mpeg',
  uploadedAt: new Date(0).toISOString(),
};
const price = { mode: 'fixed' as const, amountCents: 199 };
const baseTrack: Track = {
  id: 't', albumId: 'a', ownerId: 'u', title: 'Audio only',
  vibe: { genre: 'General', tempoBPM: 90, feeling: [] }, intentRefs: [], sections: [],
  status: 'in_progress', createdAt: new Date(0).toISOString(), dropAudio: audio, dropPrice: price,
};

assert.equal(releaseShareIdOf({ ...baseTrack, shareId: 'LEGACY' }), 'LEGACY');
assert.equal(releaseStatusOf({ ...baseTrack, shareId: 'LEGACY' }), 'live');
assert.equal(releaseShareIdOf({ shareId: 'DNA-ONLY' }), undefined);
assert.equal(isShareDocumentPublic({ releaseStatus: 'unlisted', hasDropAudio: true, data: { dropAudio: audio } }), false);
assert.equal(isShareDocumentPublic({ data: { dropAudio: audio, dropPrice: price } }), true);
assert.equal(isShareDocumentPublic({ releaseStatus: 'live', dnaStatus: 'unlisted', data: { dropAudio: audio } }), true);
assert.equal(isShareDocumentPublic({ dnaStatus: 'unlisted', data: {} }), false);

const album: Album = {
  id: 'a', ownerId: 'u', title: 'Release', theme: '', createdAt: new Date(0).toISOString(),
  tracks: [baseTrack], releaseStatus: 'draft',
};
const draftGroups = groupVaultReleases([album]);
assert.equal(draftGroups.privateDrafts.some((row) => row.track?.id === 't'), true);

const liveAlbum = { ...album, releaseShareId: 'ALBUM', releaseStatus: 'live' as const, dropPrice: price };
const liveGroups = groupVaultReleases([liveAlbum]);
assert.equal(liveGroups.liveAlbumsAudioOnly.length, 1);
assert.equal(liveGroups.privateDrafts.some((row) => row.track?.id === 't'), false);

console.log('Release management verification passed.');
