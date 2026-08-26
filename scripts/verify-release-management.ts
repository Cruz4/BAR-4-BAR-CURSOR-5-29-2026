import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  groupVaultReleases,
  isHouseReleaseDocument,
  isShareDocumentPublic,
  releaseShareIdOf,
  releaseStatusOf,
} from '../src/lib/release-management';
import type { Album, Track } from '../src/lib/types';
import { flattenLibraryItems } from '../src/lib/drop-library';
import { hasLiveFirstDrop } from '../src/lib/track-live-flags';
import { publicDropAudio } from '../src/lib/drop-commerce';

const audio = {
  storagePath: 'drops/u/t/full.mp3',
  previewPath: 'drops/u/t/preview.wav',
  contentType: 'audio/mpeg',
  uploadedAt: new Date(0).toISOString(),
};
const price = { mode: 'fixed' as const, amountCents: 199 };
assert.equal(publicDropAudio(audio)?.storagePath, 'private', 'public snapshots must not expose Firebase Storage paths');
const baseTrack: Track = {
  id: 't', albumId: 'a', ownerId: 'u', title: 'Audio only',
  vibe: { genre: 'General', tempoBPM: 90, feeling: [] }, intentRefs: [], sections: [],
  status: 'in_progress', createdAt: new Date(0).toISOString(), dropAudio: audio, dropPrice: price,
};

assert.equal(releaseShareIdOf({ ...baseTrack, shareId: 'LEGACY' }), 'LEGACY');
assert.equal(releaseStatusOf({ ...baseTrack, shareId: 'LEGACY' }), 'live');
assert.equal(releaseShareIdOf({ shareId: 'DNA-ONLY' }), undefined);
assert.equal(
  hasLiveFirstDrop({ ...baseTrack, shareId: 'DNA-LYRICS', releaseShareId: 'MUSIC-RELEASE', releaseStatus: 'live' }),
  true,
  'a live music release must not depend on sharing the DNA lyric-page id'
);
assert.equal(
  hasLiveFirstDrop({ ...baseTrack, shareId: 'DNA-LYRICS', releaseShareId: 'MUSIC-RELEASE', releaseStatus: 'unlisted' }),
  false,
  'offline releases must not show the live release indicator'
);
assert.equal(isShareDocumentPublic({ releaseStatus: 'unlisted', hasDropAudio: true, data: { dropAudio: audio } }), false);
assert.equal(isShareDocumentPublic({ data: { dropAudio: audio, dropPrice: price } }), true);
assert.equal(isShareDocumentPublic({ releaseStatus: 'live', dnaStatus: 'unlisted', data: { dropAudio: audio } }), true);
assert.equal(isShareDocumentPublic({ dnaStatus: 'unlisted', data: {} }), false);
assert.equal(isHouseReleaseDocument({ houseRelease: true, data: {} }), true);
assert.equal(isHouseReleaseDocument({ data: { houseRelease: true } }), false);

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

const houseDeck = flattenLibraryItems([{
  shareId: 'HOUSE', ownerId: 'admin', scope: 'track', projectId: 't', title: 'House song',
  trackIds: ['t'], amountCents: 0, purchasedAt: new Date(0).toISOString(),
  free: true, houseRelease: true, houseLibraryNotice: true, houseLibraryNoticeAt: new Date(0).toISOString(),
}]);
assert.equal(houseDeck[0]?.houseRelease, true);
assert.equal(houseDeck[0]?.free, true);
assert.equal(houseDeck[0]?.houseLibraryNotice, true);

const manageRoute = readFileSync(new URL('../src/app/api/releases/manage/route.ts', import.meta.url), 'utf8');
const libraryRoute = readFileSync(new URL('../src/app/api/drops/library/route.ts', import.meta.url), 'utf8');
const firestoreRules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const shareDialog = readFileSync(new URL('../src/components/share-dialog.tsx', import.meta.url), 'utf8');
const albumDetail = readFileSync(new URL('../src/components/album-detail-content.tsx', import.meta.url), 'utf8');
const releaseDialog = readFileSync(new URL('../src/components/first-drop-lathe.tsx', import.meta.url), 'utf8');
assert.match(manageRoute, /houseReleaseRequest !== undefined[\s\S]*verifyAdminRequest\(req\)/);
assert.match(manageRoute, /houseLibraryNoticeAt:\s*houseLibraryNoticeAt \|\| FieldValue\.delete\(\)/);
assert.match(libraryRoute, /listHouseReleaseLibraryItems\(db\)/);
assert.match(firestoreRules, /affectedKeys\(\)\.hasAny\(\['houseRelease', 'houseLibraryNotice', 'houseLibraryNoticeAt'\]\)/);
assert.doesNotMatch(shareDialog, /Press this song for sale|Manage album audio &amp; price/);
assert.match(albumDetail, /<TrackLiveIndicators[\s\S]*?linkLivePages/);
assert.match(releaseDialog, /Already released/);
assert.match(releaseDialog, /Live on album/);
assert.match(releaseDialog, /songReleasePlacement/);

console.log('Release management verification passed.');
