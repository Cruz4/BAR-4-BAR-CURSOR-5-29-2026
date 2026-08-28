import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  IDENTITY_REGISTRY_COLLECTION,
  type IdentityRegistryDoc,
} from '@/lib/server/identity-registry';
import { computeProFeaturePreviewExpiresAt, PRO_FEATURE_PREVIEW_HOURS } from '@/lib/subscription';

import type {
  ProPreviewAuditApplyResult,
  ProPreviewAuditDryRunResult,
  ProPreviewAuditMismatch,
} from '@/lib/pro-preview-audit';

export type {
  ProPreviewAuditApplyResult,
  ProPreviewAuditDryRunResult,
  ProPreviewAuditMismatch,
} from '@/lib/pro-preview-audit';

const AUDIT_COLLECTION = 'adminAudits/proPreview';

/**
 * Scan identity registry for Pro preview grants whose user docs are missing
 * `proFeaturePreviewExpiresAt` (init race / incomplete write).
 */
export async function dryRunProPreviewAudit(): Promise<ProPreviewAuditDryRunResult> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }

  const db = await getDb();
  const snap = await db.collection(IDENTITY_REGISTRY_COLLECTION).get();
  const mismatches: ProPreviewAuditMismatch[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as IdentityRegistryDoc;
    if (!data.proFeaturePreviewGrantedAt || !data.proFeaturePreviewGrantedToUid) continue;

    const userId = data.proFeaturePreviewGrantedToUid;
    const userSnap = await db.doc(`users/${userId}`).get();
    const expiresAt = userSnap.exists
      ? (userSnap.data() as { proFeaturePreviewExpiresAt?: string | null })
          ?.proFeaturePreviewExpiresAt
      : null;

    if (typeof expiresAt === 'string' && expiresAt.trim()) continue;

    mismatches.push({
      userId,
      emailHash: data.emailHash || doc.id,
      registryGrantedAt: data.proFeaturePreviewGrantedAt,
      reason: 'missing_expires_at',
    });
  }

  return {
    mode: 'dry_run',
    scannedRegistryDocs: snap.size,
    mismatches,
    hours: PRO_FEATURE_PREVIEW_HOURS,
  };
}

/**
 * Grant a fresh 48h Pro feature preview window to each mismatch, then write
 * an audit log under `adminAudits/proPreview/{id}`.
 */
export async function applyProPreviewAudit(input: {
  adminUid: string;
  adminEmail: string;
}): Promise<ProPreviewAuditApplyResult> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }

  const dry = await dryRunProPreviewAudit();
  const db = await getDb();
  const granted: Array<{ userId: string; expiresAt: string }> = [];
  const skipped: Array<{ userId: string; reason: string }> = [];
  const now = new Date().toISOString();

  for (const mismatch of dry.mismatches) {
    try {
      const userRef = db.doc(`users/${mismatch.userId}`);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        skipped.push({ userId: mismatch.userId, reason: 'user_not_found' });
        continue;
      }

      // Same fair 48h helper used by signup grant + admin preview route.
      const expiresAt = computeProFeaturePreviewExpiresAt();
      await userRef.set(
        {
          proFeaturePreviewExpiresAt: expiresAt,
          updatedAt: now,
        },
        { merge: true }
      );
      granted.push({ userId: mismatch.userId, expiresAt });
    } catch (error) {
      skipped.push({
        userId: mismatch.userId,
        reason: error instanceof Error ? error.message : 'grant_failed',
      });
    }
  }

  const auditRef = db.collection(AUDIT_COLLECTION).doc();
  await auditRef.set({
    type: 'pro_preview_audit_apply',
    createdAt: now,
    adminUid: input.adminUid,
    adminEmail: input.adminEmail,
    scannedRegistryDocs: dry.scannedRegistryDocs,
    mismatchCount: dry.mismatches.length,
    grantedCount: granted.length,
    skippedCount: skipped.length,
    mismatches: dry.mismatches,
    granted,
    skipped,
    hours: PRO_FEATURE_PREVIEW_HOURS,
  });

  return {
    mode: 'apply',
    scannedRegistryDocs: dry.scannedRegistryDocs,
    mismatches: dry.mismatches,
    granted,
    skipped,
    auditId: auditRef.id,
    hours: PRO_FEATURE_PREVIEW_HOURS,
  };
}
