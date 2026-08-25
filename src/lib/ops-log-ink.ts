import type { SystemLog } from '@/lib/types';
import {
  INK_PACK_ARTIST_AMOUNT,
  INK_PACK_ARTIST_PRICE,
  INK_PACK_STUDIO_AMOUNT,
  INK_PACK_STUDIO_PRICE,
  INK_PACK_VAULT_AMOUNT,
  INK_PACK_VAULT_PRICE,
  PRO_MONTHLY_PRICE_AMOUNT,
  PRO_YEARLY_BILLED_AMOUNT,
} from '@/lib/studio-tiers';
import { PRO_MONTHLY_RESIDENCY, PRO_YEARLY_RESIDENCY } from '@/lib/stripe-catalog';

function parseIntLoose(raw: string): number {
  const n = parseInt(raw.replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function near(a: number, b: number, tol = 0.05): boolean {
  return Math.abs(a - b) <= tol;
}

/** Extract ink amount from legacy ops-log details when inkDelta was missing/zero. */
function parseInkFromDetails(details: string, allowBareLeadingPlus = true): number {
  const permanent = details.match(/\+(\d[\d,]*)\s+permanent/i);
  if (permanent) return parseIntLoose(permanent[1]);

  const inkBonus = details.match(/\+(\d[\d,]*)\s+Ink\b/i);
  if (inkBonus) return parseIntLoose(inkBonus[1]);

  const residency = details.match(/residency\s*→\s*([\d,]+)/i);
  if (residency) return parseIntLoose(residency[1]);

  // Some old transaction rows only stored a bare leading credit. Achievement
  // details also begin with values such as "+50 XP", so that fallback must never
  // be used for achievement rows.
  if (allowBareLeadingPlus) {
    const leadingPlus = details.match(/^\+(\d[\d,]*)\b/);
    if (leadingPlus) return parseIntLoose(leadingPlus[1]);
  }

  return 0;
}

/** Infer pack / Pro residency ink from Gross: $X.XX in legacy rows. */
function inferInkFromGross(action: string, details: string): number {
  const grossMatch = details.match(/Gross:\s*\$([\d.]+)/i);
  if (!grossMatch) return 0;
  const gross = parseFloat(grossMatch[1]);
  if (!Number.isFinite(gross) || gross <= 0) return 0;

  if (action === 'Pro Membership') {
    if (near(gross, PRO_MONTHLY_PRICE_AMOUNT)) return PRO_MONTHLY_RESIDENCY;
    if (near(gross, PRO_YEARLY_BILLED_AMOUNT)) return PRO_YEARLY_RESIDENCY;
    return 0;
  }

  if (action === 'Ink Pack Purchase') {
    if (near(gross, INK_PACK_STUDIO_PRICE)) return INK_PACK_STUDIO_AMOUNT;
    if (near(gross, INK_PACK_ARTIST_PRICE)) return INK_PACK_ARTIST_AMOUNT;
    if (near(gross, INK_PACK_VAULT_PRICE)) return INK_PACK_VAULT_AMOUNT;
    // Yearly Pro 50% off packs
    if (near(gross, INK_PACK_STUDIO_PRICE * 0.5)) return INK_PACK_STUDIO_AMOUNT;
    if (near(gross, INK_PACK_ARTIST_PRICE * 0.5)) return INK_PACK_ARTIST_AMOUNT;
    if (near(gross, INK_PACK_VAULT_PRICE * 0.5)) return INK_PACK_VAULT_AMOUNT;
  }

  return 0;
}

/**
 * Signed ink flow for Neural Operation Stream.
 * Positive = credit, negative = spend. Handles legacy rows that only stored Gross.
 */
export function resolveOpsLogInkDelta(log: SystemLog): number {
  const hasExplicitDelta = log.inkDelta !== undefined && log.inkDelta !== null;
  const explicit = Number(log.inkDelta);
  // Zero is authoritative for achievement rows. Ignoring it allowed a following
  // "+XP" detail to be misread as an Ink credit by the legacy parser.
  if (
    hasExplicitDelta
    && Number.isFinite(explicit)
    && (explicit !== 0 || log.type === 'achievement')
  ) {
    return explicit;
  }

  const used = Number(log.inkUsed);
  if (log.type === 'achievement') {
    const details = typeof log.details === 'string' ? log.details : '';
    const fromDetails = parseInkFromDetails(details, false);
    if (fromDetails > 0) return fromDetails;
    // Legacy achievement writers occasionally placed XP in inkUsed as well.
    // An XP-only detail is definitive proof that the value is not Ink.
    const xpOnly = /\+?\d[\d,]*\s+XP\b/i.test(details)
      && !/\+?\d[\d,]*\s+Ink\b/i.test(details);
    if (xpOnly) return 0;
    return Number.isFinite(used) && used > 0 ? used : 0;
  }

  if (log.type === 'transaction') {
    if (Number.isFinite(used) && used > 0) return used;
    const details = typeof log.details === 'string' ? log.details : '';
    const fromDetails = parseInkFromDetails(details);
    if (fromDetails > 0) return fromDetails;
    const inferred = inferInkFromGross(log.action, details);
    if (inferred > 0) return inferred;
    return 0;
  }

  if (log.type === 'ai_request') {
    return Number.isFinite(used) && used > 0 ? -used : 0;
  }

  if (Number.isFinite(used) && used > 0) return -used;
  return 0;
}

export function formatOpsLogInkLabel(delta: number): string {
  if (!Number.isFinite(delta) || delta === 0) return '—';
  const n = Math.round(delta);
  return n > 0 ? `+${n}` : `${n}`;
}
