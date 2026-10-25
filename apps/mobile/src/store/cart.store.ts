import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CartItem = {
  productId: string;
  name: string;
  image: string;
  unit: string;
  basePrice: number;
  gstRate: number;
  // Whether basePrice already contains GST (taxable value is backed out) or GST is added on
  // top. Mirrors apps/api/src/features/orders/pricing.ts so the cart's displayed total matches
  // what the server will actually charge. Call sites that don't know this (e.g. the AI chat
  // add-to-cart flow) omit it and fall back to GST-exclusive, matching this field's old,
  // implicit default.
  isGstInclusive?: boolean;
  // Same tiers as the product: the tier with the highest minQty <= quantity replaces basePrice.
  // Omitted where the call site doesn't have tier data; the cart then always uses basePrice.
  bulkPricing?: { minQty: number; price: number }[];
  supplierId: string;
  supplierName: string;
  quantity: number;
};

type ItemPricing = {
  unitPrice: number;
  gross: number;
  taxable: number;
  gst: number;
};

/**
 * Mirrors the server's pricing rules (apps/api/src/features/orders/pricing.ts) closely enough
 * for display purposes: pick the applicable bulk tier, then split gross into taxable + GST
 * according to isGstInclusive. This is NOT used to place the order — the server re-prices the
 * cart from trusted product data and is the only source of truth for the actual charge.
 */
function priceItem(item: CartItem): ItemPricing {
  let unitPrice = item.basePrice;
  let bestMinQty = -1;
  for (const tier of item.bulkPricing ?? []) {
    if (item.quantity >= tier.minQty && tier.minQty > bestMinQty) {
      unitPrice = tier.price;
      bestMinQty = tier.minQty;
    }
  }

  const gross = unitPrice * item.quantity;
  if (item.isGstInclusive) {
    const taxable = gross / (1 + item.gstRate / 100);
    return { unitPrice, gross, taxable, gst: gross - taxable };
  }
  const gst = gross * (item.gstRate / 100);
  return { unitPrice, gross, taxable: gross, gst };
}

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
  lineTotal: (productId: string) => number;
  subtotal: () => number;
  gstTotal: () => number;
  grandTotal: () => number;
  itemCount: () => number;
  hasConflict: (supplierId: string) => boolean;
  supplierIds: () => string[];
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        });
      },

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQty: (productId, qty) => {
        if (qty <= 0) { get().removeItem(productId); return; }
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
        }));
      },

      clear: () => set({ items: [] }),

      lineTotal: (productId) => {
        const item = get().items.find((i) => i.productId === productId);
        return item ? priceItem(item).gross : 0;
      },

      subtotal: () => get().items.reduce((sum, i) => sum + priceItem(i).taxable, 0),

      gstTotal: () => get().items.reduce((sum, i) => sum + priceItem(i).gst, 0),

      grandTotal: () => {
        const s = get();
        return s.subtotal() + s.gstTotal();
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      hasConflict: (supplierId) => {
        const items = get().items;
        if (items.length === 0) return false;
        return items.some((i) => i.supplierId !== supplierId);
      },

      supplierIds: () => [...new Set(get().items.map((i) => i.supplierId))],
    }),
    {
      name: 'cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
