'use client';

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client/firebase';
import { stripForFirestore } from '@/lib/utils';
import {
  DROP_CRATE_MAX_COUNT,
  DROP_CRATE_MAX_ITEMS,
  DROP_CRATE_NAME_MAX,
  type DropCrate,
} from '@/lib/drop-library';

function crateCol(userId: string) {
  return collection(db, 'users', userId, 'dropCrates');
}

export function subscribeDropCrates(
  userId: string,
  onChange: (crates: DropCrate[]) => void
): () => void {
  return onSnapshot(
    crateCol(userId),
    (snap) => {
      const crates = snap.docs
        .map((d) => {
          const data = d.data() as Partial<DropCrate>;
          const name = typeof data.name === 'string' ? data.name : 'Untitled crate';
          const shareIds = Array.isArray(data.shareIds)
            ? data.shareIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            : [];
          return {
            id: d.id,
            name,
            shareIds,
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
            updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
          } satisfies DropCrate;
        })
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onChange(crates);
    },
    () => onChange([])
  );
}

export async function createDropCrate(
  userId: string,
  name: string,
  shareIds: string[] = [],
  existingCount: number
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name this crate.');
  if (trimmed.length > DROP_CRATE_NAME_MAX) {
    throw new Error(`Keep crate names under ${DROP_CRATE_NAME_MAX} characters.`);
  }
  if (existingCount >= DROP_CRATE_MAX_COUNT) {
    throw new Error(`You can keep ${DROP_CRATE_MAX_COUNT} crates.`);
  }
  const unique = Array.from(new Set(shareIds)).slice(0, DROP_CRATE_MAX_ITEMS);
  const now = new Date().toISOString();
  const ref = doc(crateCol(userId));
  await setDoc(
    ref,
    stripForFirestore({
      name: trimmed,
      shareIds: unique,
      createdAt: now,
      updatedAt: now,
    })
  );
  return ref.id;
}

export async function renameDropCrate(userId: string, crateId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name this crate.');
  if (trimmed.length > DROP_CRATE_NAME_MAX) {
    throw new Error(`Keep crate names under ${DROP_CRATE_NAME_MAX} characters.`);
  }
  await updateDoc(doc(db, 'users', userId, 'dropCrates', crateId), {
    name: trimmed,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDropCrate(userId: string, crateId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'dropCrates', crateId));
}

export async function setCrateShareIds(
  userId: string,
  crateId: string,
  shareIds: string[]
): Promise<void> {
  const unique = Array.from(new Set(shareIds)).slice(0, DROP_CRATE_MAX_ITEMS);
  await updateDoc(doc(db, 'users', userId, 'dropCrates', crateId), {
    shareIds: unique,
    updatedAt: new Date().toISOString(),
  });
}

export async function toggleShareInCrate(
  userId: string,
  crate: DropCrate,
  shareId: string
): Promise<void> {
  const has = crate.shareIds.includes(shareId);
  const next = has
    ? crate.shareIds.filter((id) => id !== shareId)
    : [...crate.shareIds, shareId];
  if (!has && next.length > DROP_CRATE_MAX_ITEMS) {
    throw new Error(`A crate holds ${DROP_CRATE_MAX_ITEMS} drops.`);
  }
  await setCrateShareIds(userId, crate.id, next);
}
