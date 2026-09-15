'use client';

import { auth, getClientStorage } from '@/lib/firebase/client/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { Album, StyleProfile, Track } from '@/lib/types';
import type { PreparedVaultImport, ParsedVaultBackup } from '@/lib/vault-backup';
import { buildVaultBackup } from '@/lib/vault-backup';
import {
  buildVaultArchiveZip,
  jsonArchiveEntry,
  VAULT_ARCHIVE_BLUEPRINT,
  VAULT_ARCHIVE_MANIFEST,
  VAULT_ARCHIVE_SCHEMA,
  VAULT_ARCHIVE_VERSION,
  type VaultArchiveAsset,
  type VaultArchiveContents,
  type VaultArchiveManifestV1,
  type ZipEntryInput,
} from '@/lib/vault-archive';
import { normalizeDropAudio, type DropAudioMeta } from '@/lib/drop-commerce';
import { completeUploadTicket, requestUploadTicket } from '@/lib/upload-ticket-client';
import { sheetTakeStoragePath, type SheetTake } from '@/lib/sheet-takes';
import { normalizeAudioContentType } from '@/lib/audio-mime';
import { dataUrlToBlob, isDataUrl } from '@/lib/cover-art';

type Progress = (message: string) => void;

function safePart(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
}

function extension(contentType: string, fileName?: string): string {
  const fromName = fileName?.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  if (fromName && /^(mp3|wav|m4a|aac|ogg|flac|webm|jpg|jpeg|png|webp)$/.test(fromName)) return fromName;
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('mpeg')) return 'mp3';
  if (contentType.includes('mp4') || contentType.includes('aac')) return 'm4a';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('flac')) return 'flac';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('image')) return 'jpg';
  return 'webm';
}

async function authToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before backing up or restoring your Vault.');
  return user.getIdToken();
}

async function fetchPrivateTrackFile(
  userId: string,
  albumId: string,
  trackId: string,
  kind: 'full' | 'preview'
): Promise<{ blob: Blob; contentType: string; fileName: string } | null> {
  const params = new URLSearchParams({ userId, albumId, trackId, kind });
  const metadataRes = await fetch(`/api/releases/private-audio?${params}`, {
    headers: { Authorization: `Bearer ${await authToken()}` },
    cache: 'no-store',
  });
  if (metadataRes.status === 404 && kind === 'preview') return null;
  const metadata = (await metadataRes.json().catch(() => ({}))) as {
    url?: string;
    contentType?: string;
    fileName?: string;
    error?: string;
  };
  if (!metadataRes.ok || !metadata.url) throw new Error(metadata.error || 'Could not read one of your song files.');
  const fileRes = await fetch(metadata.url, { cache: 'no-store' });
  if (!fileRes.ok) throw new Error('Could not download one of your private song files.');
  const contentType = metadata.contentType || fileRes.headers.get('content-type') || 'audio/mpeg';
  return { blob: await fileRes.blob(), contentType, fileName: metadata.fileName || `audio.${extension(contentType)}` };
}

async function fetchSheetTake(take: SheetTake): Promise<Blob> {
  const params = new URLSearchParams({ path: take.storagePath, ctype: take.contentType });
  const res = await fetch(`/api/voice/file?${params}`, {
    headers: { Authorization: `Bearer ${await authToken()}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Could not back up ${take.label || 'a Sheet Take'}.`);
  return res.blob();
}

async function coverBlob(url: string): Promise<Blob> {
  if (isDataUrl(url)) return dataUrlToBlob(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not read one of your cover images.');
  return response.blob();
}

export async function exportFullVaultArchive(input: {
  albums: Album[];
  styleProfile: StyleProfile | null;
  userId: string;
  onProgress?: Progress;
}): Promise<Blob> {
  const blueprint = buildVaultBackup(input.albums, input.styleProfile);
  const assets: VaultArchiveAsset[] = [];
  const entries: ZipEntryInput[] = [jsonArchiveEntry(VAULT_ARCHIVE_BLUEPRINT, blueprint)];
  const addAsset = (asset: VaultArchiveAsset, blob: Blob) => {
    assets.push(asset);
    entries.push({ name: asset.file, blob });
  };

  for (const album of input.albums) {
    const albumKey = safePart(album.id);
    if (album.coverArtUrl) {
      input.onProgress?.(`Packing cover art · ${album.title || 'Album'}`);
      const blob = await coverBlob(album.coverArtUrl);
      const contentType = blob.type || 'image/jpeg';
      const file = `media/covers/albums/${albumKey}.${extension(contentType)}`;
      addAsset({ kind: 'cover-art', file, albumId: album.id, contentType, byteSize: blob.size }, blob);
    }
    for (const track of album.tracks || []) {
      const trackKey = safePart(track.id);
      if (track.coverArtUrl) {
        input.onProgress?.(`Packing cover art · ${track.title || 'Song'}`);
        const blob = await coverBlob(track.coverArtUrl);
        const contentType = blob.type || 'image/jpeg';
        const file = `media/covers/tracks/${albumKey}/${trackKey}.${extension(contentType)}`;
        addAsset({ kind: 'cover-art', file, albumId: album.id, trackId: track.id, contentType, byteSize: blob.size }, blob);
      }

      const audio = normalizeDropAudio(track.dropAudio);
      if (audio) {
        input.onProgress?.(`Packing song · ${track.title || 'Untitled'}`);
        const master = await fetchPrivateTrackFile(input.userId, album.id, track.id, 'full');
        if (!master) throw new Error(`Could not find the master for ${track.title || 'a song'}.`);
        const masterFile = `media/audio/${albumKey}/${trackKey}/master.${extension(master.contentType, master.fileName)}`;
        addAsset({
          kind: 'drop-audio', file: masterFile, albumId: album.id, trackId: track.id,
          contentType: master.contentType, originalFileName: audio.fileName || master.fileName,
          durationSec: audio.durationSec, byteSize: master.blob.size,
        }, master.blob);
        const preview = await fetchPrivateTrackFile(input.userId, album.id, track.id, 'preview');
        if (preview) {
          const previewFile = `media/audio/${albumKey}/${trackKey}/preview.${extension(preview.contentType, preview.fileName)}`;
          addAsset({
            kind: 'drop-preview', file: previewFile, albumId: album.id, trackId: track.id,
            contentType: preview.contentType, durationSec: Math.min(30, audio.durationSec || 30), byteSize: preview.blob.size,
          }, preview.blob);
        }
      }

      for (const take of track.sheetTakes || []) {
        input.onProgress?.(`Packing Sheet Take · ${track.title || 'Untitled'}`);
        const blob = await fetchSheetTake(take);
        const contentType = normalizeAudioContentType(take.contentType || blob.type);
        const file = `media/sheet-takes/${albumKey}/${trackKey}/${safePart(take.id)}.${extension(contentType)}`;
        addAsset({
          kind: 'sheet-take', file, albumId: album.id, trackId: track.id, takeId: take.id,
          contentType, durationSec: take.durationSec, byteSize: blob.size, label: take.label,
          createdAt: take.createdAt, transcript: take.transcript,
        }, blob);
      }
    }
  }

  const manifest: VaultArchiveManifestV1 = {
    schema: VAULT_ARCHIVE_SCHEMA,
    version: VAULT_ARCHIVE_VERSION,
    exportedAt: blueprint.exportedAt,
    blueprintFile: VAULT_ARCHIVE_BLUEPRINT,
    restoreMode: 'merge-copy-on-conflict',
    assets,
  };
  entries.push(jsonArchiveEntry(VAULT_ARCHIVE_MANIFEST, manifest));
  input.onProgress?.('Building Vault ZIP…');
  return buildVaultArchiveZip(entries);
}

function locateImportedTrack(
  asset: VaultArchiveAsset,
  parsed: ParsedVaultBackup,
  prepared: PreparedVaultImport
): Track | undefined {
  if (!asset.trackId) return undefined;
  if (asset.albumId === 'unassigned') {
    const index = parsed.looseTracks.findIndex((track) => track.id === asset.trackId);
    return index >= 0 ? prepared.looseTracks[index] : undefined;
  }
  const albumIndex = parsed.albums.findIndex((album) => album.id === asset.albumId);
  if (albumIndex < 0) return undefined;
  const trackIndex = parsed.albums[albumIndex].tracks.findIndex((track) => track.id === asset.trackId);
  return trackIndex >= 0 ? prepared.albums[albumIndex]?.tracks[trackIndex] : undefined;
}

function locateImportedAlbum(
  asset: VaultArchiveAsset,
  parsed: ParsedVaultBackup,
  prepared: PreparedVaultImport
): Album | undefined {
  if (asset.albumId === 'unassigned') return undefined;
  const index = parsed.albums.findIndex((album) => album.id === asset.albumId);
  return index >= 0 ? prepared.albums[index] : undefined;
}

async function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not restore cover artwork.'));
    reader.readAsDataURL(blob);
  });
}

async function restoreDropAudio(
  userId: string,
  albumId: string,
  track: Track,
  master: VaultArchiveAsset,
  masterBlob: Blob,
  preview?: { asset: VaultArchiveAsset; blob: Blob }
): Promise<DropAudioMeta> {
  const prefix = `drops/${userId}/archive-${safePart(albumId)}-${safePart(track.id)}`;
  const storagePath = `${prefix}/audio.${extension(master.contentType, master.originalFileName)}`;
  const previewPath = preview ? `${prefix}/preview.${extension(preview.asset.contentType)}` : undefined;
  const ticket = await requestUploadTicket({
    kind: 'drop_audio', storagePath, byteSize: masterBlob.size, contentType: master.contentType,
    ...(previewPath && preview ? { companionPath: previewPath, companionByteSize: preview.blob.size } : {}),
  });
  const storage = getClientStorage();
  await uploadBytes(ref(storage, storagePath), masterBlob, {
    contentType: master.contentType,
    customMetadata: { uploadTicket: ticket.ticketId },
  });
  if (previewPath && preview) {
    await uploadBytes(ref(storage, previewPath), preview.blob, {
      contentType: preview.asset.contentType,
      customMetadata: { uploadTicket: ticket.ticketId },
    });
  }
  await completeUploadTicket(ticket.ticketId);
  return {
    storagePath,
    ...(previewPath ? { previewPath } : {}),
    contentType: master.contentType,
    durationSec: master.durationSec,
    byteSize: masterBlob.size,
    fileName: master.originalFileName || `audio.${extension(master.contentType)}`,
    uploadedAt: new Date().toISOString(),
  };
}

async function restoreSheetTake(userId: string, track: Track, asset: VaultArchiveAsset, blob: Blob): Promise<SheetTake> {
  const takeId = `take-import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const contentType = normalizeAudioContentType(asset.contentType);
  const storagePath = sheetTakeStoragePath(userId, track.id, takeId, contentType);
  const ticket = await requestUploadTicket({ kind: 'sheet_take', storagePath, byteSize: blob.size, contentType });
  const fileRef = ref(getClientStorage(), storagePath);
  await uploadBytes(fileRef, blob, { contentType, customMetadata: { uploadTicket: ticket.ticketId } });
  await completeUploadTicket(ticket.ticketId);
  return {
    id: takeId,
    label: asset.label || 'Imported Take',
    createdAt: asset.createdAt || new Date().toISOString(),
    url: await getDownloadURL(fileRef),
    storagePath,
    contentType,
    durationSec: Math.max(1, Number(asset.durationSec) || 1),
    byteSize: blob.size,
    ...(asset.transcript ? { transcript: asset.transcript.slice(0, 4000) } : {}),
  };
}

export async function restoreVaultArchiveMedia(input: {
  contents: VaultArchiveContents;
  parsed: ParsedVaultBackup;
  prepared: PreparedVaultImport;
  userId: string;
  onProgress?: Progress;
}): Promise<PreparedVaultImport> {
  const { contents, parsed, prepared, userId } = input;
  const audioGroups = new Map<string, { master?: VaultArchiveAsset; preview?: VaultArchiveAsset }>();

  for (const asset of contents.manifest.assets) {
    const blob = contents.files.get(asset.file);
    if (!blob) throw new Error(`Archive media is missing: ${asset.file}`);
    if (asset.kind === 'cover-art') {
      input.onProgress?.('Restoring cover artwork…');
      const dataUrl = await blobDataUrl(blob.slice(0, blob.size, asset.contentType));
      const track = locateImportedTrack(asset, parsed, prepared);
      if (track) track.coverArtUrl = dataUrl;
      else {
        const album = locateImportedAlbum(asset, parsed, prepared);
        if (album) album.coverArtUrl = dataUrl;
      }
    } else if (asset.kind === 'sheet-take') {
      const track = locateImportedTrack(asset, parsed, prepared);
      if (!track || (track.sheetTakes?.length || 0) >= 3) continue;
      input.onProgress?.(`Restoring Sheet Take · ${track.title || 'Untitled'}`);
      const take = await restoreSheetTake(userId, track, asset, blob);
      track.sheetTakes = [...(track.sheetTakes || []), take].slice(0, 3);
    } else {
      const key = `${asset.albumId}\0${asset.trackId || ''}`;
      const group = audioGroups.get(key) || {};
      if (asset.kind === 'drop-audio') group.master = asset;
      else group.preview = asset;
      audioGroups.set(key, group);
    }
  }

  for (const group of audioGroups.values()) {
    if (!group.master) continue;
    const track = locateImportedTrack(group.master, parsed, prepared);
    if (!track) continue;
    const masterBlob = contents.files.get(group.master.file);
    if (!masterBlob) continue;
    const previewBlob = group.preview ? contents.files.get(group.preview.file) : undefined;
    input.onProgress?.(`Restoring song · ${track.title || 'Untitled'}`);
    track.dropAudio = await restoreDropAudio(
      userId,
      track.albumId,
      track,
      group.master,
      masterBlob,
      group.preview && previewBlob ? { asset: group.preview, blob: previewBlob } : undefined
    );
    track.releaseStatus = 'draft';
  }
  return prepared;
}
