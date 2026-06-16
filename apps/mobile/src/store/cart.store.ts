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
  supplierId: string;
  supplierName: string;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
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

      subtotal: () => get().items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0),

      gstTotal: () =>
        get().items.reduce((sum, i) => sum + i.basePrice * i.quantity * (i.gstRate / 100), 0),

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
