'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Music2, ShoppingCart, Trash2 } from 'lucide-react';
import { auth } from '@/lib/firebase/client/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { buildLoginUrl } from '@/lib/login-links';
import { DROP_PAID_MIN_CENTS, centsToUsdLabel } from '@/lib/drop-commerce';
import {
  DROP_CART_MAX_ITEMS,
  DROP_CART_STORAGE_KEY,
  dropCartItemKey,
  normalizeDropCart,
  normalizeDropCartItem,
  resolveDropCartAmount,
  type DropCartItem,
} from '@/lib/drop-cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isVaultPath } from '@/lib/scene-home';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type AddCartItem = Omit<DropCartItem, 'key' | 'amountCents'> & { amountCents?: number };

type DropCartContextValue = {
  items: DropCartItem[];
  count: number;
  totalCents: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  addItem: (item: AddCartItem) => void;
  removeItem: (key: string) => void;
  updateAmount: (key: string, amountCents: number) => void;
  hasItem: (shareId: string, trackId?: string) => boolean;
};

const DropCartContext = createContext<DropCartContextValue | null>(null);

async function checkoutHeaders(): Promise<HeadersInit> {
  const current = auth.currentUser;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (!current) return headers;
  return { ...headers, Authorization: `Bearer ${await current.getIdToken()}` };
}

export function DropCartProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<DropCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const fulfillmentAttemptRef = useRef<string | null>(null);
  const itemsRef = useRef<DropCartItem[]>([]);
  const isVault = isVaultPath(pathname);

  useEffect(() => {
    try {
      setItems(normalizeDropCart(JSON.parse(localStorage.getItem(DROP_CART_STORAGE_KEY) || '[]')));
    } catch {
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    itemsRef.current = items;
    localStorage.setItem(DROP_CART_STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => {
    if (isVault && open) setOpen(false);
  }, [isVault, open]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('openCart') === '1') setOpen(true);
  }, [hydrated, pathname]);

  useEffect(() => {
    if (!authReady || !user?.id || fulfilling || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId || params.get('cart_purchased') !== '1') return;
    if (fulfillmentAttemptRef.current === sessionId) return;
    fulfillmentAttemptRef.current = sessionId;
    setFulfilling(true);
    void checkoutHeaders()
      .then((headers) =>
        fetch('/api/stripe/fulfill-session', {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId, userId: user.id }),
        })
      )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Purchase is still being confirmed.');
        setItems([]);
        setOpen(false);
        toast({
          title: 'Cart added to your Library',
          description: 'Every purchased song and album is ready under your account.',
        });
        params.delete('session_id');
        params.delete('cart_purchased');
        const query = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      })
      .catch((error: unknown) =>
        toast({
          variant: 'destructive',
          title: 'Payment received—Library confirmation is delayed',
          description: error instanceof Error ? error.message : 'Refresh in a moment. You will not be charged twice.',
        })
      )
      .finally(() => setFulfilling(false));
  }, [authReady, fulfilling, toast, user?.id]);

  const addItem = useCallback((candidate: AddCartItem) => {
    const item = normalizeDropCartItem({
      ...candidate,
      key: dropCartItemKey(candidate.shareId, candidate.trackId),
      amountCents: resolveDropCartAmount(candidate.price, candidate.amountCents),
    });
    if (!item) return;
    const current = itemsRef.current;
    const existing = current.findIndex((entry) => entry.key === item.key);
    if (existing >= 0) {
      const next = [...current];
      next[existing] = item;
      itemsRef.current = next;
      setItems(next);
      return;
    }
    if (current.length >= DROP_CART_MAX_ITEMS) {
      toast({
        variant: 'destructive',
        title: 'Cart is full',
        description: `Check out these ${DROP_CART_MAX_ITEMS} releases before adding more.`,
      });
      return;
    }
    const next = [...current, item];
    itemsRef.current = next;
    setItems(next);
    toast({
      title: 'Added to cart',
      description: `${item.title} · ${centsToUsdLabel(item.amountCents)}. Reopen it from the Cart button.`,
    });
  }, [toast]);

  const removeItem = useCallback((key: string) => {
    const next = itemsRef.current.filter((item) => item.key !== key);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const updateAmount = useCallback((key: string, amountCents: number) => {
    const next = itemsRef.current.map((item) => {
      if (item.key !== key || item.price.mode !== 'pwyw') return item;
      return { ...item, amountCents: resolveDropCartAmount(item.price, amountCents) };
    });
    itemsRef.current = next;
    setItems(next);
  }, []);

  const hasItem = useCallback(
    (shareId: string, trackId?: string) => items.some((item) => item.key === dropCartItemKey(shareId, trackId)),
    [items]
  );

  const totalCents = useMemo(
    () => items.reduce((sum, item) => sum + item.amountCents, 0),
    [items]
  );

  const checkout = async () => {
    if (!items.length) return;
    if (!user) {
      const next = `${window.location.pathname}${window.location.search ? `${window.location.search}&openCart=1` : '?openCart=1'}`;
      router.push(buildLoginUrl({ mode: 'signup', next, intent: 'music_cart' }));
      setOpen(false);
      return;
    }
    if (!authReady) return;
    setCheckingOut(true);
    try {
      const response = await fetch('/api/drops/cart/checkout', {
        method: 'POST',
        headers: await checkoutHeaders(),
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          items: items.map(({ shareId, trackId, amountCents }) => ({ shareId, trackId, amountCents })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start cart checkout.');
      if (!data.url) throw new Error('Stripe did not return a checkout page.');
      window.location.href = data.url;
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not check out',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const value = useMemo<DropCartContextValue>(() => ({
    items,
    count: items.length,
    totalCents,
    open,
    setOpen,
    addItem,
    removeItem,
    updateAmount,
    hasItem,
  }), [addItem, hasItem, items, open, removeItem, totalCents, updateAmount]);

  return (
    <DropCartContext.Provider value={value}>
      {children}
      {hydrated && items.length > 0 && !isVault ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 h-11 gap-2 rounded-full border border-fuchsia-200/25 bg-slate-950/35 px-3.5 font-black uppercase text-fuchsia-100 opacity-50 shadow-[0_10px_35px_rgba(0,0,0,.35)] backdrop-blur-md transition-all hover:border-fuchsia-200/55 hover:bg-fuchsia-400 hover:text-black hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Open music cart with ${items.length} item${items.length === 1 ? '' : 's'}`}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden text-[10px] sm:inline">Cart</span>
          <span>{items.length}</span>
        </Button>
      ) : null}
      <Sheet open={!isVault && open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col border-fuchsia-400/30 bg-[#07101f] p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-white/10 p-5 pr-12 text-left">
            <SheetTitle className="flex items-center gap-2 font-headline text-2xl uppercase">
              <ShoppingCart className="h-5 w-5 text-fuchsia-300" /> Music cart
            </SheetTitle>
            <SheetDescription>
              One secure checkout. Every artist, price, entitlement, and payout stays separate.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {items.length ? items.map((item) => (
              <article key={item.key} className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200">
                    <Music2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={item.detailsHref} onClick={() => setOpen(false)} className="block truncate font-bold hover:text-fuchsia-200">
                      {item.title}
                    </Link>
                    <p className="truncate text-[10px] uppercase tracking-widest text-white/50">
                      {item.artistName || 'Bar4Bar artist'} · {item.scope}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.key)} className="p-2 text-white/45 hover:text-red-300" aria-label={`Remove ${item.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                    {item.price.mode === 'pwyw' ? 'Your price' : 'Set price'}
                  </span>
                  {item.price.mode === 'pwyw' ? (
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={Math.max(DROP_PAID_MIN_CENTS, item.price.minCents ?? DROP_PAID_MIN_CENTS) / 100}
                      step="0.01"
                      value={(item.amountCents / 100).toFixed(2)}
                      onChange={(event) => updateAmount(item.key, Math.round(Number(event.target.value) * 100))}
                      className="h-9 w-28 text-right font-code"
                      aria-label={`Price for ${item.title}`}
                    />
                  ) : (
                    <strong className="font-code text-fuchsia-100">{centsToUsdLabel(item.amountCents)}</strong>
                  )}
                </div>
              </article>
            )) : (
              <div className="py-20 text-center text-sm text-white/55">Your music cart is empty.</div>
            )}
          </div>
          <div className="shrink-0 space-y-3 border-t border-white/10 bg-black/35 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-white/65">Total</span>
              <strong className="font-headline text-2xl text-fuchsia-100">{centsToUsdLabel(totalCents)}</strong>
            </div>
            <Button type="button" className="h-12 w-full bg-fuchsia-400 font-black uppercase text-black hover:bg-fuchsia-300" disabled={!items.length || checkingOut || fulfilling} onClick={() => void checkout()}>
              {checkingOut || fulfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {!user ? 'Sign up · check out' : `Check out ${items.length} item${items.length === 1 ? '' : 's'}`}
            </Button>
            <p className="text-center text-[9px] text-white/45">Music purchases use money—not Ink. Stripe shows one transaction.</p>
          </div>
        </SheetContent>
      </Sheet>
    </DropCartContext.Provider>
  );
}

export function useDropCart(): DropCartContextValue {
  const value = useContext(DropCartContext);
  if (!value) throw new Error('useDropCart must be used inside DropCartProvider');
  return value;
}
