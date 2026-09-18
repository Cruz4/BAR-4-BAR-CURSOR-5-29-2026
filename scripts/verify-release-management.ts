import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canonicalDnaShareIds,
  fitAlbumReleasePayload,
  groupVaultReleases,
  findVaultReleaseByShareId,
  isHouseReleaseDocument,
  isShareDocumentPublic,
  shareDocumentVisibility,
  RELEASE_SHARE_PAYLOAD_BUDGET_BYTES,
  releaseShareIdOf,
  releaseStatusOf,
} from '../src/lib/release-management';
import type { Album, Track } from '../src/lib/types';
import { buildBrowseArtists, flattenLibraryItems, sortPlayables } from '../src/lib/drop-library';
import { orderAlbumTracks } from '../src/lib/album-track-order';
import { hasLiveFirstDrop, trackReleaseControlState } from '../src/lib/track-live-flags';
import { publicDropAudio } from '../src/lib/drop-commerce';
import { buildAlbumDropPayload } from '../src/lib/dna-drop';
import {
  canManageReleaseShare,
  houseReleaseVaultRef,
  isHouseReleaseCreditedToUser,
  isHouseReleaseVisibleOnHome,
  toLinkedHouseRelease,
} from '../src/lib/house-artist-link';

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
assert.deepEqual(
  shareDocumentVisibility({ releaseStatus: 'live', data: { dropAudio: audio, dnaStatus: 'live' } }),
  { releaseLive: true, dnaLive: false },
  'a release payload copied from a DNA-enabled Vault track must not become a duplicate DNA page',
);
const canonicalDna = canonicalDnaShareIds([
  {
    id: 'OLD-LIVE',
    data: { ownerId: 'u', type: 'track', projectId: 't', dnaStatus: 'live', updatedAt: '2026-01-01' },
  },
  {
    id: 'NEW-OFFLINE',
    data: { ownerId: 'u', type: 'track', projectId: 't', dnaStatus: 'unlisted', updatedAt: '2026-01-02' },
  },
  {
    id: 'MUSIC-ONLY',
    data: { ownerId: 'u', type: 'track', projectId: 't', releaseStatus: 'live', updatedAt: '2026-01-03', data: { dropAudio: audio } },
  },
]);
assert.equal(canonicalDna.has('OLD-LIVE'), false, 'an older live DNA snapshot cannot resurrect');
assert.equal(canonicalDna.has('NEW-OFFLINE'), true, 'the newest offline DNA snapshot remains the tombstone');
assert.equal(canonicalDna.has('MUSIC-ONLY'), false, 'a separate commerce snapshot never replaces DNA visibility');
assert.deepEqual(
  shareDocumentVisibility({ dnaStatus: 'live', data: { dropAudio: audio } }),
  { releaseLive: false, dnaLive: true },
  'an audio-attached DNA page must not be counted as a second music release',
);
assert.deepEqual(
  shareDocumentVisibility({ releaseStatus: 'unlisted', dnaStatus: 'live', data: { dropAudio: audio } }),
  { releaseLive: false, dnaLive: true },
  'taking commerce offline must not hide an explicitly separate DNA page',
);
assert.deepEqual(
  shareDocumentVisibility({ releaseStatus: 'unlisted', releaseRemovedAt: new Date(0).toISOString(), dnaStatus: 'live', data: { dropAudio: audio } }),
  { releaseLive: false, dnaLive: true },
  'retiring the release record must preserve a separately live lyric page',
);
assert.equal(isHouseReleaseDocument({ houseRelease: true, data: {} }), true);
assert.equal(isHouseReleaseDocument({ data: { houseRelease: true } }), false);
assert.deepEqual(
  shareDocumentVisibility({
    houseRelease: true,
    releaseStatus: 'unlisted',
    hasDropAudio: true,
    data: { tracks: [{ dropAudio: audio }] },
  }),
  { releaseLive: true, dnaLive: false },
  'House albums stay reachable on the public album hub even when commerce is unlisted',
);
assert.equal(
  canManageReleaseShare({ houseRelease: true, houseArtistId: 'artist', ownerId: 'admin' }, 'artist'),
  true,
);
assert.equal(
  canManageReleaseShare({ houseRelease: true, houseArtistId: 'artist', ownerId: 'admin' }, 'admin'),
  true,
);
assert.equal(
  canManageReleaseShare({ houseRelease: true, houseArtistId: 'artist', ownerId: 'admin' }, 'other'),
  false,
);
assert.equal(
  houseReleaseVaultRef({
    type: 'album',
    ownerId: 'admin',
    projectId: 'MIRROR',
    data: { title: 'Mirror' },
  })?.albumId,
  'MIRROR',
);
assert.equal(
  houseReleaseVaultRef({
    type: 'track',
    ownerId: 'admin',
    projectId: 'song-1',
    data: { albumId: 'MIRROR' },
  })?.trackId,
  'song-1',
);
assert.equal(
  isHouseReleaseVisibleOnHome('abc', ['ABC']),
  false,
  'On your page must treat share ids as case-insensitive',
);
assert.equal(isHouseReleaseVisibleOnHome('abc', ['OTHER']), true);

const pressDesk = readFileSync(new URL('../src/components/profile/press-desk.tsx', import.meta.url), 'utf8');
const catalogUi = readFileSync(new URL('../src/components/vault/release-catalog.tsx', import.meta.url), 'utf8');
const houseHomeEditor = readFileSync(new URL('../src/components/profile/house-release-home-editor.tsx', import.meta.url), 'utf8');
assert.match(pressDesk, /id="artist-home-house-releases"/, 'Module Deck must include House release On your page switches');
assert.match(pressDesk, /HouseReleaseHomeEditor/, 'Module Deck must render the House home editor');
assert.match(catalogUi, /setHouseReleaseOnHome/, 'Release Catalog On your page must persist the same Artist Home field');
assert.match(houseHomeEditor, /setHouseReleaseOnHome/, 'Module Deck On your page must persist the same Artist Home field');
assert.match(houseHomeEditor, /On your page/, 'Module Deck labels must match Release Catalog');
assert.match(houseHomeEditor, /Hidden on page/, 'Module Deck labels must match Release Catalog');
assert.equal(
  toLinkedHouseRelease('HOUSE-ALBUM', {
    houseRelease: true,
    type: 'album',
    ownerId: 'admin',
    houseArtistId: 'artist',
    data: { title: 'Mirror', tracks: [{}, {}] },
  })?.trackCount,
  2,
);

const album: Album = {
  id: 'a', ownerId: 'u', title: 'Release', theme: '', createdAt: new Date(0).toISOString(),
  tracks: [baseTrack], releaseStatus: 'draft',
};
const largeCover = `data:image/jpeg;base64,${'a'.repeat(700_000)}`;
const largeCoverAlbum: Album = {
  ...album,
  coverArtUrl: largeCover,
  tracks: Array.from({ length: 5 }, (_, index) => ({
    ...baseTrack,
    id: `large-${index}`,
    coverArtUrl: largeCover,
  })),
};
const largeCoverPayload = buildAlbumDropPayload(largeCoverAlbum, undefined);
assert.equal(largeCoverPayload.tracks[0]?.sharedAlbumContext?.coverArtUrl, undefined);
assert.equal(largeCoverPayload.tracks[0]?.coverArtUrl, undefined);
const fittedLargeCover = fitAlbumReleasePayload(largeCoverPayload as unknown as Record<string, unknown>);
assert.equal(fittedLargeCover.coverOmitted, false, 'one deduplicated album cover should remain on the release');
assert.equal(fittedLargeCover.byteSize <= RELEASE_SHARE_PAYLOAD_BUDGET_BYTES, true);

const oversizedCoverPayload = {
  ...largeCoverPayload,
  coverArtUrl: `data:image/jpeg;base64,${'b'.repeat(950_000)}`,
};
const fittedOversizedCover = fitAlbumReleasePayload(oversizedCoverPayload as unknown as Record<string, unknown>);
assert.equal(fittedOversizedCover.compacted, true);
assert.equal(fittedOversizedCover.coverOmitted, true);
assert.equal(fittedOversizedCover.byteSize <= RELEASE_SHARE_PAYLOAD_BUDGET_BYTES, true);
assert.equal(trackReleaseControlState({ ...baseTrack, dropAudio: undefined }, album), 'new');
assert.equal(trackReleaseControlState({ ...baseTrack, releaseStatus: 'draft' }, album), 'attached');
assert.equal(
  trackReleaseControlState({ ...baseTrack, releaseShareId: 'MUSIC-RELEASE', releaseStatus: 'unlisted' }, album),
  'offline',
);
assert.equal(
  trackReleaseControlState({ ...baseTrack, releaseShareId: 'MUSIC-RELEASE', releaseStatus: 'live' }, album),
  'live',
);
const draftGroups = groupVaultReleases([album]);
assert.equal(draftGroups.privateDrafts.some((row) => row.track?.id === 't'), true);
const offlineGroups = groupVaultReleases([{
  ...album,
  releaseStatus: 'unlisted',
  releaseShareId: 'OFFLINE-ALBUM',
  tracks: [],
}]);
assert.equal(offlineGroups.offlineReleases.some((row) => row.album.id === album.id && !row.track), true);

const liveAlbum = { ...album, releaseShareId: 'ALBUM', releaseStatus: 'live' as const, dropPrice: price };
assert.equal(trackReleaseControlState({ ...baseTrack, releaseStatus: 'draft' }, liveAlbum), 'album-live');
const liveGroups = groupVaultReleases([liveAlbum]);
assert.equal(liveGroups.liveAlbumsAudioOnly.length, 1);
assert.equal(liveGroups.privateDrafts.some((row) => row.track?.id === 't'), false);
assert.equal(findVaultReleaseByShareId([liveAlbum], 'ALBUM')?.album.id, album.id);
assert.equal(findVaultReleaseByShareId([liveAlbum], 'missing'), undefined);

const houseCatalog = readFileSync(new URL('../src/components/vault/release-catalog.tsx', import.meta.url), 'utf8');
const houseReleasesRoute = readFileSync(new URL('../src/app/api/profile/house-releases/route.ts', import.meta.url), 'utf8');
assert.match(houseCatalog, /House catalog · linked to you/);
assert.match(houseCatalog, /houseRows\.length \? renderHouseCard\(\)/);
assert.match(houseCatalog, /shareId: row\.shareId/);
assert.match(houseCatalog, /Take offline/);
const houseManage = readFileSync(new URL('../src/app/api/releases/manage/route.ts', import.meta.url), 'utf8');
assert.match(houseManage, /canManageReleaseShare/);
assert.match(houseManage, /vaultUserId/);
assert.match(houseReleasesRoute, /houseRelease',\s*'==',\s*true/);
assert.match(houseReleasesRoute, /isHouseReleaseCreditedToUser/);
assert.doesNotMatch(houseReleasesRoute, /getLiveDnaDropsForUser/, 'linked House catalog must not be capped by the DNA Drop shelf');

const houseDeck = flattenLibraryItems([{
  shareId: 'HOUSE', ownerId: 'admin', scope: 'track', projectId: 't', title: 'House song',
  trackIds: ['t'], amountCents: 0, purchasedAt: new Date(0).toISOString(),
  free: true, houseRelease: true, houseLibraryNotice: true, houseLibraryNoticeAt: new Date(0).toISOString(),
}]);
assert.equal(houseDeck[0]?.houseRelease, true);
assert.equal(houseDeck[0]?.free, true);
assert.equal(houseDeck[0]?.houseLibraryNotice, true);
assert.equal(houseDeck[0]?.detailsHref, '/song/HOUSE');

const orderedAlbumTracks = orderAlbumTracks([
  { id: 'third', createdAt: '2026-01-03' },
  { id: 'first', createdAt: '2026-01-01' },
  { id: 'second', createdAt: '2026-01-02' },
], { trackOrder: ['first', 'second', 'third'] });
assert.deepEqual(orderedAlbumTracks.map((track) => track.id), ['first', 'second', 'third']);
const legacyOrderedAlbumTracks = orderAlbumTracks([
  { id: 'second' },
  { id: 'first' },
], { tracks: [{ id: 'first' }, { id: 'second' }] });
assert.deepEqual(legacyOrderedAlbumTracks.map((track) => track.id), ['first', 'second']);

const albumDeck = flattenLibraryItems([{
  shareId: 'HOUSE-ALBUM', ownerId: 'admin', scope: 'album', projectId: 'mirror', title: 'Mirror',
  trackIds: ['one', 'two'], amountCents: 0, purchasedAt: new Date(0).toISOString(), free: true,
  houseRelease: true, artistName: 'Neomaiya Sol', artistSlug: 'neomaiya_sol', tracks: [
    { id: 'one', title: 'Z Opening', releaseShareId: 'SONG-ONE' },
    { id: 'two', title: 'A Closing' },
  ],
}]);
assert.deepEqual(albumDeck.map((track) => track.trackNumber), [1, 2]);
assert.equal(albumDeck[0]?.detailsHref, '/song/SONG-ONE');
assert.equal(albumDeck[1]?.detailsHref, '/song/HOUSE-ALBUM?trackId=two');
assert.equal(albumDeck[0]?.albumHref, '/share/HOUSE-ALBUM');
assert.equal(albumDeck[0]?.artistSlug, 'neomaiya_sol');
const alphabetizedDeck = sortPlayables(albumDeck, 'az', {});
assert.deepEqual(
  buildBrowseArtists(alphabetizedDeck)[0]?.albums[0]?.items.map((track) => track.title),
  ['Z Opening', 'A Closing'],
  'artist shelves must restore album sequence after another Library sort',
);

const manageRoute = readFileSync(new URL('../src/app/api/releases/manage/route.ts', import.meta.url), 'utf8');
const libraryRoute = readFileSync(new URL('../src/app/api/drops/library/route.ts', import.meta.url), 'utf8');
const firestoreRules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const shareDialog = readFileSync(new URL('../src/components/share-dialog.tsx', import.meta.url), 'utf8');
const albumDetail = readFileSync(new URL('../src/components/album-detail-content.tsx', import.meta.url), 'utf8');
const releaseDialog = readFileSync(new URL('../src/components/first-drop-lathe.tsx', import.meta.url), 'utf8');
const libraryDeck = readFileSync(new URL('../src/components/library/drop-deck.tsx', import.meta.url), 'utf8');
const audioRoute = readFileSync(new URL('../src/app/api/drops/audio/route.ts', import.meta.url), 'utf8');
const offlineCache = readFileSync(new URL('../src/lib/offline/pressed-audio-cache.ts', import.meta.url), 'utf8');
const albumReleasePage = readFileSync(new URL('../src/components/dna-drop-album-hub.tsx', import.meta.url), 'utf8');
const shareSnapshotPage = readFileSync(new URL('../src/app/share/[shareId]/page.tsx', import.meta.url), 'utf8');
assert.match(manageRoute, /houseReleaseRequest !== undefined[\s\S]*verifyAdminRequest\(req\)/);
assert.match(manageRoute, /houseLibraryNoticeAt:\s*houseLibraryNoticeAt \|\| FieldValue\.delete\(\)/);
assert.match(libraryRoute, /listHouseReleaseLibraryItems\(db\)/);
assert.match(firestoreRules, /affectedKeys\(\)\.hasAny\(\['houseRelease', 'houseLibraryNotice', 'houseLibraryNoticeAt'\]\)/);
assert.doesNotMatch(shareDialog, /Press this song for sale|Manage album audio &amp; price/);
assert.match(albumDetail, /<TrackLiveIndicators[\s\S]*?linkLivePages/);
assert.match(releaseDialog, /Already released/);
assert.match(releaseDialog, /Live on album/);
assert.match(releaseDialog, /songReleasePlacement/);
assert.match(releaseDialog, /action:\s*'unpublish'/, 'New release must be able to take a live release offline');
assert.match(libraryDeck, /Download for offline/, 'Library menus must offer offline download for owned or purchased music');
assert.match(offlineCache, /offline:\s*'1'/, 'offline cache requests must identify themselves to the entitlement endpoint');
assert.match(audioRoute, /offlineDownload[\s\S]*userCanStreamFull/, 'offline downloads must be enforced by ownership or purchase on the server');
assert.doesNotMatch(audioRoute, /isProOrTrial/, 'offline downloads must not require Studio Pro on the server');
assert.doesNotMatch(manageRoute, /Studio Pro is required to press a release live/, 'music releases must not require Studio Pro to press live');
assert.doesNotMatch(releaseDialog, /Studio Pro required/, 'New release must not gate song/album publish behind Pro');
assert.match(releaseDialog, /Free to press live/, 'New release copy must say pressing live is Free');
assert.match(albumReleasePage, /orderAlbumTracks\(album\.tracks \?\? \[\], album\)/, 'open album releases must honor the saved track order');
assert.match(albumReleasePage, /pressedSongHref\(listenHubId, \{ trackId: track\.id \}\)/, 'album tracks with audio still link to their song listen page when DNA is gated');
assert.match(albumReleasePage, /dnaDropSnapshotTrackPath\(shareId, track\.id\)/, 'album DNA hub must open each song\'s lyric DNA from this snapshot');
assert.doesNotMatch(albumReleasePage, /resolveDnaDropHref\(track\.shareId/, 'album DNA hub must not jump to a separate track share (that 404s to Discover)');
assert.match(shareSnapshotPage, /DNA_DROP_SNAPSHOT_TRACK_PARAM/, 'album snapshot must read the in-snapshot track query');
assert.match(shareSnapshotPage, /DnaDropAtmosphere/, 'DNA snapshot pages must use the lyric-lab atmosphere');
assert.match(albumDetail, /AlbumPageAtmosphere/, 'album vault pages must use the vinyl chamber atmosphere');
assert.match(releaseDialog, /action:\s*'remove'/, 'New release must be able to retire an offline release record');
assert.match(manageRoute, /releaseRemovedAt:\s*now/);
assert.match(releaseDialog, /Take album offline/);
assert.match(releaseDialog, /Take release offline/);
assert.match(libraryDeck, /Organize Library/);
assert.match(libraryDeck, /Saved automatically on this device/);
assert.match(libraryDeck, /LIBRARY_PREFERENCES_KEY/);
assert.match(libraryDeck, /href=\{current\.detailsHref\}/, 'the Library now-playing title must open its song or release page');
assert.match(libraryDeck, /DeckCreditLinks/, 'Library credits must be clickable artist and album names');
assert.match(libraryDeck, /profileHref\(item\.artistSlug\)/, 'Library artist names must open Artist Home');
assert.match(libraryDeck, /item\.albumHref/, 'Library album names must open the album page');

const pressedSong = readFileSync(new URL('../src/lib/server/pressed-song.ts', import.meta.url), 'utf8');
const embedPlayer = readFileSync(new URL('../src/components/profile/embed-player.tsx', import.meta.url), 'utf8');
const dropSocial = readFileSync(new URL('../src/components/drop-social-panel.tsx', import.meta.url), 'utf8');
assert.match(pressedSong, /audioForPlay\(share, trackId\)/, 'album share posts must resolve playable album audio');
assert.match(pressedSong, /albumLevel \? \{ scope: 'album'/, 'album posts must keep album scope for the feed player');
assert.match(embedPlayer, /song\.scope === 'album'/, 'feed album posts must open the album page');
assert.match(dropSocial, /dropPromotePath\(\{ shareId, isAlbum, hasAudio, trackId \}\)/, 'album Reverbs must attach the album page');
assert.match(dropSocial, /VoiceNoteComposer/, 'Quote Reverb must include rec');
assert.match(dropSocial, /ImageAttachComposer/, 'Quote Reverb must include camera and photo');
assert.match(dropSocial, /EmojiPickerButton/, 'Quote Reverb must include emoji');
assert.match(dropSocial, /<BarChart3 className="h-3.5 w-3.5" \/> Poll/, 'Quote Reverb must include poll');
assert.match(dropSocial, /Imprint/, 'Quote Reverb must include Imprint');

const housePingRoute = readFileSync(new URL('../src/app/api/admin/house-release-ping/route.ts', import.meta.url), 'utf8');
const housePingLib = readFileSync(new URL('../src/lib/house-release-ping.ts', import.meta.url), 'utf8');
assert.match(housePingLib, /houseReleasePingEventId/);
assert.match(housePingRoute, /houseReleasePingEventId\(shareId\)/);
assert.match(housePingRoute, /pingedAt:\s*now/);
assert.doesNotMatch(housePingRoute, /if \(!existingPing\.exists\)/, 'House pings must refresh on every admin send');

const albumHrefLib = readFileSync(new URL('../src/lib/pressed-song.ts', import.meta.url), 'utf8');
const foldSheet = readFileSync(new URL('../src/components/folds/fold-sheet.tsx', import.meta.url), 'utf8');
const emojiPicker = readFileSync(new URL('../src/components/ui/emoji-picker-button.tsx', import.meta.url), 'utf8');
const discoveryTags = readFileSync(new URL('../src/components/music-discovery-tags.tsx', import.meta.url), 'utf8');
const foldsRoute = readFileSync(new URL('../src/app/api/folds/route.ts', import.meta.url), 'utf8');
const profileSongsRoute = readFileSync(new URL('../src/app/api/profile/[slug]/songs/route.ts', import.meta.url), 'utf8');
const dropShelf = readFileSync(new URL('../src/components/profile/profile-modules.tsx', import.meta.url), 'utf8');
const profileTabs = readFileSync(new URL('../src/components/profile/profile-section-tabs.tsx', import.meta.url), 'utf8');
assert.match(albumHrefLib, /export function albumHubHref/);
assert.match(albumHrefLib, /export function resolveAlbumHubShareId/);
assert.doesNotMatch(albumHrefLib, /discover\?/);
assert.match(foldSheet, /min-h-\[calc\(100dvh-3\.5rem\)\] w-full/, 'DM thread must full-bleed Msgs atmosphere');
assert.match(emojiPicker, /onFocusOutside=\{\(e\) => e\.preventDefault\(\)\}/, 'emoji picker must stay open while composing');
assert.match(shareSnapshotPage, /Album release hub/, 'album share chrome must label the release hub');
assert.match(discoveryTags, /albumHubHref\(metadata\.albumShareId\)/, 'album chips must open the album hub');
assert.match(discoveryTags, /: !hideAlbum && metadata\.albumTitle \?/, 'album without a hub id is a label, not a Discover search');
assert.doesNotMatch(foldsRoute, /Slow down — too many messages this hour/, 'fold-pass must not have an hourly send cap');
assert.doesNotMatch(foldsRoute, /fold-pass/, 'fold-pass rate limit key must be gone');
assert.match(firestoreRules, /match \/dropReverbs\/\{shareId\}/, 'song Reverb pointers need dropReverbs rules');
assert.match(profileSongsRoute, /where\('houseRelease', '==', true\)/, 'Releases tab must include linked House shares');
assert.match(profileSongsRoute, /hiddenHouseReleaseShareIds/, 'Releases tab must honor hidden House rows');
assert.match(profileSongsRoute, /flattenHouseAlbum/, 'live House albums must flatten into playable rows');
assert.match(dropShelf, /No live Lyrics DNA Drops yet/, 'DNA shelf must stay visible when empty');
assert.match(profileTabs, /DNA Drops/, 'Artist Home must expose a DNA Drops tab');

console.log('Release management verification passed.');
