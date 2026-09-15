import assert from 'node:assert/strict';
import type { Album, Track } from '../src/lib/types';
import {
  VAULT_BACKUP_SCHEMA,
  buildVaultBackup,
  parseVaultBackup,
  prepareVaultImport,
} from '../src/lib/vault-backup';
import { dataUrlToBlob, isDataUrl } from '../src/lib/cover-art';
import {
  buildVaultArchiveZip,
  jsonArchiveEntry,
  readVaultArchiveZip,
  VAULT_ARCHIVE_BLUEPRINT,
  VAULT_ARCHIVE_MANIFEST,
  VAULT_ARCHIVE_SCHEMA,
  VAULT_ARCHIVE_VERSION,
} from '../src/lib/vault-archive';

const track = (id: string, title = id): Track => ({
  id,
  albumId: 'album-1',
  ownerId: 'owner-1',
  title,
  vibe: { genre: 'Hip-hop', tempoBPM: 90, feeling: [] },
  intentRefs: [],
  sections: [],
  status: 'in_progress',
  createdAt: '2026-08-01T00:00:00.000Z',
});
const current: Album[] = [
  { id: 'album-1', ownerId: 'owner-1', title: 'Current', theme: 'Keep', createdAt: '2026-08-01T00:00:00.000Z', shareId: 'live-album', coverArtUrl: 'data:image/jpeg;base64,YQ==', tracks: [{ ...track('track-1'), shareId: 'live-track', releaseShareId: 'release-track', collabSheetId: 'live-collab', dropAudio: { storagePath: 'drops/owner-1/track-1/audio.mp3', contentType: 'audio/mpeg', uploadedAt: '2026-08-01T00:00:00.000Z' } }] },
  { id: 'unassigned', ownerId: 'owner-1', title: 'Loose Tracks', theme: '', createdAt: '2026-08-01T00:00:00.000Z', tracks: [track('loose-1')] },
];

const backup = buildVaultBackup(current, null, new Date('2026-08-24T12:00:00.000Z'));
assert.equal(backup.schema, VAULT_BACKUP_SCHEMA);
assert.equal(backup.version, 2);
assert.deepEqual(backup.counts, { albums: 1, looseTracks: 1, albumTracks: 1 });
assert.equal(backup.data.albums[0].coverArtUrl, undefined, 'small blueprint must omit cover media');
assert.equal(backup.data.albums[0].tracks[0].dropAudio, undefined, 'small blueprint must omit private audio paths');
assert.equal(backup.data.albums[0].tracks[0].releaseShareId, undefined, 'blueprints must not alias live releases');

const parsed = parseVaultBackup(backup);
const prepared = prepareVaultImport(parsed, current, false, 'test');
assert.equal(prepared.preview.albumCopies, 1);
assert.equal(prepared.preview.looseTrackCopies, 1);
assert.equal(prepared.albums[0].id, 'album-1-import-test');
assert.equal(prepared.albums[0].title, 'Current (Imported Copy)');
assert.equal(prepared.albums[0].shareId, undefined, 'album copies must not alias a live DNA Drop');
assert.equal(prepared.albums[0].tracks[0].shareId, undefined, 'track copies must not alias a live First Drop');
assert.equal(prepared.albums[0].tracks[0].collabSheetId, undefined, 'track copies must not alias a Collab Sheet');
assert.equal(prepared.looseTracks[0].id, 'loose-1-import-test');
assert.equal(current[0].id, 'album-1', 'preparing an import mutated the current Vault');

const legacy = parseVaultBackup(current);
assert.equal(legacy.sourceVersion, 0, 'legacy array backups must remain supported');
assert.equal(legacy.albums.length, 1);
assert.equal(legacy.looseTracks.length, 1);

const jpegBlob = dataUrlToBlob('data:image/jpeg;base64,YQ==');
assert.equal(isDataUrl('data:image/jpeg;base64,YQ=='), true);
assert.equal(jpegBlob.type, 'image/jpeg');
assert.equal(jpegBlob.size, 1, 'base64 cover data URLs must decode without fetch()');

assert.throws(
  () => parseVaultBackup({ schema: VAULT_BACKUP_SCHEMA, version: 99, data: { albums: [] } }),
  /not supported/,
  'future unknown schemas must fail closed'
);

async function verifyFullArchive() {
const manifest = {
  schema: VAULT_ARCHIVE_SCHEMA,
  version: VAULT_ARCHIVE_VERSION,
  exportedAt: backup.exportedAt,
  blueprintFile: VAULT_ARCHIVE_BLUEPRINT,
  restoreMode: 'merge-copy-on-conflict' as const,
  assets: [{
    kind: 'drop-audio' as const,
    file: 'media/audio/album-1/track-1/master.mp3',
    albumId: 'album-1',
    trackId: 'track-1',
    contentType: 'audio/mpeg',
  }],
};
const zip = await buildVaultArchiveZip([
  jsonArchiveEntry(VAULT_ARCHIVE_BLUEPRINT, backup),
  { name: manifest.assets[0].file, blob: new Blob(['audio-bytes'], { type: 'audio/mpeg' }) },
  jsonArchiveEntry(VAULT_ARCHIVE_MANIFEST, manifest),
]);
const archive = await readVaultArchiveZip(zip);
assert.equal(archive.manifest.schema, VAULT_ARCHIVE_SCHEMA);
assert.equal(await archive.files.get(manifest.assets[0].file)?.text(), 'audio-bytes');
}

void verifyFullArchive()
  .then(() => console.log('Vault backup verification passed.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
