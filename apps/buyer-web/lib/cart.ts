'use client';

import { useSyncExternalStore } from 'react';
import { z } from 'zod';

// The buyer's cart, remembered in the browser. One supplier per cart — the order API only ever
// creates a single-supplier order (see apps/api's order.service.ts: "All items in one order must
// be from the same supplier"), so adding a product from a different supplier replaces the cart
// rather than mixing it.

const CART_STORAGE_KEY = 'buildx.cart';
const STORAGE_VERSION = 1;

export type CartItem = {
  productId: string;
  name: string;
  imageUrl?: string;
  unit: string;
  basePrice: number; // display estimate only — checkout always re-quotes the real price
  quantity: number;
  minOrderQuantity: number;
};

export type CartState = {
  supplierId: string;
  supplierName: string;
  items: CartItem[];
};

const itemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  unit: z.string(),
  basePrice: z.number(),
  quantity: z.number().positive(),
  minOrderQuantity: z.number().positive(),
});
const storedSchema = z.object({
  v: z.literal(STORAGE_VERSION),
  supplierId: z.string(),
  supplierName: z.string(),
  items: z.array(itemSchema),
});

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

// useSyncExternalStore requires a stable reference when nothing changed, or it loops forever —
// cache the parsed value against the raw string it came from, like web-core's location store.
let cache: { raw: string | null; value: CartState | null } | undefined;

function read(): CartState | null {
  const storage = defaultStorage();
  if (!storage) return null;
  const raw = (() => { try { return storage.getItem(CART_STORAGE_KEY); } catch { return null; } })();
  if (cache && cache.raw === raw) return cache.value;

  let value: CartState | null = null;
  try {
    if (raw) {
      const parsed = storedSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.items.length > 0) {
        const { v: _v, ...state } = parsed.data;
        value = state;
      }
    }
  } catch {
    value = null;
  }
  cache = { raw, value };
  return value;
}

function write(state: CartState | null) {
  const storage = defaultStorage();
  if (!storage) return;
  try {
    if (!state || state.items.length === 0) storage.removeItem(CART_STORAGE_KEY);
    else storage.setItem(CART_STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, ...state }));
  } catch {
    // storage full/blocked — the cart just won't persist across reloads this time
  }
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === CART_STORAGE_KEY) notify(); };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useCart(): CartState | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Adds a product to the cart. Returns 'replaced' if it came from a different supplier's cart. */
export function addToCart(
  supplierId: string,
  supplierName: string,
  item: Omit<CartItem, 'quantity'> & { quantity: number }
): 'added' | 'replaced' {
  const current = read();
  if (current && current.supplierId !== supplierId) {
    write({ supplierId, supplierName, items: [item] });
    notify();
    return 'replaced';
  }
  const items = current?.items ?? [];
  const existing = items.find((i) => i.productId === item.productId);
  const nextItems = existing
    ? items.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i))
    : [...items, item];
  write({ supplierId, supplierName, items: nextItems });
  notify();
  return 'added';
}

export function setCartQuantity(productId: string, quantity: number) {
  const current = read();
  if (!current) return;
  const items = quantity <= 0
    ? current.items.filter((i) => i.productId !== productId)
    : current.items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
  write(items.length > 0 ? { ...current, items } : null);
  notify();
}

export function removeFromCart(productId: string) {
  setCartQuantity(productId, 0);
}

export function clearCart() {
  write(null);
  notify();
}
