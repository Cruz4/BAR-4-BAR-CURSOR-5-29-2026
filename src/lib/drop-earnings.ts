/**
 * First Drop artist earnings — shared types for payouts UI + APIs.
 * Tiered money split lives in drop-commerce.ts.
 */

export type DropPayoutMode = 'destination' | 'held';
export type DropSaleStatus = 'held' | 'paid' | 'failed';

export type DropSaleRecord = {
  id: string;
  shareId: string;
  title: string;
  buyerId: string;
  buyerName?: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  status: DropSaleStatus;
  payoutMode: DropPayoutMode;
  stripeSessionId?: string;
  stripeTransferId?: string;
  createdAt: string;
  paidAt?: string;
};

export type DropPayoutTotals = {
  grossCents: number;
  feeCents: number;
  netCents: number;
  heldCents: number;
  paidCents: number;
};

export type DropConnectStatus = {
  accountId: string | null;
  country: string | null;
  detailsSubmitted: boolean;
  transfersActive: boolean;
  payoutsEnabled: boolean;
  currentlyDue: string[];
};

export type DropEarningsSummary = {
  connect: DropConnectStatus;
  totals: DropPayoutTotals;
  sales: DropSaleRecord[];
};

export const EMPTY_DROP_PAYOUT_TOTALS: DropPayoutTotals = {
  grossCents: 0,
  feeCents: 0,
  netCents: 0,
  heldCents: 0,
  paidCents: 0,
};

export const EMPTY_DROP_CONNECT_STATUS: DropConnectStatus = {
  accountId: null,
  country: null,
  detailsSubmitted: false,
  transfersActive: false,
  payoutsEnabled: false,
  currentlyDue: [],
};

/** Countries Stripe Express commonly supports for artist payouts. */
export const DROP_PAYOUT_COUNTRIES: { id: string; label: string }[] = [
  { id: 'US', label: 'United States' },
  { id: 'CA', label: 'Canada' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'AU', label: 'Australia' },
  { id: 'NZ', label: 'New Zealand' },
  { id: 'IE', label: 'Ireland' },
  { id: 'DE', label: 'Germany' },
  { id: 'FR', label: 'France' },
  { id: 'NL', label: 'Netherlands' },
  { id: 'ES', label: 'Spain' },
  { id: 'IT', label: 'Italy' },
  { id: 'SE', label: 'Sweden' },
  { id: 'NO', label: 'Norway' },
  { id: 'DK', label: 'Denmark' },
  { id: 'FI', label: 'Finland' },
  { id: 'AT', label: 'Austria' },
  { id: 'BE', label: 'Belgium' },
  { id: 'PT', label: 'Portugal' },
  { id: 'CH', label: 'Switzerland' },
  { id: 'JP', label: 'Japan' },
  { id: 'SG', label: 'Singapore' },
  { id: 'MX', label: 'Mexico' },
  { id: 'BR', label: 'Brazil' },
];

export function isDropPayoutCountry(code: string): boolean {
  const id = code.trim().toUpperCase();
  return DROP_PAYOUT_COUNTRIES.some((c) => c.id === id);
}

export function dropSaleStatusLabel(status: DropSaleStatus): string {
  if (status === 'paid') return 'Sent to Stripe';
  if (status === 'held') return 'Waiting for payouts';
  return 'Needs review';
}
