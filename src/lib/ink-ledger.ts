/** Ink ledger — credits/debits per pool for the usage History tab. */

export type InkPool = 'residency' | 'trial' | 'permanent';

export type InkLedgerType = 'credit' | 'debit';

export type InkLedgerReason =
  | 'signup_residency'
  | 'signup_permanent'
  | 'trial_ink'
  | 'trial_ink_expired'
  | 'monthly_residency'
  | 'pro_residency_refill'
  | 'ink_pack_purchase'
  | 'referral_welcome'
  | 'referral_bonus'
  | 'achievement_bonus'
  | 'admin_adjust_residency'
  | 'admin_adjust_permanent'
  | 'ai_spend'
  | 'ai_refund';

const REASON_LABELS: Record<InkLedgerReason, string> = {
  signup_residency: 'Welcome residency ink',
  signup_permanent: 'Welcome permanent ink',
  trial_ink: 'Pro trial ink',
  trial_ink_expired: 'Trial ink expired',
  monthly_residency: 'Monthly residency refill',
  pro_residency_refill: 'Pro membership residency refill',
  ink_pack_purchase: 'Ink pack purchase',
  referral_welcome: 'Referral welcome bonus',
  referral_bonus: 'Referral bonus',
  achievement_bonus: 'Achievement bonus ink',
  admin_adjust_residency: 'Admin residency adjustment',
  admin_adjust_permanent: 'Admin permanent adjustment',
  ai_spend: 'AI synthesis',
  ai_refund: 'AI error refund',
};

export const INK_POOL_LABELS: Record<InkPool, string> = {
  residency: 'Residency',
  trial: 'Trial',
  permanent: 'Permanent',
};

export type InkLedgerWrite = {
  type: InkLedgerType;
  pool: InkPool;
  amount: number;
  reason: InkLedgerReason;
  action?: string;
  details?: string;
};

/** Normalized row for UI — supports new ledger docs and legacy AI logs. */
export type InkHistoryRow = {
  id: string;
  timestamp: string;
  label: string;
  pool: InkPool | 'unknown';
  type: InkLedgerType;
  amount: number;
  details?: string;
};

export function getInkLedgerLabel(
  reason: InkLedgerReason,
  entry?: Pick<InkLedgerWrite, 'action' | 'details'>
): string {
  if (reason === 'ai_spend' && entry?.action) {
    return formatAiActionLabel(entry.action);
  }
  return REASON_LABELS[reason] || reason;
}

export function formatAiActionLabel(actionName: string): string {
  return actionName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function buildInkLedgerDocument(
  entry: InkLedgerWrite,
  extras: { userId?: string; userName?: string | null } = {}
): Record<string, unknown> {
  const amount = Math.max(0, Math.ceil(entry.amount));
  const label = getInkLedgerLabel(entry.reason, entry);
  const timestamp = new Date().toISOString();

  const doc: Record<string, unknown> = {
    timestamp,
    ledgerType: entry.type,
    pool: entry.pool,
    amount,
    reason: entry.reason,
    label,
    inkUsed: entry.type === 'debit' ? amount : 0,
    inkCost: entry.type === 'debit' ? amount : 0,
    type: entry.reason === 'ai_spend' ? 'ai_request' : 'ink_ledger',
    userName: extras.userName ?? null,
  };

  if (entry.action) {
    doc.action = entry.action;
    doc.flowName = entry.action;
  }
  if (entry.details) {
    doc.details = entry.details;
  }
  if (extras.userId) {
    doc.userId = extras.userId;
  }

  return doc;
}

/** Map Firestore usageLogs doc → display row (ledger + legacy). */
export function parseInkHistoryLog(
  log: Record<string, unknown> & { id?: string }
): InkHistoryRow | null {
  const id = String(log.id || '');
  const timestamp = String(log.timestamp || '');
  if (!timestamp) return null;

  const ledgerType = log.ledgerType as InkLedgerType | undefined;
  const pool = (log.pool as InkPool | undefined) || 'unknown';
  const amount = Number(log.amount ?? log.inkUsed ?? log.inkCost ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (ledgerType === 'credit' || ledgerType === 'debit') {
    return {
      id,
      timestamp,
      label: String(log.label || getInkLedgerLabel(log.reason as InkLedgerReason) || 'Ink transaction'),
      pool: pool === 'residency' || pool === 'trial' || pool === 'permanent' ? pool : 'unknown',
      type: ledgerType,
      amount,
      details: log.details ? String(log.details) : undefined,
    };
  }

  // Legacy AI spend logs
  const action = String(log.action || log.flowName || 'AI action');
  return {
    id,
    timestamp,
    label: formatAiActionLabel(action),
    pool: 'unknown',
    type: 'debit',
    amount,
    details: log.details ? String(log.details) : undefined,
  };
}

export function inkHistoryAmountDisplay(type: InkLedgerType, amount: number): string {
  const n = Math.abs(amount);
  return type === 'credit' ? `+${n.toLocaleString()}` : `-${n.toLocaleString()}`;
}
