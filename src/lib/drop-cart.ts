import {
  DROP_PAID_MIN_CENTS,
  normalizeDropPrice,
  resolveCheckoutCents,
  type DropPrice,
} from '@/lib/drop-commerce';

export const DROP_CART_STORAGE_KEY = 'b4b-drop-cart-v1';
export const DROP_CART_MAX_ITEMS = 20;

export type DropCartItem = {
  key: string;
  shareId: string;
  trackId?: string;
  title: string;
  artistName?: string;
  ownerId: string;
  scope: 'album' | 'track';
  price: DropPrice;
  amountCents: number;
  detailsHref: string;
};

export type DropCartCheckoutItem = Pick<DropCartItem, 'shareId' | 'trackId' | 'amountCents'>;

export type DropCheckoutOrderItem = {
  key: string;
  shareId: string;
  trackId?: string;
  ownerId: string;
  artistName: string;
  scope: 'album' | 'track';
  projectId: string;
  title: string;
  trackIds: string[];
  amountCents: number;
  feeCents: number;
  netCents: number;
};

export type DropCheckoutOrder = {
  buyerId: string;
  items: DropCheckoutOrderItem[];
  totalCents: number;
  currency: 'usd';
  status: 'pending' | 'processing' | 'fulfilled' | 'failed';
  stripeSessionId?: string;
  fulfilledItemKeys?: string[];
  createdAt: string;
  updatedAt: string;
};

export function dropCartItemKey(shareId: string, trackId?: string): string {
  return `${shareId.trim()}:${trackId?.trim() || '__bundle__'}`;
}

export function resolveDropCartAmount(price: DropPrice, requestedCents?: number): number {
  const normalized = normalizeDropPrice(price);
  return Math.max(DROP_PAID_MIN_CENTS, resolveCheckoutCents(normalized, requestedCents));
}

export function normalizeDropCartItem(raw: unknown): DropCartItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<DropCartItem>;
  const shareId = typeof value.shareId === 'string' ? value.shareId.trim() : '';
  const trackId = typeof value.trackId === 'string' && value.trackId.trim() ? value.trackId.trim() : undefined;
  const ownerId = typeof value.ownerId === 'string' ? value.ownerId.trim() : '';
  const title = typeof value.title === 'string' ? value.title.trim().slice(0, 120) : '';
  if (!shareId || !ownerId || !title) return null;
  const price = normalizeDropPrice(value.price);
  if (price.mode !== 'fixed' && price.mode !== 'pwyw') return null;
  const amountCents = resolveDropCartAmount(price, Number(value.amountCents) || undefined);
  const detailsHref =
    typeof value.detailsHref === 'string' && value.detailsHref.startsWith('/')
      ? value.detailsHref.slice(0, 300)
      : value.scope === 'album'
        ? `/share/${encodeURIComponent(shareId)}`
        : `/song/${encodeURIComponent(shareId)}`;
  return {
    key: dropCartItemKey(shareId, trackId),
    shareId,
    trackId,
    title,
    artistName:
      typeof value.artistName === 'string' && value.artistName.trim()
        ? value.artistName.trim().slice(0, 80)
        : undefined,
    ownerId,
    scope: value.scope === 'album' ? 'album' : 'track',
    price,
    amountCents,
    detailsHref,
  };
}

export function normalizeDropCart(raw: unknown): DropCartItem[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Map<string, DropCartItem>();
  for (const candidate of raw.slice(0, DROP_CART_MAX_ITEMS)) {
    const item = normalizeDropCartItem(candidate);
    if (item) unique.set(item.key, item);
  }
  return [...unique.values()].slice(0, DROP_CART_MAX_ITEMS);
}
