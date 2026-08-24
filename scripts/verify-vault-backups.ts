import assert from 'node:assert/strict';
import type { Album, Track } from '../src/lib/types';
import {
  VAULT_BACKUP_SCHEMA,
  buildVaultBackup,
  parseVaultBackup,
  prepareVaultImport,
} from '../src/lib/vault-backup';

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
  { id: 'album-1', ownerId: 'owner-1', title: 'Current', theme: 'Keep', createdAt: '2026-08-01T00:00:00.000Z', shareId: 'live-album', tracks: [{ ...track('track-1'), shareId: 'live-track', collabSheetId: 'live-collab' }] },
  { id: 'unassigned', ownerId: 'owner-1', title: 'Loose Tracks', theme: '', createdAt: '2026-08-01T00:00:00.000Z', tracks: [track('loose-1')] },
];

const backup = buildVaultBackup(current, null, new Date('2026-08-24T12:00:00.000Z'));
assert.equal(backup.schema, VAULT_BACKUP_SCHEMA);
assert.equal(backup.version, 2);
assert.deepEqual(backup.counts, { albums: 1, looseTracks: 1, albumTracks: 1 });

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

assert.throws(
  () => parseVaultBackup({ schema: VAULT_BACKUP_SCHEMA, version: 99, data: { albums: [] } }),
  /not supported/,
  'future unknown schemas must fail closed'
);

console.log('Vault backup verification passed.');
