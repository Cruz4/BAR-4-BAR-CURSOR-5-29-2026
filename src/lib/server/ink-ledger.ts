import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import {
  buildInkLedgerDocument,
  type InkLedgerWrite,
} from '@/lib/ink-ledger';

export async function recordInkLedgerEntries(
  db: Firestore,
  userId: string,
  entries: InkLedgerWrite[],
  userName?: string
): Promise<void> {
  if (!entries.length) return;

  const col = db.collection('users').doc(userId).collection('usageLogs');
  const batch = db.batch();
  const ts = new Date().toISOString();

  for (const entry of entries) {
    if (entry.amount <= 0) continue;
    const ref = col.doc();
    const doc = buildInkLedgerDocument(entry, { userId, userName });
    doc.timestamp = ts;
    batch.set(ref, doc);
  }

  await batch.commit();
}

export async function recordInkLedgerEntry(
  db: Firestore,
  userId: string,
  entry: InkLedgerWrite,
  userName?: string
): Promise<void> {
  await recordInkLedgerEntries(db, userId, [entry], userName);
}
