/** Shared Pro preview audit result types (safe for client + server). */

export type ProPreviewAuditMismatch = {
  userId: string;
  emailHash: string;
  registryGrantedAt: string;
  reason: 'missing_expires_at';
};

export type ProPreviewAuditDryRunResult = {
  mode: 'dry_run';
  scannedRegistryDocs: number;
  mismatches: ProPreviewAuditMismatch[];
  hours: number;
};

export type ProPreviewAuditApplyResult = {
  mode: 'apply';
  scannedRegistryDocs: number;
  mismatches: ProPreviewAuditMismatch[];
  granted: Array<{ userId: string; expiresAt: string }>;
  skipped: Array<{ userId: string; reason: string }>;
  auditId: string;
  hours: number;
};
