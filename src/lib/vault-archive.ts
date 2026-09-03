import type { VaultBackupV2 } from '@/lib/vault-backup';

export const VAULT_ARCHIVE_SCHEMA = 'bar4bar.full-vault-archive' as const;
export const VAULT_ARCHIVE_VERSION = 1 as const;
export const VAULT_ARCHIVE_MANIFEST = 'vault-archive-manifest.json' as const;
export const VAULT_ARCHIVE_BLUEPRINT = 'studio-blueprint.json' as const;

export type VaultArchiveAssetKind = 'drop-audio' | 'drop-preview' | 'sheet-take' | 'cover-art';

export type VaultArchiveAsset = {
  kind: VaultArchiveAssetKind;
  file: string;
  albumId: string;
  trackId?: string;
  takeId?: string;
  contentType: string;
  originalFileName?: string;
  durationSec?: number;
  byteSize?: number;
  label?: string;
  createdAt?: string;
  transcript?: string;
};

export type VaultArchiveManifestV1 = {
  schema: typeof VAULT_ARCHIVE_SCHEMA;
  version: typeof VAULT_ARCHIVE_VERSION;
  exportedAt: string;
  blueprintFile: typeof VAULT_ARCHIVE_BLUEPRINT;
  restoreMode: 'merge-copy-on-conflict';
  assets: VaultArchiveAsset[];
};

export type VaultArchiveContents = {
  manifest: VaultArchiveManifestV1;
  blueprint: VaultBackupV2;
  files: Map<string, Blob>;
};

export type ZipEntryInput = { name: string; blob: Blob };

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(at = new Date()): { date: number; time: number } {
  const year = Math.max(1980, at.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
    time: (at.getHours() << 11) | (at.getMinutes() << 5) | Math.floor(at.getSeconds() / 2),
  };
}

function safeArchiveName(raw: string): string {
  const clean = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean || clean.includes('../') || clean.includes('\0')) throw new Error('Invalid archive filename.');
  return clean;
}

function uint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

export async function buildVaultArchiveZip(entries: ZipEntryInput[]): Promise<Blob> {
  if (!entries.length || entries.length > 2000) throw new Error('Archive has an invalid file count.');
  const chunks: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const entry of entries) {
    const nameBytes = encoder.encode(safeArchiveName(entry.name));
    const bytes = new Uint8Array(await entry.blob.arrayBuffer());
    if (bytes.byteLength > 0xffffffff) throw new Error('One archive file is too large.');
    const crc = crc32(bytes);
    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, stamp.time, true);
    lv.setUint16(12, stamp.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, bytes.byteLength, true);
    lv.setUint32(22, bytes.byteLength, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(local, 30).set(nameBytes);
    chunks.push(local, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

    const header = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(header);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, stamp.time, true);
    cv.setUint16(14, stamp.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, bytes.byteLength, true);
    cv.setUint32(24, bytes.byteLength, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(header, 46).set(nameBytes);
    central.push(header);
    offset += local.byteLength + bytes.byteLength;
  }

  const centralSize = central.reduce((sum, part) => sum + (part as ArrayBuffer).byteLength, 0);
  const end = new ArrayBuffer(22);
  const ev = new DataView(end);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);
  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const min = Math.max(0, bytes.length - 65_557);
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  return -1;
}

export async function readVaultArchiveZip(file: Blob): Promise<VaultArchiveContents> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const endOffset = findEndOfCentralDirectory(bytes);
  if (endOffset < 0) throw new Error('This is not a valid AKAsheet Vault ZIP.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entryCount = view.getUint16(endOffset + 10, true);
  const centralOffset = uint32(view, endOffset + 16);
  if (!entryCount || entryCount > 2000 || centralOffset >= bytes.length) throw new Error('Archive file list is invalid.');

  const files = new Map<string, Blob>();
  let cursor = centralOffset;
  for (let i = 0; i < entryCount; i += 1) {
    if (uint32(view, cursor) !== 0x02014b50) throw new Error('Archive directory is damaged.');
    const method = view.getUint16(cursor + 10, true);
    const crc = uint32(view, cursor + 16);
    const size = uint32(view, cursor + 24);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = uint32(view, cursor + 42);
    const name = safeArchiveName(decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength)));
    if (method !== 0) throw new Error('This Vault ZIP uses unsupported compression. Export it again from AKAsheet.');
    if (uint32(view, localOffset) !== 0x04034b50) throw new Error('Archive file header is damaged.');
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + size > bytes.length) throw new Error('Archive file is incomplete.');
    const data = bytes.slice(dataOffset, dataOffset + size);
    if (crc32(data) !== crc) throw new Error(`Archive check failed for ${name}.`);
    files.set(name, new Blob([data]));
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  const manifestBlob = files.get(VAULT_ARCHIVE_MANIFEST);
  if (!manifestBlob) throw new Error('This ZIP is missing its Vault manifest.');
  const manifest = JSON.parse(await manifestBlob.text()) as VaultArchiveManifestV1;
  if (manifest.schema !== VAULT_ARCHIVE_SCHEMA || manifest.version !== VAULT_ARCHIVE_VERSION) {
    throw new Error('This Vault archive version is not supported by this app.');
  }
  if (!Array.isArray(manifest.assets) || manifest.blueprintFile !== VAULT_ARCHIVE_BLUEPRINT) {
    throw new Error('This Vault archive manifest is invalid.');
  }
  const blueprintBlob = files.get(manifest.blueprintFile);
  if (!blueprintBlob) throw new Error('This ZIP is missing its Studio Blueprint.');
  const blueprint = JSON.parse(await blueprintBlob.text()) as VaultBackupV2;
  const kinds = new Set<VaultArchiveAssetKind>(['drop-audio', 'drop-preview', 'sheet-take', 'cover-art']);
  for (const rawAsset of manifest.assets) {
    const asset = rawAsset as VaultArchiveAsset;
    if (!asset || typeof asset !== 'object' || !kinds.has(asset.kind)) throw new Error('This Vault archive has an invalid media entry.');
    if (typeof asset.file !== 'string' || typeof asset.albumId !== 'string' || typeof asset.contentType !== 'string') {
      throw new Error('This Vault archive has incomplete media details.');
    }
    if (!asset.albumId || asset.albumId.length > 200 || (asset.trackId && (typeof asset.trackId !== 'string' || asset.trackId.length > 200))) {
      throw new Error('This Vault archive has an invalid project reference.');
    }
    asset.file = safeArchiveName(asset.file);
    const media = files.get(asset.file);
    if (!media) throw new Error(`This Vault ZIP is missing ${asset.file}.`);
    const maxBytes = asset.kind === 'drop-audio'
      ? 40 * 1024 * 1024
      : asset.kind === 'cover-art'
        ? 900 * 1024
        : 12 * 1024 * 1024;
    if (media.size <= 0 || media.size > maxBytes) throw new Error(`Archive media has an invalid size: ${asset.file}.`);
    if (asset.kind === 'cover-art' ? !asset.contentType.startsWith('image/') : !asset.contentType.startsWith('audio/')) {
      throw new Error(`Archive media has an invalid type: ${asset.file}.`);
    }
  }
  return { manifest, blueprint, files };
}

export function jsonArchiveEntry(name: string, value: unknown): ZipEntryInput {
  return { name, blob: new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }) };
}
