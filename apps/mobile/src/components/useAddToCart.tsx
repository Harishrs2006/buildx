import { useState } from 'react';
import { getProductImageUrl, type Product } from '../hooks/useProducts';
import { useCartStore } from '../store/cart.store';
import { ConfirmSheet } from './ui';

// Adds a product to the cart. The API takes one supplier per order, so a product from a
// different supplier first asks to start a new cart (instead of building a cart that would
// fail at checkout). Render `sheet` once in the screen.
export function useAddToCart() {
  const addItem = useCartStore((s) => s.addItem);
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);
  const [pending, setPending] = useState<{ product: Product; qty: number } | null>(null);

  function put(product: Product, qty: number) {
    addItem(
      {
        productId: product._id,
        name: product.name,
        image: getProductImageUrl(product.images),
        unit: product.unit,
        basePrice: product.basePrice,
        gstRate: product.gstRate,
        isGstInclusive: product.isGstInclusive,
        bulkPricing: product.bulkPricing,
        supplierId: product.supplierId?._id ?? '',
        supplierName: product.supplierId?.businessName ?? '',
      },
      qty
    );
  }

  function add(product: Product, qty = 1) {
    const supplierId = product.supplierId?._id ?? '';
    if (items.length > 0 && items.some((i) => i.supplierId !== supplierId)) {
      setPending({ product, qty });
      return false;
    }
    put(product, qty);
    return true;
  }

  const currentSupplier = items[0]?.supplierName || 'another supplier';
  const sheet = (
    <ConfirmSheet
      visible={!!pending}
      title="Start a new cart?"
      body={`Your cart has items from ${currentSupplier}. One order comes from one supplier, so adding this clears the current cart.`}
      confirmLabel="Clear cart and add"
      cancelLabel="Keep my cart"
      onConfirm={() => {
        if (pending) {
          clear();
          put(pending.product, pending.qty);
        }
        setPending(null);
      }}
      onCancel={() => setPending(null)}
    />
  );

  return { add, sheet };
}
