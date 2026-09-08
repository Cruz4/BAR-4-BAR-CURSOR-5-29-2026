'use client';

import { auth } from '@/lib/firebase/client/firebase';
import type { DeckPlayable } from '@/lib/drop-library';

const DB_NAME = 'bar4bar-pressed-audio';
const DB_VERSION = 1;
const STORE_NAME = 'owned-audio';

type OfflinePressedAudio = {
  key: string;
  userId: string;
  itemKey: string;
  shareId: string;
  trackId?: string;
  title: string;
  artistName: string;
  contentType: string;
  byteSize: number;
  savedAt: string;
  blob: Blob;
};

function storageKey(userId: string, item: Pick<DeckPlayable, 'shareId' | 'trackId'>): string {
  return `${userId}:${item.shareId}:${item.trackId || 'single'}`;
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Offline audio is not supported on this device.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline music storage.'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline music storage failed.'));
  });
}

async function storeRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDb();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    return await requestResult(run(transaction.objectStore(STORE_NAME)));
  } finally {
    database.close();
  }
}

export type OfflinePressedAudioRecord = {
  key: string;
  itemKey: string;
  shareId: string;
  trackId?: string;
  title: string;
  artistName: string;
  byteSize: number;
  savedAt: string;
};

export async function listOfflinePressedAudioKeys(userId: string): Promise<Set<string>> {
  const rows = await listOfflinePressedAudioRecords(userId);
  return new Set(rows.map((row) => row.itemKey));
}

export async function listOfflinePressedAudioRecords(userId: string): Promise<OfflinePressedAudioRecord[]> {
  if (!userId) return [];
  const rows = await storeRequest('readonly', (store) => store.index('userId').getAll(userId)) as OfflinePressedAudio[];
  return rows.map((row) => ({
    key: row.key,
    itemKey: row.itemKey,
    shareId: row.shareId,
    ...(row.trackId ? { trackId: row.trackId } : {}),
    title: row.title,
    artistName: row.artistName,
    byteSize: row.byteSize,
    savedAt: row.savedAt,
  }));
}

export async function getOfflinePressedAudioBlob(userId: string, item: Pick<DeckPlayable, 'shareId' | 'trackId'>): Promise<Blob | null> {
  if (!userId) return null;
  const row = await storeRequest('readonly', (store) => store.get(storageKey(userId, item))) as OfflinePressedAudio | undefined;
  return row?.blob instanceof Blob ? row.blob : null;
}

export async function removePressedAudioOffline(userId: string, item: Pick<DeckPlayable, 'shareId' | 'trackId'>): Promise<void> {
  await storeRequest('readwrite', (store) => store.delete(storageKey(userId, item)));
}

export async function downloadPressedAudioOffline(userId: string, item: DeckPlayable): Promise<{ byteSize: number }> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== userId) throw new Error('Sign in again before saving music offline.');
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Connect to the internet to download this song first.');

  const token = await firebaseUser.getIdToken();
  const query = new URLSearchParams({ shareId: item.shareId, offline: '1' });
  if (item.trackId) query.set('trackId', item.trackId);
  const entitlement = await fetch(`/api/drops/audio?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await entitlement.json();
  if (!entitlement.ok) throw new Error(data.error || 'Could not verify this song.');
  if (data.full !== true || typeof data.url !== 'string') {
    throw new Error('Only songs you own or purchased can be saved offline.');
  }

  const audioResponse = await fetch(data.url, { cache: 'no-store' });
  if (!audioResponse.ok) throw new Error('Could not download the full recording.');
  const blob = await audioResponse.blob();
  if (!blob.size) throw new Error('The downloaded recording was empty.');

  const row: OfflinePressedAudio = {
    key: storageKey(userId, item),
    userId,
    itemKey: item.key,
    shareId: item.shareId,
    ...(item.trackId ? { trackId: item.trackId } : {}),
    title: item.title,
    artistName: item.artistName,
    contentType: blob.type || data.contentType || 'audio/mpeg',
    byteSize: blob.size,
    savedAt: new Date().toISOString(),
    blob,
  };

  try {
    await storeRequest('readwrite', (store) => store.put(row));
    void navigator.storage?.persist?.().catch(() => false);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('This device is out of offline storage. Remove another download and try again.');
    }
    throw error;
  }
  return { byteSize: blob.size };
}
